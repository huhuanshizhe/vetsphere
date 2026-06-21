'use client';

import React from 'react';
import { useChatTrigger, type ChatTriggerPayload } from '../hooks/useChatTrigger';

interface AskVetAssistButtonProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'outline' | 'ghost';
  payload: ChatTriggerPayload;
  className?: string;
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md',
  outline: 'border border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent',
  ghost: 'text-blue-600 hover:bg-blue-50 bg-transparent',
};

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

export default function AskVetAssistButton({
  label = 'Ask VetAssist',
  size = 'md',
  variant = 'outline',
  payload,
  className = '',
}: AskVetAssistButtonProps) {
  const { openChat } = useChatTrigger();

  return (
    <button
      onClick={() => openChat(payload)}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-200 cursor-pointer
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      <ChatIcon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      {label}
    </button>
  );
}
