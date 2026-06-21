'use client';

import { useCallback } from 'react';

/**
 * Chat trigger event payload
 * Used to communicate between page components and the ChatWidget
 */
export interface ChatTriggerPayload {
  /** Pre-fill message to send */
  prefillMessage?: string;
  /** Product context */
  productId?: string;
  productName?: string;
  /** Course context */
  courseId?: string;
  courseName?: string;
  /** Page context */
  pageContext?: string;
}

const CHAT_TRIGGER_EVENT = 'vetsphere:chat:open';

/**
 * Dispatch a custom event to open the chat widget with context
 */
export function triggerChat(payload: ChatTriggerPayload = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHAT_TRIGGER_EVENT, { detail: payload }));
}

/**
 * React hook that provides a triggerChat callback
 */
export function useChatTrigger() {
  const openChat = useCallback((payload: ChatTriggerPayload = {}) => {
    triggerChat(payload);
  }, []);

  return { openChat };
}

/**
 * Listen for chat trigger events (used by ChatWidget)
 */
export function onChatTrigger(callback: (payload: ChatTriggerPayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const detail = (e as CustomEvent<ChatTriggerPayload>).detail;
    callback(detail || {});
  };

  window.addEventListener(CHAT_TRIGGER_EVENT, handler);
  return () => window.removeEventListener(CHAT_TRIGGER_EVENT, handler);
}
