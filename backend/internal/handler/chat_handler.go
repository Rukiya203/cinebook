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
	movieRepo    repository.MovieRepository
	anthropicKey string
}

func NewChatHandler(movieRepo repository.MovieRepository, anthropicKey string) *ChatHandler {
	return &ChatHandler{movieRepo: movieRepo, anthropicKey: anthropicKey}
}

type chatMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Messages []chatMsg `json:"messages"`
}

type anthropicReq struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	System    string    `json:"system"`
	Messages  []chatMsg `json:"messages"`
}

type anthropicResp struct {
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (h *ChatHandler) Chat(w http.ResponseWriter, r *http.Request) {
	if h.anthropicKey == "" {
		utils.InternalError(w, "AI agent not configured — set ANTHROPIC_API_KEY")
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
	system := buildSystemPrompt(movies)

	body, _ := json.Marshal(anthropicReq{
		Model:     "claude-haiku-4-5-20251001",
		MaxTokens: 1024,
		System:    system,
		Messages:  req.Messages,
	})

	apiReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost,
		"https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		utils.InternalError(w, "failed to create AI request")
		return
	}
	apiReq.Header.Set("Content-Type", "application/json")
	apiReq.Header.Set("x-api-key", h.anthropicKey)
	apiReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := http.DefaultClient.Do(apiReq)
	if err != nil {
		utils.InternalError(w, "AI service unavailable")
		return
	}
	defer resp.Body.Close()

	var ar anthropicResp
	if err := json.NewDecoder(resp.Body).Decode(&ar); err != nil {
		utils.InternalError(w, "failed to parse AI response")
		return
	}
	if ar.Error != nil {
		utils.InternalError(w, "AI error: "+ar.Error.Message)
		return
	}

	var text strings.Builder
	for _, block := range ar.Content {
		if block.Type == "text" {
			text.WriteString(block.Text)
		}
	}

	utils.Success(w, map[string]string{"message": text.String()})
}

func buildSystemPrompt(movies []*model.Movie) string {
	var sb strings.Builder
	sb.WriteString(`You are CineBot, a friendly and enthusiastic cinema assistant for CineBook — an online movie ticket booking platform.

Your job is to help users discover movies they'll love and guide them toward booking tickets. You know the full current catalogue and can make personalised recommendations based on mood, genre, runtime preference, favourite actors, or anything else the user shares.

` + "**Current movies in our catalogue:**" + `
`)
	for _, m := range movies {
		sb.WriteString(fmt.Sprintf(
			"- **%s** (ID: %s) | %s | ⭐ %.1f/10 | %d min | Dir: %s | Cast: %s | Now Showing: %v\n  _%s_\n\n",
			m.Title, m.ID, strings.Join(m.Genre, ", "), m.Rating, m.Duration,
			m.Director, strings.Join(m.Cast, ", "), m.IsNowShowing, m.Description,
		))
	}
	sb.WriteString(`
**Your guidelines:**
- Be warm, concise, and enthusiastic — you're a passionate movie buff
- Ask one or two follow-up questions to narrow down preferences (mood, genre, how much time they have, favourite actors/directors)
- When recommending, briefly explain *why* this film suits the user
- To book: tell the user to search for the movie on the Movies page, click the card, then choose a showtime
- Keep replies under 180 words unless the user asks for more detail
- Use plain text — no markdown headers, no bullet symbols, just natural conversation
`)
	return sb.String()
}
