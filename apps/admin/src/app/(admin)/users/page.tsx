'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Button,
  Input,
  Select,
  StatusBadge,
  LoadingState,
  EmptyState,
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  role?: string;
  is_doctor: boolean;
  is_admin: boolean;
  created_at: string;
  last_login_at?: string;
}

const PAGE_SIZE = 20;

export default function UsersPage() {
  const supabase = createClient();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, doctors: 0, admins: 0, today: 0 });
  const [filterRole, setFilterRole] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadUsers();
  }, [filterRole, searchKeyword, page]);

  async function loadUsers() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);
      
      if (filterRole === 'doctor') {
        query = query.eq('is_doctor', true);
      } else if (filterRole === 'admin') {
        query = query.eq('is_admin', true);
      } else if (filterRole === 'user') {
        query = query.eq('is_doctor', false).eq('is_admin', false);
      }
      
      if (searchKeyword) {
        query = query.or(`full_name.ilike.%${searchKeyword}%,email.ilike.%${searchKeyword}%,phone.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setUsers(data || []);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const [totalRes, doctorsRes, adminsRes, todayRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_doctor', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_admin', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', todayStart.toISOString()),
    ]);
    
    setStats({
      total: totalRes.count || 0,
      doctors: doctorsRes.count || 0,
      admins: adminsRes.count || 0,
      today: todayRes.count || 0,
    });
  }

  function getUserRole(user: User) {
    if (user.is_admin) return { label: '管理员', color: 'bg-purple-500/20 text-purple-400' };
    if (user.is_doctor) return { label: '医生', color: 'bg-emerald-500/20 text-emerald-400' };
    return { label: '普通用户', color: 'bg-slate-500/20 text-slate-400' };
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">用户管理</h1>
        <p className="text-slate-400 mt-1">查看和管理平台用户</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总用户数" value={stats.total} />
        <StatCard label="认证医生" value={stats.doctors} />
        <StatCard label="管理员" value={stats.admins} />
        <StatCard label="今日新增" value={stats.today} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索姓名、邮箱、手机号..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <Select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部角色' },
              { value: 'doctor', label: '医生' },
              { value: 'admin', label: '管理员' },
              { value: 'user', label: '普通用户' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : users.length === 0 ? (
          <EmptyState title="暂无用户" description="当前筛选条件下没有找到用户" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">用户</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">联系方式</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">角色</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">注册时间</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">最近登录</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {users.map((user) => {
                    const role = getUserRole(user);
                    return (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg text-slate-400">{user.full_name?.[0] || user.email?.[0] || '?'}</span>
                              )}
                            </div>
                            <span className="font-medium text-white">{user.full_name || '未设置'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-slate-300">{user.email}</div>
                            {user.phone && <div className="text-slate-500">{user.phone}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${role.color}`}>
                            {role.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {new Date(user.created_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('zh-CN') : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="secondary" size="sm" onClick={() => window.location.href = `/users/${user.id}`}>
                            查看
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableContainer>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-700/50">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
