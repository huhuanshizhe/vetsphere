'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  LoadingState,
  EmptyState,
  StatCard,
  Pagination,
} from '@/components/ui';
import { getAccessTokenSafe } from '@vetsphere/shared/services/supabase';
import { useSite } from '@/context/SiteContext';

interface UnifiedUser {
  id: string;
  sourceSite: 'cn' | 'intl';
  contact: string | null;
  email: string | null;
  displayName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  identityType: string | null;
  identityGroup: string | null;
  verificationStatus: string | null;
  verificationType: string | null;
  isAdmin?: boolean;
  isDoctor?: boolean;
  createdAt: string | null;
  lastLoginAt?: string | null;
}

const PAGE_SIZE = 20;

const VERIFY_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: '已认证', color: 'bg-emerald-50 text-emerald-700' },
  submitted: { label: '审核中', color: 'bg-amber-50 text-amber-700' },
  under_review: { label: '审核中', color: 'bg-amber-50 text-amber-700' },
  rejected: { label: '已驳回', color: 'bg-red-50 text-red-700' },
  draft: { label: '草稿', color: 'bg-slate-100 text-slate-600' },
};

export default function UsersPage() {
  const { currentSite } = useSite();
  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0 });
  const [verifyFilter, setVerifyFilter] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSafe();
      if (!token) return;

      const params = new URLSearchParams();
      params.set('site_code', currentSite || 'global');
      if (searchKeyword) params.set('keyword', searchKeyword);
      if (verifyFilter) params.set('verification_status', verifyFilter);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/v1/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('加载用户失败');
      const data = await res.json();

      const items: UnifiedUser[] = data.items || [];
      setUsers(items);
      setTotal(data.total || 0);

      setStats({
        total: data.total || 0,
        verified: items.filter((u) => u.verificationStatus === 'approved').length,
        pending: items.filter(
          (u) => u.verificationStatus === 'submitted' || u.verificationStatus === 'under_review',
        ).length,
      });
    } catch (e) {
      console.error('加载用户失败:', e);
    } finally {
      setLoading(false);
    }
  }, [currentSite, searchKeyword, verifyFilter, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          用户管理
          {currentSite && currentSite !== 'global' && (
            <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded align-middle">
              {currentSite.toUpperCase()}
            </span>
          )}
        </h1>
        <p className="text-slate-500 mt-1">查看和管理平台用户（按当前站点过滤）</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="总用户数" value={stats.total} />
        <StatCard label="已认证" value={stats.verified} />
        <StatCard label="审核中" value={stats.pending} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索姓名、邮箱、手机号..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(1);
              }}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
            />
          </div>
          <Select
            value={verifyFilter}
            onChange={(e) => {
              setVerifyFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { value: '', label: '全部认证状态' },
              { value: 'approved', label: '已认证' },
              { value: 'submitted', label: '审核中' },
              { value: 'rejected', label: '已驳回' },
              { value: 'none', label: '未提交' },
            ]}
          />
          <Button variant="secondary" onClick={loadUsers}>
            刷新
          </Button>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : users.length === 0 ? (
          <EmptyState title="暂无用户" description="当前筛选条件下没有找到用户" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">用户</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">联系方式</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">站点</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">认证状态</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">注册时间</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => {
                    const verify = user.verificationStatus
                      ? VERIFY_LABELS[user.verificationStatus]
                      : null;
                    const name = user.fullName || user.displayName || '未设置';
                    return (
                      <tr key={`${user.sourceSite}-${user.id}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {user.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-slate-500">{name[0] || '?'}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{name}</p>
                              {user.identityType && (
                                <p className="text-xs text-slate-500">{user.identityType}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            {user.contact && <div className="text-slate-700">{user.contact}</div>}
                            {user.email && (
                              <div className="text-slate-500 text-xs mt-0.5">{user.email}</div>
                            )}
                            {!user.contact && !user.email && <span className="text-slate-400">-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-slate-500">
                            {(user.sourceSite || '').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {verify ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${verify.color}`}>
                              {verify.label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">未提交</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => (window.location.href = `/users/${user.id}`)}
                          >
                            查看
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100">
                <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
