'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues
const ChatWidget = dynamic(() => import('@/components/chat/ChatWidget'), { ssr: false });

export default function IntlChatWidget() {
  return <ChatWidget />;
}
