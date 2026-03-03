'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, DoctorApplicationStatus } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  // 医生申请状态
  applicationStatus: DoctorApplicationStatus | null;
  applicationLoading: boolean;
  refreshApplicationStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_PREFIX = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STORAGE_PREFIX || 'vetsphere_';
const USER_STORAGE_KEY = `${STORAGE_PREFIX}user_v1`;
const APP_STATUS_KEY = `${STORAGE_PREFIX}app_status_v1`;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState<DoctorApplicationStatus | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);

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

  // 获取医生申请状态
  const fetchApplicationStatus = useCallback(async (userId: string): Promise<DoctorApplicationStatus | null> => {
    try {
      const { data, error } = await supabase
        .from('doctor_applications')
        .select('status')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        // PGRST116 = no rows found，这是正常情况（新用户）
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching application status:', error);
        return null;
      }
      
      return data?.status as DoctorApplicationStatus || null;
    } catch (err) {
      console.error('Error in fetchApplicationStatus:', err);
      return null;
    }
  }, []);

  // 刷新申请状态
  const refreshApplicationStatus = useCallback(async () => {
    if (!user) {
      setApplicationStatus(null);
      return;
    }
    setApplicationLoading(true);
    try {
      const status = await fetchApplicationStatus(user.id);
      setApplicationStatus(status);
      if (status) {
        sessionStorage.setItem(APP_STATUS_KEY, status);
      } else {
        sessionStorage.removeItem(APP_STATUS_KEY);
      }
    } finally {
      setApplicationLoading(false);
    }
  }, [user, fetchApplicationStatus]);

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
          // Also restore cached application status
          const cachedStatus = sessionStorage.getItem(APP_STATUS_KEY);
          if (cachedStatus) {
            setApplicationStatus(cachedStatus as DoctorApplicationStatus);
          }
        }

        // Then verify with Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const mappedUser = mapSupabaseUser(session.user);
          setUser(mappedUser);
          sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
          
          // Fetch application status
          const status = await fetchApplicationStatus(session.user.id);
          setApplicationStatus(status);
          if (status) {
            sessionStorage.setItem(APP_STATUS_KEY, status);
          }
        } else {
          // No valid session, clear cached user
          setUser(null);
          setApplicationStatus(null);
          sessionStorage.removeItem(USER_STORAGE_KEY);
          sessionStorage.removeItem(APP_STATUS_KEY);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const mappedUser = mapSupabaseUser(session.user);
        setUser(mappedUser);
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
        
        // Fetch application status on auth change
        const status = await fetchApplicationStatus(session.user.id);
        setApplicationStatus(status);
        if (status) {
          sessionStorage.setItem(APP_STATUS_KEY, status);
        }
      } else {
        setUser(null);
        setApplicationStatus(null);
        sessionStorage.removeItem(USER_STORAGE_KEY);
        sessionStorage.removeItem(APP_STATUS_KEY);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [mapSupabaseUser, fetchApplicationStatus]);

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
    setApplicationStatus(null);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(APP_STATUS_KEY);
  }, []);

  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const mappedUser = mapSupabaseUser(session.user);
      setUser(mappedUser);
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
      
      // Also refresh application status
      const status = await fetchApplicationStatus(session.user.id);
      setApplicationStatus(status);
      if (status) {
        sessionStorage.setItem(APP_STATUS_KEY, status);
      }
    }
  }, [mapSupabaseUser, fetchApplicationStatus]);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      isAuthenticated: !!user, 
      refreshSession, 
      updateUser,
      applicationStatus,
      applicationLoading,
      refreshApplicationStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
