'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ChatMessageBubble from './ChatMessageBubble';
import ChatTypingIndicator from './ChatTypingIndicator';
import ChatLeadForm from './ChatLeadForm';
import ChatProductCard from './ChatProductCard';
import { useRouter } from 'next/navigation';

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

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  sessionId?: string | null;
}

export default function ChatMessages({ messages, isLoading, sessionId }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [leadFormSubmitted, setLeadFormSubmitted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Hide welcome after first message
  useEffect(() => {
    if (messages.length > 0) {
      setShowWelcome(false);
    }
  }, [messages]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto py-4">
      {showWelcome ? (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to VetSphere</h3>
          <p className="text-sm text-gray-600 mb-4">
            I&apos;m VetAssist, your professional procurement consultant. I can help you with:
          </p>
          <ul className="text-sm text-gray-600 space-y-1 text-left">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Surgical equipment selection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Training course recommendations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>One-stop procurement solutions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Product comparisons</span>
            </li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">How can I assist you today?</p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div key={message.id}>
              <ChatMessageBubble message={message} />
              {/* Render actions for assistant messages */}
              {message.role === 'assistant' && message.actions && message.actions.length > 0 && (
                <div className="mt-2">
                  {message.actions.map((action, idx) => {
                    if (action.type === 'lead_form' && sessionId) {
                      return (
                        <ChatLeadForm
                          key={`lead-${idx}`}
                          sessionId={sessionId}
                          submitted={leadFormSubmitted}
                          onSubmit={async () => {
                            setLeadFormSubmitted(true);
                          }}
                        />
                      );
                    }
                    if (action.type === 'product_card' && action.data?.productId) {
                      return (
                        <ChatProductCard
                          key={`product-${idx}`}
                          productId={action.data.productId as string}
                          name={`Product ${action.data.productId}`}
                          onViewProduct={(id) => {
                            router.push(`/products/${id}`);
                          }}
                        />
                      );
                    }
                    if (action.type === 'course_card' && action.data?.courseId) {
                      return (
                        <ChatProductCard
                          key={`course-${idx}`}
                          productId={action.data.courseId as string}
                          name={`Course ${action.data.courseId}`}
                          onViewProduct={(id) => {
                            router.push(`/training/${id}`);
                          }}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          ))}
          {isLoading && <ChatTypingIndicator />}
        </>
      )}
    </div>
  );
}
