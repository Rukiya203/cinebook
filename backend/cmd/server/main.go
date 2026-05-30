package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/moviebooking/backend/internal/config"
	"github.com/moviebooking/backend/internal/handler"
	"github.com/moviebooking/backend/internal/middleware"
	"github.com/moviebooking/backend/internal/repository"
	"github.com/moviebooking/backend/internal/service"
	"github.com/moviebooking/backend/pkg/database"
)

func main() {
	cfg := config.Load()

	// Connect to PostgreSQL
	pool, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer pool.Close()

	ctx := context.Background()

	// Run schema migrations (idempotent — safe to run every startup)
	if err := database.Migrate(ctx, pool); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Seed initial data if tables are empty
	if err := database.Seed(ctx, pool); err != nil {
		log.Fatalf("Seeding failed: %v", err)
	}

	// Repositories — backed by PostgreSQL, hot-path reads served from in-memory TTL cache.
	userRepo := repository.NewUserRepository(pool)
	movieRepo := repository.NewCachedMovieRepository(repository.NewMovieRepository(pool))
	showtimeRepo := repository.NewCachedShowtimeRepository(repository.NewShowtimeRepository(pool))
	bookingRepo := repository.NewCachedBookingRepository(repository.NewBookingRepository(pool))
	chatRepo := repository.NewChatRepository(pool)

	// Services
	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret)
	movieSvc := service.NewMovieService(movieRepo)
	showtimeSvc := service.NewShowtimeService(showtimeRepo, movieRepo)
	bookingSvc := service.NewBookingService(bookingRepo, showtimeRepo, movieRepo)

	// Handlers
	authHandler := handler.NewAuthHandler(authSvc)
	movieHandler := handler.NewMovieHandler(movieSvc)
	showtimeHandler := handler.NewShowtimeHandler(showtimeSvc)
	bookingHandler := handler.NewBookingHandler(bookingSvc)
	chatHandler := handler.NewChatHandler(movieRepo, showtimeRepo, bookingSvc, chatRepo, cfg.GroqAPIKey, cfg.JWTSecret)

	// Rate limiters — token bucket, per IP.
	// Global:  60 req/s, burst 120  — protects DB and backend from general abuse.
	// Chat:     5 req/s, burst 10   — each request may call Groq (external, metered).
	globalLimiter := middleware.NewRateLimiter(60, 120)
	chatLimiter := middleware.NewRateLimiter(5, 10)

	r := chi.NewRouter()

	r.Use(chiMiddleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(globalLimiter.Limit)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   strings.Split(cfg.AllowedOrigins, ","),
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/register", authHandler.Register)
		r.Post("/auth/login", authHandler.Login)

		r.With(chatLimiter.Limit).Post("/chat", chatHandler.Chat)

		r.Get("/movies", movieHandler.GetAll)
		r.Get("/movies/{id}", movieHandler.GetByID)
		r.Get("/movies/{movieID}/showtimes", showtimeHandler.GetByMovie)

		r.Get("/showtimes/{id}", showtimeHandler.GetByID)
		r.Get("/showtimes/{id}/seats", showtimeHandler.GetSeats)

		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(cfg.JWTSecret))
			r.Post("/bookings", bookingHandler.Create)
			r.Get("/bookings", bookingHandler.GetMyBookings)
			r.Get("/bookings/{id}", bookingHandler.GetByID)
			r.Patch("/bookings/{id}/cancel", bookingHandler.Cancel)
			r.Get("/chat/history", chatHandler.GetHistory)
			r.Delete("/chat/history", chatHandler.ClearHistory)
		})
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("CineBook API running on http://localhost%s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatal(err)
	}
}
