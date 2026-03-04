'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, DoctorApplicationStatus, DualTrackPermissions } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  // 医生申请状态 (旧字段，向后兼容)
  applicationStatus: DoctorApplicationStatus | null;
  applicationLoading: boolean;
  refreshApplicationStatus: () => Promise<void>;
  // 双轨制新字段
  permissionFlags: DualTrackPermissions;
  isDoctorApproved: boolean;
  canAccessDoctorWorkspace: boolean;
  doctorPrivilegeStatus: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_PREFIX = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_STORAGE_PREFIX || 'vetsphere_';
const USER_STORAGE_KEY = `${STORAGE_PREFIX}user_v2`;
const APP_STATUS_KEY = `${STORAGE_PREFIX}app_status_v2`;
const PERMISSIONS_KEY = `${STORAGE_PREFIX}permissions_v1`;

// 默认权限（未登录或加载中）
const DEFAULT_PERMISSIONS: DualTrackPermissions = {
  can_access_user_center: false,
  can_purchase_courses: false,
  can_purchase_products: false,
  can_manage_orders: false,
  can_access_growth_system: false,
  can_access_doctor_workspace: false,
  can_access_medical_features: false,
  can_access_professional_courses: false,
  can_view_restricted_product_info: false,
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationStatus, setApplicationStatus] = useState<DoctorApplicationStatus | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [permissionFlags, setPermissionFlags] = useState<DualTrackPermissions>(DEFAULT_PERMISSIONS);
  const [doctorPrivilegeStatus, setDoctorPrivilegeStatus] = useState<string>('not_applicable');

  // Computed: 是否医生已认证
  const isDoctorApproved = doctorPrivilegeStatus === 'approved';
  const canAccessDoctorWorkspace = isDoctorApproved;

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

  // 从 /api/auth/me 获取完整状态（包含双轨权限）
  const fetchFullUserState = useCallback(async (accessToken: string): Promise<{
    permissions: DualTrackPermissions;
    doctorPrivilegeStatus: string;
    applicationStatus: DoctorApplicationStatus | null;
    userUpdate: Partial<User>;
  } | null> => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.isLoggedIn) return null;

      // 提取权限
      const permissions: DualTrackPermissions = data.permissions || DEFAULT_PERMISSIONS;
      const docStatus = data.doctorAccess?.status || 'not_applicable';
      
      // 兼容旧字段：推导 applicationStatus
      let appStatus: DoctorApplicationStatus | null = null;
      if (docStatus === 'approved') appStatus = 'approved';
      else if (docStatus === 'rejected') appStatus = 'rejected';
      else if (docStatus === 'pending_review') appStatus = 'pending_review';
      else if (docStatus === 'not_started' && data.identity?.identityGroupV2 === 'doctor') appStatus = 'draft';

      // 用户信息更新
      const userUpdate: Partial<User> = {
        name: data.user?.displayName || undefined,
        avatarUrl: data.user?.avatarUrl || undefined,
        mobile: data.user?.mobile || undefined,
        identityGroupV2: data.identity?.identityGroupV2 || undefined,
        doctorSubtype: data.identity?.doctorSubtype || undefined,
        doctorPrivilegeStatus: docStatus,
        identityLabel: data.identity?.identityLabel || undefined,
      };

      return { permissions, doctorPrivilegeStatus: docStatus, applicationStatus: appStatus, userUpdate };
    } catch (err) {
      console.error('fetchFullUserState error:', err);
      return null;
    }
  }, []);

  // 获取医生申请状态 (旧方法，保留兼容)
  const fetchApplicationStatus = useCallback(async (userId: string): Promise<DoctorApplicationStatus | null> => {
    try {
      const { data, error } = await supabase
        .from('doctor_applications')
        .select('status')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
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
      // 优先使用 /api/auth/me
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const fullState = await fetchFullUserState(session.access_token);
        if (fullState) {
          setApplicationStatus(fullState.applicationStatus);
          setPermissionFlags(fullState.permissions);
          setDoctorPrivilegeStatus(fullState.doctorPrivilegeStatus);
          sessionStorage.setItem(PERMISSIONS_KEY, JSON.stringify(fullState.permissions));
          if (fullState.applicationStatus) {
            sessionStorage.setItem(APP_STATUS_KEY, fullState.applicationStatus);
          }
          return;
        }
      }
      // 回退到旧方法
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
  }, [user, fetchApplicationStatus, fetchFullUserState]);

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
          const cachedStatus = sessionStorage.getItem(APP_STATUS_KEY);
          if (cachedStatus) {
            setApplicationStatus(cachedStatus as DoctorApplicationStatus);
          }
          const cachedPerms = sessionStorage.getItem(PERMISSIONS_KEY);
          if (cachedPerms) {
            try {
              setPermissionFlags(JSON.parse(cachedPerms));
            } catch {}
          }
        }

        // Then verify with Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const mappedUser = mapSupabaseUser(session.user);
          
          // 获取完整状态
          const fullState = await fetchFullUserState(session.access_token);
          if (fullState) {
            const updatedUser = { ...mappedUser, ...fullState.userUpdate };
            setUser(updatedUser);
            setApplicationStatus(fullState.applicationStatus);
            setPermissionFlags(fullState.permissions);
            setDoctorPrivilegeStatus(fullState.doctorPrivilegeStatus);
            sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
            sessionStorage.setItem(PERMISSIONS_KEY, JSON.stringify(fullState.permissions));
            if (fullState.applicationStatus) {
              sessionStorage.setItem(APP_STATUS_KEY, fullState.applicationStatus);
            }
          } else {
            // 回退
            setUser(mappedUser);
            sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
            const status = await fetchApplicationStatus(session.user.id);
            setApplicationStatus(status);
            if (status) {
              sessionStorage.setItem(APP_STATUS_KEY, status);
            }
          }
        } else {
          setUser(null);
          setApplicationStatus(null);
          setPermissionFlags(DEFAULT_PERMISSIONS);
          setDoctorPrivilegeStatus('not_applicable');
          sessionStorage.removeItem(USER_STORAGE_KEY);
          sessionStorage.removeItem(APP_STATUS_KEY);
          sessionStorage.removeItem(PERMISSIONS_KEY);
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
        
        const fullState = await fetchFullUserState(session.access_token);
        if (fullState) {
          const updatedUser = { ...mappedUser, ...fullState.userUpdate };
          setUser(updatedUser);
          setApplicationStatus(fullState.applicationStatus);
          setPermissionFlags(fullState.permissions);
          setDoctorPrivilegeStatus(fullState.doctorPrivilegeStatus);
          sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
          sessionStorage.setItem(PERMISSIONS_KEY, JSON.stringify(fullState.permissions));
          if (fullState.applicationStatus) {
            sessionStorage.setItem(APP_STATUS_KEY, fullState.applicationStatus);
          }
        } else {
          setUser(mappedUser);
          sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
          const status = await fetchApplicationStatus(session.user.id);
          setApplicationStatus(status);
          if (status) {
            sessionStorage.setItem(APP_STATUS_KEY, status);
          }
        }
      } else {
        setUser(null);
        setApplicationStatus(null);
        setPermissionFlags(DEFAULT_PERMISSIONS);
        setDoctorPrivilegeStatus('not_applicable');
        sessionStorage.removeItem(USER_STORAGE_KEY);
        sessionStorage.removeItem(APP_STATUS_KEY);
        sessionStorage.removeItem(PERMISSIONS_KEY);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [mapSupabaseUser, fetchApplicationStatus, fetchFullUserState]);

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
    setPermissionFlags(DEFAULT_PERMISSIONS);
    setDoctorPrivilegeStatus('not_applicable');
    sessionStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(APP_STATUS_KEY);
    sessionStorage.removeItem(PERMISSIONS_KEY);
  }, []);

  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const mappedUser = mapSupabaseUser(session.user);
      
      const fullState = await fetchFullUserState(session.access_token);
      if (fullState) {
        const updatedUser = { ...mappedUser, ...fullState.userUpdate };
        setUser(updatedUser);
        setApplicationStatus(fullState.applicationStatus);
        setPermissionFlags(fullState.permissions);
        setDoctorPrivilegeStatus(fullState.doctorPrivilegeStatus);
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        sessionStorage.setItem(PERMISSIONS_KEY, JSON.stringify(fullState.permissions));
      } else {
        setUser(mappedUser);
        sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mappedUser));
        const status = await fetchApplicationStatus(session.user.id);
        setApplicationStatus(status);
        if (status) {
          sessionStorage.setItem(APP_STATUS_KEY, status);
        }
      }
    }
  }, [mapSupabaseUser, fetchApplicationStatus, fetchFullUserState]);

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
      refreshApplicationStatus,
      // 双轨制新字段
      permissionFlags,
      isDoctorApproved,
      canAccessDoctorWorkspace,
      doctorPrivilegeStatus,
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
