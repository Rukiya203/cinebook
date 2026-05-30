import api from './api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatBooking {
  id: string;
  total_amount: number;
  seats: Array<{ id: string; row: string; number: number; type: string }>;
  movie?: { title: string };
  showtime?: { theater: string; date_time: string };
}

export interface ChatResponse {
  message: string;
  booking?: ChatBooking;
}

export async function sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  const { data } = await api.post('/chat', { messages });
  return data.data as ChatResponse;
}
