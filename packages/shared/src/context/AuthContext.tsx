'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_PREFIX = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STORAGE_PREFIX || 'vetsphere_';
const USER_STORAGE_KEY = `${STORAGE_PREFIX}user_v1`;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Convert Supabase user to app User type
  const mapSupabaseUser = useCallback((supaUser: any): User => {
    return {
      id: supaUser.id,
      email: supaUser.email || '',
      name: supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'User',
      role: supaUser.user_metadata?.role || 'Doctor',
      points: 500,
      level: 'Resident'
    };
  }, []);

  // Initialize: check existing Supabase session
  useEffect(() => {
    const initAuth = async () => {
      try {
        // First check sessionStorage for cached user (faster UX)
        if (typeof window !== 'undefined') {
          const cached = sessionStorage.getItem(USER_STORAGE_KEY);
          if (cached) {
            setUser(JSON.parse(cached));
          }
        }

        // Then verify with Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const mappedUser = mapSupabaseUser(session.user);
          setUser(mappedUser);
          sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
        } else {
          // No valid session, clear cached user
          setUser(null);
          sessionStorage.removeItem(USER_STORAGE_KEY);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const mappedUser = mapSupabaseUser(session.user);
        setUser(mappedUser);
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
      } else {
        setUser(null);
        sessionStorage.removeItem(USER_STORAGE_KEY);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [mapSupabaseUser]);

  const login = useCallback((userData: User) => {
    setUser(userData);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    sessionStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const mappedUser = mapSupabaseUser(session.user);
      setUser(mappedUser);
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
    }
  }, [mapSupabaseUser]);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user, refreshSession, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
