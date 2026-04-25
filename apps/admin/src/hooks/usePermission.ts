'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

interface AdminMe {
  id: string;
  email: string;
  fullName: string | null;
  role: string | null;
  roleCode: string | null;
  adminRoleId: string | null;
  authorizedSites: string[];
  permissions: string[];
}

let cachedMe: AdminMe | null = null;
let inflight: Promise<AdminMe | null> | null = null;
const subscribers = new Set<() => void>();

async function loadMe(): Promise<AdminMe | null> {
  if (cachedMe) return cachedMe;
  if (inflight) return inflight;
  inflight = apiFetch<AdminMe>('/api/admin/me')
    .then((m) => {
      cachedMe = m;
      subscribers.forEach((cb) => cb());
      return m;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function clearAdminMeCache() {
  cachedMe = null;
  subscribers.forEach((cb) => cb());
}

/**
 * 当前管理员信息（包含 permissions 列表）
 */
export function useAdminMe() {
  const [me, setMe] = useState<AdminMe | null>(cachedMe);
  const [loading, setLoading] = useState(!cachedMe);

  useEffect(() => {
    let alive = true;
    if (!cachedMe) {
      setLoading(true);
      loadMe().then((m) => {
        if (alive) {
          setMe(m);
          setLoading(false);
        }
      });
    }
    const cb = () => {
      if (alive) setMe(cachedMe);
    };
    subscribers.add(cb);
    return () => {
      alive = false;
      subscribers.delete(cb);
    };
  }, []);

  return { me, loading };
}

/**
 * 判断是否拥有指定权限码。'*' 全权限 / 精确匹配通过。
 * 加载中默认 false（按钮先 disabled，避免越权）。
 */
export function usePermission(code: string): boolean {
  const { me } = useAdminMe();
  if (!me?.permissions) return false;
  if (me.permissions.includes('*')) return true;
  return me.permissions.includes(code);
}

/**
 * 判断当前用户是否超管（roleCode = 'super_admin' 或 permissions 含 '*'）
 */
export function useIsSuperAdmin(): boolean {
  const { me } = useAdminMe();
  if (!me) return false;
  return me.roleCode === 'super_admin' || (me.permissions || []).includes('*');
}
