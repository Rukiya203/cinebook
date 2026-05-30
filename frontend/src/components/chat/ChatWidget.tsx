import Box from '@oxygen-ui/react/Box';
import Button from '@oxygen-ui/react/Button';
import CircularProgress from '@oxygen-ui/react/CircularProgress';
import Typography from '@oxygen-ui/react/Typography';
import { ArrowLeft, CheckCircle, Clock, ExternalLink, MessageCircle, Send, Sparkles, Ticket, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  type ChatBooking,
  type ChatMessage,
  type HistoryMessage,
  clearHistory,
  getHistory,
  sendMessage,
} from '../../services/chatService';
import { C } from '../../theme';
import BookingWizard from './BookingWizard';

// ── constants ─────────────────────────────────────────────────────────────────

const BOOKING_KEYWORDS = ['book', 'reserve', 'ticket', 'watch a movie', 'cinema', 'buy ticket'];

function detectBookingIntent(msg: string): { isBooking: boolean; query?: string } {
  const lower = msg.toLowerCase();
  if (!BOOKING_KEYWORDS.some((kw) => lower.includes(kw))) return { isBooking: false };
  // Try to extract a movie name after "book", "watch", etc.
  const match = lower.match(/(?:book|watch|reserve|see)\s+(?:a\s+)?(?:movie\s+)?(.+)/);
  const query = match?.[1]?.replace(/\s+for me.*/, '').trim();
  return { isBooking: true, query: query && query.length > 2 ? query : undefined };
}

const SUGGESTIONS = [
  'Book a movie for me',
  "What's good right now?",
  'Recommend a thriller',
  'Something under 2 hours',
];

const WELCOME_TEXT = "Hey! I'm CineBot 🎬 I can recommend movies AND book tickets for you. Just tell me what you're in the mood for!";

