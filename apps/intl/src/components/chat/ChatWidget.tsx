'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { useChatSession } from './hooks/useChatSession';
import ChatWindow from './ChatWindow';

export default function ChatWidget() {
  const pathname = usePathname();
  const { visitorId } = useChatSession();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { messages, isLoading, sendMessage, sessionId } = useChat(visitorId, pathname);

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setUnreadCount((prev) => prev + 1);
      }
    }
  }, [messages, isOpen]);

  // Reset unread count when opening
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  return (
    <>
      {/* Chat Window */}
      {isOpen && visitorId && (
        <div
          className="fixed bottom-24 right-4 z-50 w-[380px] h-[600px] 
                        md:w-[420px] md:h-[650px]
                        bg-white rounded-2xl shadow-2xl border border-gray-200
                        flex flex-col overflow-hidden
                        animate-slide-up"
        >
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
            onClose={() => setIsOpen(false)}
            currentPage={pathname}
            sessionId={sessionId}
          />
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 
                   bg-blue-600 hover:bg-blue-700 text-white
                   rounded-full shadow-lg hover:shadow-xl
                   flex items-center justify-center
                   transition-all duration-200
                   group"
        aria-label="Chat with VetAssist"
      >
        {isOpen ? (
          // Close icon
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          // Chat bubble icon
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}

        {/* Unread Badge */}
        {unreadCount > 0 && !isOpen && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 
                           rounded-full text-xs flex items-center justify-center
                           font-semibold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Tooltip */}
        {!isOpen && (
          <span
            className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white 
                           text-sm rounded-lg opacity-0 group-hover:opacity-100 
                           transition-opacity whitespace-nowrap pointer-events-none"
          >
            Chat with VetAssist
          </span>
        )}
      </button>
    </>
  );
}
