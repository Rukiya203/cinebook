package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/moviebooking/backend/internal/model"
	"github.com/moviebooking/backend/internal/repository"
	"github.com/moviebooking/backend/pkg/utils"
)

type ChatHandler struct {
	movieRepo  repository.MovieRepository
	groqAPIKey string
}

func NewChatHandler(movieRepo repository.MovieRepository, groqAPIKey string) *ChatHandler {
	return &ChatHandler{movieRepo: movieRepo, groqAPIKey: groqAPIKey}
}

// ── incoming request from the frontend ──────────────────────────────────────

type chatMsg struct {
	Role    string `json:"role"` // "user" | "assistant"
	Content string `json:"content"`
}

type chatRequest struct {
	Messages []chatMsg `json:"messages"`
}

// ── Groq / OpenAI-compatible types ──────────────────────────────────────────

type groqReq struct {
	Model       string    `json:"model"`
	Messages    []chatMsg `json:"messages"`
	MaxTokens   int       `json:"max_tokens"`
	Temperature float64   `json:"temperature"`
}

type groqResp struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// ── handler ──────────────────────────────────────────────────────────────────

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

	movies, _ := h.movieRepo.FindAll()

	// Groq uses OpenAI format: system message first, then conversation
	messages := []chatMsg{{Role: "system", Content: buildSystemPrompt(movies)}}
	messages = append(messages, req.Messages...)

	body, _ := json.Marshal(groqReq{
		Model:       "llama-3.3-70b-versatile",
		Messages:    messages,
		MaxTokens:   1024,
		Temperature: 0.9,
	})

	apiReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		"https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		utils.InternalError(w, "failed to create AI request")
		return
	}
	apiReq.Header.Set("Content-Type", "application/json")
	apiReq.Header.Set("Authorization", "Bearer "+h.groqAPIKey)

	resp, err := http.DefaultClient.Do(apiReq)
	if err != nil {
		utils.InternalError(w, "AI service unavailable")
		return
	}
	defer resp.Body.Close()

	var gr groqResp
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		utils.InternalError(w, "failed to parse AI response")
		return
	}
	if gr.Error != nil {
		utils.InternalError(w, "Groq error: "+gr.Error.Message)
		return
	}
	if len(gr.Choices) == 0 {
		utils.InternalError(w, "no response from AI")
		return
	}

	utils.Success(w, map[string]string{"message": gr.Choices[0].Message.Content})
}

func buildSystemPrompt(movies []*model.Movie) string {
	var sb strings.Builder
	sb.WriteString(`You are CineBot, a friendly and enthusiastic cinema assistant for CineBook — an online movie ticket booking platform.

Your job is to help users discover movies they'll love and guide them toward booking tickets. You know the full current catalogue and can make personalised recommendations based on mood, genre, runtime preference, favourite actors, or anything else the user shares.

Current movies in our catalogue:
`)
	for _, m := range movies {
		sb.WriteString(fmt.Sprintf(
			"- %s (ID: %s) | %s | %.1f/10 | %d min | Dir: %s | Cast: %s | Now Showing: %v\n  %s\n\n",
			m.Title, m.ID, strings.Join(m.Genre, ", "), m.Rating, m.Duration,
			m.Director, strings.Join(m.Cast, ", "), m.IsNowShowing, m.Description,
		))
	}
	sb.WriteString(`
Your guidelines:
- Be warm, concise, and enthusiastic — you are a passionate movie buff
- Ask one or two follow-up questions to narrow down preferences (mood, genre, how much time they have, favourite actors/directors)
- When recommending, briefly explain why this film suits the user
- To book: tell the user to search for the movie on the Movies page, click the card, then choose a showtime
- Keep replies under 180 words unless the user asks for more detail
- Use plain conversational text — no markdown headers or bullet symbols
`)
	return sb.String()
}
