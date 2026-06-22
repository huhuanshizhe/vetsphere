'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: Array<{ type: string; data?: Record<string, unknown> }>;
  timestamp: Date;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  sessionId: string | null;
}

export function useChat(visitorId: string, currentPage?: string): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing session and message history on mount
  useEffect(() => {
    if (!visitorId) return;

    const savedSessionId = localStorage.getItem(`chat_session_${visitorId}`);
    if (savedSessionId && messages.length === 0) {
      setSessionId(savedSessionId);

      // Load message history from API
      apiFetch<{ messages: Message[]; sessionId: string | null }>(
        `/api/ai/sales-chat/history?sessionId=${encodeURIComponent(savedSessionId)}&visitorId=${encodeURIComponent(visitorId)}`,
      )
        .then((data) => {
          if (data.messages && data.messages.length > 0) {
            const loaded: Message[] = data.messages.map((m) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }));
            setMessages(loaded);
          } else {
            // Session invalid or empty, clear it
            setSessionId(null);
            localStorage.removeItem(`chat_session_${visitorId}`);
          }
        })
        .catch(() => {
          // Failed to load history, start fresh
          setSessionId(null);
          localStorage.removeItem(`chat_session_${visitorId}`);
        });
    }
  }, [visitorId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await apiFetch<{
          sessionId: string;
          messageId: string;
          content: string;
          actions: Array<{ type: string; data?: Record<string, unknown> }>;
          leadCaptured: boolean;
        }>('/api/ai/sales-chat', {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            message: content.trim(),
            visitorId,
            currentPage,
          }),
        });

        // Save session ID
        if (response.sessionId !== sessionId) {
          setSessionId(response.sessionId);
          localStorage.setItem(`chat_session_${visitorId}`, response.sessionId);
        }

        // Add assistant message
        const assistantMessage: Message = {
          id: response.messageId,
          role: 'assistant',
          content: response.content,
          actions: response.actions,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Failed to send message:', error);

        // Add error message
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, visitorId, currentPage, isLoading],
  );

  return {
    messages,
    isLoading,
    sendMessage,
    sessionId,
  };
}
