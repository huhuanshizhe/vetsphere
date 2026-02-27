'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/services/supabase';
import { useAuth } from './AuthContext';
import { AppNotification } from '@/types';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: AppNotification) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  toast: AppNotification | null;
  hideToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toast, setToast] = useState<AppNotification | null>(null);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  };

  const addNotification = (notif: AppNotification) => {
    setNotifications(prev => [notif, ...prev]);
    setToast(notif);
    playNotificationSound();

    setTimeout(() => {
      setToast(current => current?.id === notif.id ? null : current);
    }, 5000);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const hideToast = () => setToast(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    const orderChannel = supabase.channel('realtime:orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_email=eq.${user.email}`
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.status === 'Shipped') {
            const notif: AppNotification = {
              id: `notif-ord-${Date.now()}`,
              type: 'order',
              title: 'Order Shipped',
              message: `Great news! Your order #${newData.id} has been shipped and is on its way.`,
              read: false,
              timestamp: new Date(),
              link: '/dashboard'
            };
            addNotification(notif);
          }
        }
      )
      .subscribe();

    const socialChannel = supabase.channel('realtime:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newData = payload.new as any;
          const notif: AppNotification = {
            id: newData.id,
            type: 'community',
            title: newData.title || 'New Interaction',
            message: newData.message || 'Someone interacted with your post.',
            read: false,
            timestamp: new Date(newData.created_at),
            link: newData.link || '/community'
          };
          addNotification(notif);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(socialChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, clearAll, toast, hideToast }}>
      {children}
      {toast && (
        <div className="fixed top-24 right-6 z-[1000] animate-in slide-in-from-right fade-in duration-300">
          <div className="bg-white border-l-4 border-[#00A884] p-4 rounded-xl shadow-2xl w-80 flex items-start gap-3 relative">
            <button onClick={hideToast} className="absolute top-2 right-2 text-slate-300 hover:text-slate-500">&#x2715;</button>
            <div className="text-2xl pt-1">
              {toast.type === 'order' ? '\uD83D\uDCE6' : toast.type === 'community' ? '\uD83D\uDCAC' : '\uD83D\uDD14'}
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{toast.title}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};
