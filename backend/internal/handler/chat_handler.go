package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/moviebooking/backend/internal/model"
	"github.com/moviebooking/backend/internal/repository"
	"github.com/moviebooking/backend/internal/service"
	"github.com/moviebooking/backend/pkg/utils"
)

// ── handler ───────────────────────────────────────────────────────────────────

type ChatHandler struct {
	movieRepo    repository.MovieRepository
	showtimeRepo repository.ShowtimeRepository
	bookingSvc   service.BookingService
	groqAPIKey   string
	jwtSecret    string
}

func NewChatHandler(
	movieRepo repository.MovieRepository,
	showtimeRepo repository.ShowtimeRepository,
	bookingSvc service.BookingService,
	groqAPIKey, jwtSecret string,
) *ChatHandler {
	return &ChatHandler{movieRepo, showtimeRepo, bookingSvc, groqAPIKey, jwtSecret}
}

// ── request / response ────────────────────────────────────────────────────────

type incomingMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
type chatRequest struct {
	Messages []incomingMsg `json:"messages"`
}
type chatResp struct {
	Message string         `json:"message"`
	Booking *model.Booking `json:"booking,omitempty"`
}

// ── Groq wire types ───────────────────────────────────────────────────────────

type groqMsg struct {
	Role       string      `json:"role"`
	Content    interface{} `json:"content"` // string | null
	ToolCalls  []groqTC    `json:"tool_calls,omitempty"`
	ToolCallID string      `json:"tool_call_id,omitempty"`
}
type groqTC struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}
type groqReq struct {
	Model       string                   `json:"model"`
	Messages    []groqMsg                `json:"messages"`
	Tools       []map[string]interface{} `json:"tools,omitempty"`
	ToolChoice  string                   `json:"tool_choice,omitempty"`
	MaxTokens   int                      `json:"max_tokens"`
	Temperature float64                  `json:"temperature"`
}
type groqResp struct {
	Choices []struct {
		Message struct {
			Role      string   `json:"role"`
			Content   *string  `json:"content"`
			ToolCalls []groqTC `json:"tool_calls"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// ── main handler ──────────────────────────────────────────────────────────────

func (h *ChatHandler) Chat(w http.ResponseWriter, r *http.Request) {
	if h.groqAPIKey == "" {
		utils.InternalError(w, "AI agent not configured — set GROQ_API_KEY")
		return
	}
	var req chatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.BadRequest(w, "invalid request body")
		return
	}
	if len(req.Messages) == 0 {
		utils.BadRequest(w, "messages required")
		return
	}

	// Extract user from JWT if present
	userID := ""
	if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
		if claims, err := utils.ValidateToken(strings.TrimPrefix(auth, "Bearer "), h.jwtSecret); err == nil {
			userID = claims.UserID
		}
	}

	movies, _ := h.movieRepo.FindAll()
	msgs := []groqMsg{{Role: "system", Content: buildSystemPrompt(movies, userID != "")}}
	for _, m := range req.Messages {
		msgs = append(msgs, groqMsg{Role: m.Role, Content: m.Content})
	}

	tools := defineTools()
	var finalBooking *model.Booking

	for range 6 {
		gr, err := h.callGroq(r.Context(), msgs, tools)
		if err != nil {
			utils.InternalError(w, "AI error: "+err.Error())
			return
		}
		if len(gr.Choices) == 0 {
			break
		}
		choice := gr.Choices[0]

		if len(choice.Message.ToolCalls) == 0 {
			content := ""
			if choice.Message.Content != nil {
				content = *choice.Message.Content
			}
			utils.Success(w, chatResp{Message: content, Booking: finalBooking})
			return
		}

		msgs = append(msgs, groqMsg{Role: "assistant", Content: nil, ToolCalls: choice.Message.ToolCalls})

		for _, tc := range choice.Message.ToolCalls {
			var args map[string]interface{}
			json.Unmarshal([]byte(tc.Function.Arguments), &args) //nolint:errcheck

			var result string
			switch tc.Function.Name {
			case "search_movies":
				result = h.toolSearchMovies(args)
			case "get_showtimes":
				result = h.toolGetShowtimes(args)
			case "create_booking":
				var b *model.Booking
				result, b = h.toolCreateBooking(args, userID)
				if b != nil {
					finalBooking = b
				}
			default:
				result = "unknown tool: " + tc.Function.Name
			}

			msgs = append(msgs, groqMsg{Role: "tool", Content: result, ToolCallID: tc.ID})
		}
	}
	utils.InternalError(w, "agent could not complete the request")
}

func (h *ChatHandler) callGroq(ctx context.Context, msgs []groqMsg, tools []map[string]interface{}) (*groqResp, error) {
	body, _ := json.Marshal(groqReq{
		Model: "meta-llama/llama-4-scout-17b-16e-instruct", Messages: msgs,
		Tools: tools, ToolChoice: "auto", MaxTokens: 1024, Temperature: 0.0,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+h.groqAPIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var gr groqResp
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		return nil, err
	}
	if gr.Error != nil {
		return nil, fmt.Errorf("%s", gr.Error.Message)
	}
	return &gr, nil
}

// ── tool schema ── use raw maps so JSON Schema is exactly right ───────────────

func defineTools() []map[string]interface{} {
	prop := func(typ, desc string) map[string]interface{} {
		return map[string]interface{}{"type": typ, "description": desc}
	}
	tool := func(name, desc string, props map[string]interface{}, required []string) map[string]interface{} {
		return map[string]interface{}{
			"type": "function",
			"function": map[string]interface{}{
				"name": name, "description": desc,
				"parameters": map[string]interface{}{
					"type": "object", "properties": props, "required": required,
				},
			},
		}
	}
	return []map[string]interface{}{
		tool("search_movies", "Search the movie catalogue by title, actor, director or genre.",
			map[string]interface{}{"query": prop("string", "search term — movie name, genre, or actor")},
			[]string{"query"}),

		tool("get_showtimes", "Get upcoming showtimes for a movie. Call after finding the movie_id with search_movies.",
			map[string]interface{}{"movie_id": prop("string", "the movie ID from search_movies")},
			[]string{"movie_id"}),

		tool("create_booking",
			"Book tickets for the user. Automatically picks the best available seats of the requested type. Only call after explicit user confirmation.",
			map[string]interface{}{
				"showtime_id": prop("string", "the showtime ID from get_showtimes"),
				"seat_type":   prop("string", "seat type: regular, premium, or vip"),
				"count":       prop("string", "how many seats to book, e.g. '1' or '2'"),
			},
			[]string{"showtime_id", "seat_type", "count"}),
	}
}

// ── tool implementations ──────────────────────────────────────────────────────

func (h *ChatHandler) toolSearchMovies(args map[string]interface{}) string {
	query, _ := args["query"].(string)
	movies, _ := h.movieRepo.Search(query)
	if len(movies) == 0 {
		movies, _ = h.movieRepo.FindAll()
	}
	var sb strings.Builder
	for _, m := range movies {
		fmt.Fprintf(&sb, "ID:%s | %s | %s | %.1f⭐ | %dmin | NowShowing:%v\n",
			m.ID, m.Title, strings.Join(m.Genre, "/"), m.Rating, m.Duration, m.IsNowShowing)
	}
	if sb.Len() == 0 {
		return "No movies found"
	}
	return sb.String()
}

func (h *ChatHandler) toolGetShowtimes(args map[string]interface{}) string {
	movieID, _ := args["movie_id"].(string)
	showtimes, err := h.showtimeRepo.FindByMovieID(movieID)
	if err != nil || len(showtimes) == 0 {
		return "No upcoming showtimes for movie ID: " + movieID
	}
	now := time.Now()
	var sb strings.Builder
	count := 0
	for _, st := range showtimes {
		if st.DateTime.Before(now) || count >= 8 {
			continue
		}
		fmt.Fprintf(&sb, "ShowtimeID:%s | %s | %s | %d seats left | Regular:$%.0f Premium:$%.0f VIP:$%.0f\n",
			st.ID, st.Theater, st.DateTime.Format("Mon Jan 2 3:04PM"),
			st.Available, st.Prices["regular"], st.Prices["premium"], st.Prices["vip"])
		count++
	}
	if sb.Len() == 0 {
		return "No upcoming showtimes"
	}
	return sb.String()
}

func (h *ChatHandler) toolCreateBooking(args map[string]interface{}, userID string) (string, *model.Booking) {
	if userID == "" {
		return "User is not logged in. Tell them to go to /auth to log in first.", nil
	}
	showtimeID, _ := args["showtime_id"].(string)
	seatType, _ := args["seat_type"].(string)
	count := 1
	switch v := args["count"].(type) {
	case float64:
		count = int(v)
	case string:
		fmt.Sscanf(v, "%d", &count)
	}
	if count < 1 {
		count = 1
	}
	if count > 8 {
		count = 8
	}

	// Auto-pick the first N available seats of the requested type
	seats, err := h.showtimeRepo.GetSeats(showtimeID)
	if err != nil {
		return "Could not fetch seats: " + err.Error(), nil
	}
	var chosen []string
	for _, s := range seats {
		if !s.IsBooked && strings.EqualFold(string(s.Type), seatType) {
			chosen = append(chosen, s.ID)
			if len(chosen) == count {
				break
			}
		}
	}
	if len(chosen) < count {
		return fmt.Sprintf("Only %d %s seats available (requested %d)", len(chosen), seatType, count), nil
	}

	booking, err := h.bookingSvc.Create(userID, &model.CreateBookingRequest{
		ShowtimeID: showtimeID,
		SeatIDs:    chosen,
	})
	if err != nil {
		return "Booking failed: " + err.Error(), nil
	}
	return fmt.Sprintf("BOOKING_SUCCESS BookingID:%s Total:$%.2f Seats:%d %s",
		booking.ID[:8], booking.TotalAmount, count, seatType), booking
}

// ── system prompt ─────────────────────────────────────────────────────────────

func buildSystemPrompt(movies []*model.Movie, isLoggedIn bool) string {
	var sb strings.Builder
	sb.WriteString(`You are CineBot, a helpful AI assistant for CineBook that can search movies, fetch showtimes, and book tickets.

You have 3 tools:
- search_movies(query): search by title, genre, or actor — always call this first when a movie is mentioned
- get_showtimes(movie_id): returns showtime list — ALWAYS display ALL results to the user including ShowtimeID, theater, time, and price
- create_booking(showtime_id, seat_type, count): books seats automatically

Rules:
1. When you get showtime results, ALWAYS list them clearly: theater, date/time, price per seat type, and ShowtimeID
2. Ask the user which showtime they prefer (by number or description, not ID)
3. Ask how many seats and what type (regular/premium/vip)
4. CONFIRM before booking: "Book [N] [type] seats for [theater] at [time]? ~$[total]"
5. Call create_booking only after explicit "yes" confirmation
6. After booking succeeds, tell the user their booking ID

`)
	if isLoggedIn {
		sb.WriteString("User is logged in ✓ — bookings can be made.\n\n")
	} else {
		sb.WriteString("User is NOT logged in. If they want to book, tell them to visit /auth to sign in first.\n\n")
	}
	sb.WriteString("Movies available:\n")
	for _, m := range movies {
		fmt.Fprintf(&sb, "- %s (ID:%s) | %s | %.1f⭐ | %dmin\n",
			m.Title, m.ID, strings.Join(m.Genre, ", "), m.Rating, m.Duration)
	}
	sb.WriteString("\nBe concise and friendly. Ask one question at a time.")
	return sb.String()
}
