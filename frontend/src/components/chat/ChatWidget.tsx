import Box from '@oxygen-ui/react/Box';
import Button from '@oxygen-ui/react/Button';
import CircularProgress from '@oxygen-ui/react/CircularProgress';
import Typography from '@oxygen-ui/react/Typography';
import { MessageCircle, Send, X, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { type ChatMessage, sendMessage } from '../../services/chatService';
import { C } from '../../theme';

const SUGGESTIONS = [
  "What's a good action movie?",
  'Recommend something under 2 hours',
  'Best rated film right now?',
  "I'm in the mood for something funny",
];

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: "Hey! I'm CineBot 🎬 Tell me what you're in the mood for and I'll find the perfect film for you. You can describe a feeling, a genre, a favourite actor — anything!",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendMessage(next.filter((m) => m.role !== 'assistant' || m !== WELCOME));
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: "Sorry, I couldn't connect right now. Please try again!" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const showSuggestions = messages.length === 1;

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <Box sx={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 1300,
          width: { xs: 'calc(100vw - 48px)', sm: 380 },
          height: 520,
          bgcolor: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          display: 'flex', flexDirection: 'column',
          boxShadow: `0 24px 64px rgba(0,0,0,0.6)`,
          overflow: 'hidden',
          animation: 'slideUp 0.2s ease-out',
          '@keyframes slideUp': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        }}>
          {/* Header */}
          <Box sx={{ px: 2.5, py: 2, bgcolor: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: `${C.accent}22`, border: `2px solid ${C.accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={16} color={C.accent} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" fontWeight={700} color="text.primary">CineBot</Typography>
              <Typography variant="caption" color="text.secondary">AI movie assistant</Typography>
            </Box>
            <Box component="button" onClick={() => setOpen(false)}
              sx={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', p: 0.5, borderRadius: 1, '&:hover': { color: C.text, bgcolor: `${C.border}` } }}>
              <X size={18} />
            </Box>
          </Box>

          {/* Messages */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5,
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            '&::-webkit-scrollbar-thumb': { bgcolor: C.border, borderRadius: 2 },
          }}>
            {messages.map((msg, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <Box sx={{
                  maxWidth: '82%', px: 2, py: 1.25,
                  bgcolor: msg.role === 'user' ? C.accent : C.surface,
                  color: msg.role === 'user' ? '#fff' : C.text,
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  border: msg.role === 'assistant' ? `1px solid ${C.border}` : 'none',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </Box>
              </Box>
            ))}

            {/* Typing indicator */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Box sx={{ px: 2, py: 1.5, bgcolor: C.surface, border: `1px solid ${C.border}`, borderRadius: '18px 18px 18px 4px', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={12} sx={{ color: C.accent }} />
                  <Typography variant="caption" color="text.secondary">CineBot is thinking…</Typography>
                </Box>
              </Box>
            )}

            {/* Suggestion chips */}
            {showSuggestions && !loading && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                {SUGGESTIONS.map((s) => (
                  <Box key={s} component="button" onClick={() => send(s)}
                    sx={{
                      background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer',
                      color: C.textSec, borderRadius: 999, px: 1.5, py: 0.5,
                      fontSize: '0.75rem', fontWeight: 500,
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: C.accent, color: C.accent, bgcolor: `${C.accent}11` },
                    }}>
                    {s}
                  </Box>
                ))}
              </Box>
            )}

            <div ref={bottomRef} />
          </Box>

          {/* Input */}
          <Box sx={{ p: 2, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 1, flexShrink: 0 }}>
            <Box
              component="input"
              ref={inputRef}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything about movies…"
              disabled={loading}
              sx={{
                flex: 1, bgcolor: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 2, px: 2, py: 1.25, color: C.text,
                fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit',
                '&::placeholder': { color: C.muted },
                '&:focus': { borderColor: `${C.accent}88` },
                '&:disabled': { opacity: 0.5 },
              }}
            />
            <Button
              variant="contained"
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              sx={{ minWidth: 44, width: 44, height: 44, p: 0, borderRadius: 2, flexShrink: 0 }}
            >
              <Send size={16} />
            </Button>
          </Box>
        </Box>
      )}

      {/* FAB */}
      <Box
        component="button"
        onClick={() => setOpen((v) => !v)}
        sx={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1300,
          width: 56, height: 56, borderRadius: '50%',
          bgcolor: open ? C.accentDark : C.accent,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 24px ${C.accent}55`,
          transition: 'all 0.2s',
          '&:hover': { bgcolor: C.accentDark, transform: 'scale(1.08)' },
          '&:active': { transform: 'scale(0.96)' },
        }}
      >
        {open ? <X size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
      </Box>
    </>
  );
}