interface DisplayMessage {
  role: 'user' | 'assistant' | 'booking';
  content: string;
  booking?: ChatBooking;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function dateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupByDate(msgs: HistoryMessage[]): { label: string; items: HistoryMessage[] }[] {
  const map = new Map<string, HistoryMessage[]>();
  msgs.forEach((m) => {
    const key = dateLabel(m.created_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  });
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// ── BookingCard ───────────────────────────────────────────────────────────────

function BookingCard({ booking }: { booking: ChatBooking }) {
  const seats = booking.seats?.map((s) => `${s.row}${s.number}`).join(', ') ?? '—';
  const date = booking.showtime?.date_time
    ? new Date(booking.showtime.date_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
  return (
    <Box sx={{ border: `1px solid ${C.accent}66`, borderRadius: 2, p: 2, bgcolor: `${C.accent}0d`, mt: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <CheckCircle size={16} color="#22c55e" />
        <Typography variant="body2" fontWeight={700} color="#22c55e">Booking Confirmed!</Typography>
      </Box>
      {booking.movie && <Typography variant="body2" fontWeight={600} color="text.primary" mb={0.5}>{booking.movie.title}</Typography>}
      {booking.showtime && (
        <>
          <Typography variant="caption" color="text.secondary">{booking.showtime.theater}</Typography>
          {date && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{date}</Typography>}
        </>
      )}
      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">Seats: {seats}</Typography>
        <Typography variant="body2" fontWeight={700} color={C.gold}>${booking.total_amount.toFixed(2)}</Typography>
      </Box>
      <Typography variant="caption" sx={{ color: C.muted, mt: 0.5, display: 'block' }}>
        Ref: #{booking.id.slice(0, 8).toUpperCase()}
      </Typography>
      <Box component={Link} to="/profile"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.5, color: C.accent, fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
        <ExternalLink size={12} /> View in My Bookings
      </Box>
    </Box>
  );
}

// ── HistoryPanel ──────────────────────────────────────────────────────────────

function HistoryPanel({ data, loading }: { data: HistoryMessage[]; loading: boolean }) {
  if (loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={24} sx={{ color: C.accent }} />
      </Box>
    );
  }
  if (data.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 3 }}>
        <Clock size={36} color={C.muted} />
        <Typography variant="body2" color="text.secondary" textAlign="center">No history yet. Start a conversation!</Typography>
      </Box>
    );
  }
  const groups = groupByDate(data);
  return (
    <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: C.border, borderRadius: 2 } }}>
      {groups.map(({ label, items }) => (
        <Box key={label}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1.5 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: C.border }} />
            <Typography variant="caption" sx={{ color: C.muted, fontWeight: 600, whiteSpace: 'nowrap', px: 1 }}>{label}</Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: C.border }} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {items.map((m, i) => (
              <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 0.25 }}>
                <Typography variant="caption" sx={{ color: C.muted, px: 0.5 }}>
                  {m.role === 'user' ? 'You' : 'CineBot'} · {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Typography>
                <Box sx={{
                  maxWidth: '85%', px: 1.75, py: 1,
                  bgcolor: m.role === 'user' ? `${C.accent}cc` : C.surface,
                  color: m.role === 'user' ? '#fff' : C.text,
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  border: m.role === 'assistant' ? `1px solid ${C.border}` : 'none',
                  fontSize: '0.8125rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {m.content}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ── ChatWidget ────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [messages, setMessages] = useState<DisplayMessage[]>([{ role: 'assistant', content: WELCOME_TEXT }]);
  const [historyData, setHistoryData] = useState<HistoryMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [wizardQuery, setWizardQuery] = useState<string | undefined>(undefined);
  const [wizardActive, setWizardActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, view, wizardActive]);

  useEffect(() => {
    if (open && view === 'chat' && !wizardActive) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, view, wizardActive]);

  useEffect(() => {
    if (!open || !isAuthenticated || historyLoaded) return;
    setHistoryLoaded(true);
    getHistory().then((history) => {
      setHistoryData(history);
      if (history.length > 0) {
        setMessages([
          { role: 'assistant', content: WELCOME_TEXT },
          ...history.map((m) => ({ role: m.role, content: m.content })),
        ]);
      }
    }).catch(() => {});
  }, [open, isAuthenticated, historyLoaded]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [...prev, { role, content }]);
    const now = new Date().toISOString();
    setHistoryData((prev) => [...prev, { role, content, created_at: now }]);
  };

  const handleShowHistory = () => {
    setView('history');
    if (isAuthenticated) {
      setHistoryLoading(true);
      getHistory().then(setHistoryData).catch(() => {}).finally(() => setHistoryLoading(false));
    }
  };

  const handleClearHistory = async () => {
    await clearHistory().catch(() => {});
    setMessages([{ role: 'assistant', content: WELCOME_TEXT }]);
    setHistoryData([]);
    setHistoryLoaded(false);
    setView('chat');
  };

  const startWizard = (query?: string) => {
    addMessage('assistant', "Let's book your tickets! Search for a movie below. 🎟️");
    setWizardQuery(query);
    setWizardActive(true);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');

    // Check for booking intent
    if (isAuthenticated) {
      const { isBooking, query } = detectBookingIntent(trimmed);
      if (isBooking) {
        addMessage('user', trimmed);
        startWizard(query);
        return;
      }
    }

    const userDisplay: DisplayMessage = { role: 'user', content: trimmed };
    const next = [...messages, userDisplay];
    setMessages(next);
    setLoading(true);

    const apiHistory: ChatMessage[] = next
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    try {
      const result = await sendMessage(apiHistory);
      const updated: DisplayMessage[] = [...next, { role: 'assistant', content: result.message }];
      if (result.booking) updated.push({ role: 'booking', content: '', booking: result.booking });
      setMessages(updated);
      const now = new Date().toISOString();
      setHistoryData((prev) => [...prev, { role: 'user', content: trimmed, created_at: now }, { role: 'assistant', content: result.message, created_at: now }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: "Sorry, I couldn't connect right now. Please try again!" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const showSuggestions = messages.length === 1 && !wizardActive;

  return (
    <>
      {open && (
        <Box sx={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 1300,
          width: { xs: 'calc(100vw - 48px)', sm: 390 },
          height: 560,
          bgcolor: C.card, border: `1px solid ${C.border}`, borderRadius: 3,
          display: 'flex', flexDirection: 'column',
          boxShadow: `0 24px 64px rgba(0,0,0,0.6)`,
          overflow: 'hidden',
          animation: 'slideUp 0.2s ease-out',
          '@keyframes slideUp': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        }}>

          {/* Header */}
          <Box sx={{ px: 2.5, py: 2, bgcolor: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            {view === 'history' ? (
              <Box component="button" onClick={() => setView('chat')}
                sx={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', p: 0.5, borderRadius: 1, '&:hover': { color: C.text, bgcolor: C.border } }}>
                <ArrowLeft size={18} />
              </Box>
            ) : (
              <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: `${C.accent}22`, border: `2px solid ${C.accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={16} color={C.accent} />
              </Box>
            )}
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" fontWeight={700} color="text.primary">
                {view === 'history' ? 'Chat History' : 'CineBot'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {view === 'history' ? `${historyData.length} messages` : wizardActive ? 'Booking wizard' : 'AI assistant · can book tickets'}
              </Typography>
            </Box>

            {view === 'chat' && isAuthenticated && !wizardActive && (
              <Box component="button" onClick={handleShowHistory} title="View chat history"
                sx={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', p: 0.5, borderRadius: 1, '&:hover': { color: C.text, bgcolor: C.border } }}>
                <Clock size={16} />
              </Box>
            )}
            {view === 'history' && historyData.length > 0 && (
              <Box component="button" onClick={handleClearHistory} title="Clear history"
                sx={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', p: 0.5, borderRadius: 1, '&:hover': { color: 'error.main', bgcolor: C.border } }}>
                <Trash2 size={15} />
              </Box>
            )}
            <Box component="button" onClick={() => setOpen(false)}
              sx={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', p: 0.5, borderRadius: 1, '&:hover': { color: C.text, bgcolor: C.border } }}>
              <X size={18} />
            </Box>
          </Box>

          {/* Login nudge */}
          {!isAuthenticated && view === 'chat' && (
            <Box sx={{ mx: 2, mt: 1.5, px: 2, py: 1.25, bgcolor: `${C.gold}15`, border: `1px solid ${C.gold}44`, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexShrink: 0 }}>
              <Typography variant="caption" sx={{ color: C.gold, fontWeight: 600 }}>Log in to book tickets with CineBot</Typography>
              <Box component={Link} to="/auth"
                sx={{ fontSize: '0.7rem', fontWeight: 700, color: C.gold, textDecoration: 'none', border: `1px solid ${C.gold}66`, borderRadius: 1, px: 1, py: 0.25, whiteSpace: 'nowrap', '&:hover': { bgcolor: `${C.gold}22` } }}>
                Sign In →
              </Box>
            </Box>
          )}

          {/* History panel */}
          {view === 'history' && <HistoryPanel data={historyData} loading={historyLoading} />}

          {/* Chat messages */}
          {view === 'chat' && (
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: C.border, borderRadius: 2 } }}>
              {messages.map((msg, i) => {
                if (msg.role === 'booking' && msg.booking) {
                  return (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Box sx={{ maxWidth: '90%' }}><BookingCard booking={msg.booking} /></Box>
                    </Box>
                  );
                }
                return (
                  <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <Box sx={{
                      maxWidth: '82%', px: 2, py: 1.25,
                      bgcolor: msg.role === 'user' ? C.accent : C.surface,
                      color: msg.role === 'user' ? '#fff' : C.text,
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      border: msg.role === 'assistant' ? `1px solid ${C.border}` : 'none',
                      fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </Box>
                  </Box>
                );
              })}

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
                    <Box key={s} component="button"
                      onClick={() => s === 'Book a movie for me' && isAuthenticated ? startWizard() : send(s)}
                      sx={{
                        background: 'none', border: `1px solid ${C.border}`, cursor: 'pointer',
                        color: s === 'Book a movie for me' ? C.accent : C.textSec,
                        borderColor: s === 'Book a movie for me' ? `${C.accent}66` : C.border,
                        borderRadius: 999, px: 1.5, py: 0.5,
                        fontSize: '0.75rem', fontWeight: 500, transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 0.5,
                        '&:hover': { borderColor: C.accent, color: C.accent, bgcolor: `${C.accent}11` },
                      }}>
                      {s === 'Book a movie for me' && <Ticket size={11} />}
                      {s}
                    </Box>
                  ))}
                </Box>
              )}

              <div ref={bottomRef} />
            </Box>
          )}

          {/* Booking wizard panel (replaces input when active) */}
          {view === 'chat' && wizardActive && (
            <BookingWizard
              initialQuery={wizardQuery}
              onMessage={addMessage}
              onCancel={() => {
                setWizardActive(false);
                setWizardQuery(undefined);
                addMessage('assistant', 'No problem! Feel free to ask me anything else.');
              }}
            />
          )}

          {/* Regular input (hidden when wizard is active) */}
          {view === 'chat' && !wizardActive && (
            <Box sx={{ p: 2, borderTop: `1px solid ${C.border}`, display: 'flex', gap: 1, flexShrink: 0 }}>
              <Box component="input" ref={inputRef} value={input}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={isAuthenticated ? "Ask anything or say 'book a movie'…" : 'Ask me about movies…'}
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
              <Button variant="contained" onClick={() => send(input)} disabled={!input.trim() || loading}
                sx={{ minWidth: 44, width: 44, height: 44, p: 0, borderRadius: 2, flexShrink: 0 }}>
                <Send size={16} />
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* FAB */}
      <Box component="button" onClick={() => setOpen((v) => !v)}
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
        }}>
        {open ? <X size={22} color="#fff" /> : <MessageCircle size={22} color="#fff" />}
      </Box>
    </>
  );
}
