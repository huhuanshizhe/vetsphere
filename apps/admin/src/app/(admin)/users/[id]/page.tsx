'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Button,
  LoadingState,
} from '@/components/ui';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  role?: string;
  is_doctor: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at?: string;
  last_login_at?: string;
  bio?: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const userId = params.id as string;

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
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .single();

      if (fetchError || !data) {
        setError('用户不存在或已被删除');
        return;
      }

      setUser(data);
    } catch {
      setError('加载用户信息失败');
    } finally {
      setLoading(false);
    }
  }

  function getUserRole(u: UserProfile) {
    if (u.is_admin) return { label: '管理员', color: 'bg-purple-50 text-purple-700' };
    if (u.is_doctor) return { label: '医生', color: 'bg-emerald-50 text-emerald-700' };
    return { label: '普通用户', color: 'bg-slate-100 text-slate-600' };
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
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-slate-300">
                {user.full_name?.[0] || user.email?.[0] || '?'}
              </span>
            )}
          </div>

          {/* 基本信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-slate-900">
                {user.full_name || '未设置姓名'}
              </h2>
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${role.color}`}>
                {role.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-1">{user.email}</p>
            {user.phone && <p className="text-sm text-slate-500">{user.phone}</p>}
            {user.bio && <p className="text-sm text-slate-600 mt-3">{user.bio}</p>}
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
              <dd className="text-sm text-slate-900 font-mono text-right break-all max-w-[60%]">{user.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">邮箱</dt>
              <dd className="text-sm text-slate-900">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">手机号</dt>
              <dd className="text-sm text-slate-900">{user.phone || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">角色</dt>
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
                {new Date(user.created_at).toLocaleString('zh-CN')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">最后更新</dt>
              <dd className="text-sm text-slate-900">
                {user.updated_at ? new Date(user.updated_at).toLocaleString('zh-CN') : '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">最近登录</dt>
              <dd className="text-sm text-slate-900">
                {user.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-CN') : '-'}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
