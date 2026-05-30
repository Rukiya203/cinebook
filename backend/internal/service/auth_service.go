// Package service contains the application's business logic layer.
// Services sit between HTTP handlers and repositories: they validate input,
// enforce business rules, and orchestrate calls to one or more repositories.
package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/moviebooking/backend/internal/model"
	"github.com/moviebooking/backend/internal/repository"
	"github.com/moviebooking/backend/pkg/utils"
	"golang.org/x/crypto/bcrypt"
)

// AuthService handles user registration and login.
type AuthService interface {
	Register(req *model.RegisterRequest) (*model.AuthResponse, error)
	Login(req *model.LoginRequest) (*model.AuthResponse, error)
}

type authService struct {
	userRepo  repository.UserRepository
	jwtSecret string
}

// NewAuthService creates an AuthService that persists users via userRepo and
// signs JWTs with jwtSecret.
func NewAuthService(userRepo repository.UserRepository, jwtSecret string) AuthService {
	return &authService{userRepo: userRepo, jwtSecret: jwtSecret}
}

// Register validates the request, hashes the password with bcrypt, stores the user,
// and returns a signed JWT so the client is immediately authenticated.
func (s *authService) Register(req *model.RegisterRequest) (*model.AuthResponse, error) {
	if req.Name == "" || req.Email == "" || req.Password == "" {
		return nil, errors.New("name, email, and password are required")
	}
	if len(req.Password) < 6 {
		return nil, errors.New("password must be at least 6 characters")
	}

	// bcrypt cost 10 is the recommended minimum; higher values slow brute-force attacks.
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to process password")
	}

	user := &model.User{
		ID:        uuid.New().String(),
		Name:      req.Name,
		Email:     req.Email,
		Password:  string(hashed),
		Phone:     req.Phone,
		CreatedAt: time.Now(),
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	token, err := utils.GenerateToken(user.ID, user.Email, s.jwtSecret)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &model.AuthResponse{Token: token, User: *user}, nil
}

// Login looks up the user by email, then uses bcrypt to verify the password.
// Distinct error messages are returned for unknown email vs wrong password
// so the frontend can guide the user (e.g. prompt them to register).
func (s *authService) Login(req *model.LoginRequest) (*model.AuthResponse, error) {
	if req.Email == "" || req.Password == "" {
		return nil, errors.New("email and password are required")
	}

	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		// Don't expose whether the email exists to an anonymous caller in production;
		// here we return a clear message to improve demo UX.
		return nil, errors.New("no account found with this email. Please register first")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("incorrect password. Please try again")
	}

	token, err := utils.GenerateToken(user.ID, user.Email, s.jwtSecret)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &model.AuthResponse{Token: token, User: *user}, nil
}
