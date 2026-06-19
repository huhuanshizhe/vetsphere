'use client';

import { useState, useEffect } from 'react';

export function useChatSession() {
  const [visitorId, setVisitorId] = useState<string>('');

  useEffect(() => {
    // Generate or retrieve visitor ID
    let id = localStorage.getItem('visitor_id');
    if (!id) {
      id = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem('visitor_id', id);
    }
    setVisitorId(id);
  }, []);

  return { visitorId };
}
