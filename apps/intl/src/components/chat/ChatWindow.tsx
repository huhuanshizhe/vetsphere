'use client';

import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

interface ChatAction {
  type: string;
  data?: Record<string, unknown>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: ChatAction[];
  timestamp: Date;
}

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onClose: () => void;
  currentPage?: string;
  sessionId?: string | null;
}

export default function ChatWindow({
  messages,
  isLoading,
  onSendMessage,
  onClose,
  sessionId,
}: ChatWindowProps) {
  return (
    <div className="flex flex-col h-full">
      <ChatHeader onClose={onClose} />
      <ChatMessages messages={messages} isLoading={isLoading} sessionId={sessionId} />
      <ChatInput onSendMessage={onSendMessage} disabled={isLoading} />
    </div>
  );
}
