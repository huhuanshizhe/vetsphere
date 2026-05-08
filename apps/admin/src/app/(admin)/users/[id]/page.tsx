'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import {
  Card,
  Button,
  LoadingState,
} from '@/components/ui';

interface UserProfile {
  id: string;
  userId: string;
  siteCode: 'cn' | 'intl';
  sourceSite: 'cn' | 'intl';
  originSite: 'cn' | 'intl' | null;
  contact: string | null;
  email: string | null;
  displayName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  identityType: string | null;
  identityGroup: string | null;
  verificationStatus: string | null;
  verificationType: string | null;
  accountStatus: string | null;
  is_admin: boolean;
  createdAt: string | null;
  updatedAt?: string | null;
  registeredAt: string | null;
  lastLoginAt?: string | null;
  createdVia: string | null;
  isShadowProfile: boolean;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = params.id as string;
  const sourceSite = searchParams.get('site');

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId) loadUser();
  }, [userId]);

  async function loadUser() {
    setLoading(true);
    setError('');

    try {
      const data = await apiFetch<{ item: UserProfile | null }>(
        `/api/v1/admin/users/${userId}${sourceSite === 'cn' || sourceSite === 'intl' ? `?site_code=${sourceSite}` : ''}`,
      );

      if (!data.item) {
        setError('用户不存在或已被删除');
        return;
      }

      setUser(data.item);
    } catch (err) {
      setError(getErrorMessage(err) || '加载用户信息失败');
    } finally {
      setLoading(false);
    }
  }

  function getUserRole(u: UserProfile) {
    if (u.is_admin) return { label: '管理员', color: 'bg-purple-50 text-purple-700' };
    if (u.verificationStatus === 'approved') return { label: '已认证用户', color: 'bg-emerald-50 text-emerald-700' };
    if (u.sourceSite === 'cn') return { label: '中国站用户', color: 'bg-sky-50 text-sky-700' };
    return { label: '国际站用户', color: 'bg-indigo-50 text-indigo-700' };
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">用户详情</h1>
        </div>
        <Card><LoadingState /></Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">用户详情</h1>
        </div>
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-4">😕</span>
            <h3 className="text-base font-semibold text-slate-900 mb-1">{error || '用户不存在'}</h3>
            <p className="text-sm text-slate-500 mb-6">该用户可能已被删除或ID不正确</p>
            <Button variant="secondary" onClick={() => router.push('/users')}>
              返回用户列表
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const role = getUserRole(user);

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">用户详情</h1>
          <p className="text-slate-500 mt-1">查看用户基本信息</p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/users')}>
          返回列表
        </Button>
      </div>

      {/* 用户信息卡片 */}
      <Card>
        <div className="flex items-start gap-6">
          {/* 头像 */}
          <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-slate-600">
                {user.fullName?.[0] || user.displayName?.[0] || user.email?.[0] || user.contact?.[0] || '?'}
              </span>
            )}
          </div>

          {/* 基本信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-slate-900">
                {user.fullName || user.displayName || '未设置姓名'}
              </h2>
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${role.color}`}>
                {role.label}
              </span>
            </div>
            {user.contact && <p className="text-sm text-slate-500 mb-1">{user.contact}</p>}
            {user.email && user.email !== user.contact && <p className="text-sm text-slate-500">{user.email}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                站点：{user.sourceSite.toUpperCase()}
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                状态：{user.accountStatus || 'unknown'}
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                认证：{user.verificationStatus || 'none'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 详细信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">账号信息</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">用户ID</dt>
              <dd className="text-sm text-slate-900 font-mono text-right break-all max-w-[60%]">{user.userId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">站点</dt>
              <dd className="text-sm text-slate-900 uppercase">{user.sourceSite}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">联系方式</dt>
              <dd className="text-sm text-slate-900">{user.contact || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">邮箱</dt>
              <dd className="text-sm text-slate-900">{user.email || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">身份</dt>
              <dd className="text-sm text-slate-900">{user.identityType || user.identityGroup || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">认证类型</dt>
              <dd className="text-sm text-slate-900">{user.verificationType || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">用户标签</dt>
              <dd><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${role.color}`}>{role.label}</span></dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">时间信息</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">注册时间</dt>
              <dd className="text-sm text-slate-900">
                {user.registeredAt ? new Date(user.registeredAt).toLocaleString('zh-CN') : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">最后更新</dt>
              <dd className="text-sm text-slate-900">
                {user.updatedAt ? new Date(user.updatedAt).toLocaleString('zh-CN') : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">最近登录</dt>
              <dd className="text-sm text-slate-900">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">建档来源</dt>
              <dd className="text-sm text-slate-900">
                {user.createdVia || (user.isShadowProfile ? 'shadow_profile' : '-')}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
