import api from './api';
import type { ChatMessage, ChatResponse, HistoryMessage } from '../types';

export type { ChatMessage, ChatBooking, ChatResponse, HistoryMessage } from '../types';

export async function sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  const { data } = await api.post('/chat', { messages });
  return data.data as ChatResponse;
}

export async function getHistory(): Promise<HistoryMessage[]> {
  const { data } = await api.get('/chat/history');
  return (data.data ?? []) as HistoryMessage[];
}

export async function clearHistory(): Promise<void> {
  await api.delete('/chat/history');
}
