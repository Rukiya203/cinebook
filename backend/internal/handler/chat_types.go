package handler

// ── HTTP request / response types ─────────────────────────────────────────────

type incomingMsg struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Messages []incomingMsg `json:"messages"`
}

// ── Groq API wire types ───────────────────────────────────────────────────────

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
