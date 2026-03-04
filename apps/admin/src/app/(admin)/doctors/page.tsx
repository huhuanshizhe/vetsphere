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

interface Doctor {
  id: string;
  user_id: string;
  full_name: string;
  license_number?: string;
  specialty?: string;
  hospital?: string;
  department?: string;
  title?: string;
  verification_status: string;
  is_active: boolean;
  client_count?: number;
  created_at: string;
  profile?: { email: string; phone?: string; avatar_url?: string };
}

const PAGE_SIZE = 20;

export default function DoctorsPage() {
  const supabase = createClient();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, verified: 0, active: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadDoctors();
  }, [filterStatus, searchKeyword, page]);

  async function loadDoctors() {
    setLoading(true);
    try {
      let query = supabase
        .from('doctor_profiles')
        .select(`
          id, user_id, full_name, license_number, specialty, hospital, department, title,
          verification_status, is_active, client_count, created_at,
          profiles:user_id(email, phone, avatar_url)
        `, { count: 'exact' });

      if (filterStatus) query = query.eq('verification_status', filterStatus);
      if (searchKeyword) {
        query = query.or(`full_name.ilike.%${searchKeyword}%,hospital.ilike.%${searchKeyword}%,license_number.ilike.%${searchKeyword}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((d: any) => ({
        ...d,
        profile: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles,
      }));

      setDoctors(mapped);
      setTotal(count || 0);

      const [totalRes, verifiedRes, activeRes] = await Promise.all([
        supabase.from('doctor_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('doctor_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
        supabase.from('doctor_profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
      ]);
      setStats({
        total: totalRes.count || 0,
        verified: verifiedRes.count || 0,
        active: activeRes.count || 0,
      });
    } catch (error) {
      console.error('加载医生列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const statusLabels: Record<string, string> = {
    pending: '待审核', verified: '已认证', rejected: '已拒绝', suspended: '已暂停',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">医生列表</h1>
        <p className="text-slate-400 mt-1">查看和管理平台注册医生</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="总医生数" value={stats.total} />
        <StatCard label="已认证" value={stats.verified} />
        <StatCard label="活跃" value={stats.active} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索姓名、医院、执照号..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部状态' },
              { value: 'pending', label: '待审核' },
              { value: 'verified', label: '已认证' },
              { value: 'rejected', label: '已拒绝' },
              { value: 'suspended', label: '已暂停' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : doctors.length === 0 ? (
          <EmptyState title="暂无医生" description="当前筛选条件下没有找到医生记录" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">医生</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">医院/科室</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">专业</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">职称</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">客户数</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">认证状态</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center text-white text-sm font-bold">
                            {doc.full_name[0]}
                          </div>
                          <div>
                            <span className="text-white font-medium">{doc.full_name}</span>
                            <div className="text-xs text-slate-500">{doc.profile?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        <div>{doc.hospital || '-'}</div>
                        <div className="text-xs text-slate-500">{doc.department}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{doc.specialty || '-'}</td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{doc.title || '-'}</td>
                      <td className="px-6 py-4 text-slate-300 text-sm">{doc.client_count || 0}</td>
                      <td className="px-6 py-4"><StatusBadge status={doc.verification_status} /></td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="secondary" size="sm" onClick={() => window.location.href = `/doctor-verifications?doctor=${doc.id}`}>
                          查看详情
                        </Button>
                      </td>
                    </tr>
                  ))}
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
