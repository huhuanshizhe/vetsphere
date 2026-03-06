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

interface Consultation {
  id: string;
  doctor_id: string;
  client_id?: string;
  consultation_type: string;
  status: string;
  chief_complaint: string;
  diagnosis_result?: string;
  duration_minutes?: number;
  fee_amount?: number;
  scheduled_at?: string;
  completed_at?: string;
  created_at: string;
  doctor?: { full_name: string };
  client?: { owner_name: string; pet_name?: string };
}

const PAGE_SIZE = 20;

export default function DoctorConsultationsPage() {
  const supabase = createClient();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, revenue: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadConsultations();
  }, [filterStatus, filterType, searchKeyword, page]);

  async function loadConsultations() {
    setLoading(true);
    try {
      let query = supabase
        .from('consultations')
        .select(`
          id, doctor_id, client_id, consultation_type, status, chief_complaint,
          diagnosis_result, duration_minutes, fee_amount, scheduled_at, completed_at, created_at,
          doctor_profiles:doctor_id(full_name),
          doctor_clients:client_id(owner_name, pet_name)
        `, { count: 'exact' });

      if (filterStatus) query = query.eq('status', filterStatus);
      if (filterType) query = query.eq('consultation_type', filterType);
      if (searchKeyword) {
        query = query.or(`chief_complaint.ilike.%${searchKeyword}%,diagnosis_result.ilike.%${searchKeyword}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((c: any) => ({
        ...c,
        doctor: Array.isArray(c.doctor_profiles) ? c.doctor_profiles[0] : c.doctor_profiles,
        client: Array.isArray(c.doctor_clients) ? c.doctor_clients[0] : c.doctor_clients,
      }));

      setConsultations(mapped);
      setTotal(count || 0);

      // Stats
      const [totalRes, pendingRes, completedRes, revenueRes] = await Promise.all([
        supabase.from('consultations').select('*', { count: 'exact', head: true }),
        supabase.from('consultations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('consultations').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('consultations').select('fee_amount').eq('status', 'completed'),
      ]);

      const revenue = (revenueRes.data || []).reduce((sum, c) => sum + (c.fee_amount || 0), 0);
      setStats({
        total: totalRes.count || 0,
        pending: pendingRes.count || 0,
        completed: completedRes.count || 0,
        revenue,
      });
    } catch (error) {
      console.error('加载问诊数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const typeLabels: Record<string, string> = {
    online: '在线问诊', offline: '到院就诊', phone: '电话咨询', follow_up: '复诊',
  };

  const statusLabels: Record<string, string> = {
    pending: '待开始', in_progress: '进行中', completed: '已完成', cancelled: '已取消',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">问诊数据</h1>
        <p className="text-slate-500 mt-1">查看医生端的问诊咨询记录</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总问诊数" value={stats.total} />
        <StatCard label="待开始" value={stats.pending} />
        <StatCard label="已完成" value={stats.completed} />
        <StatCard label="总收入" value={`¥${stats.revenue.toLocaleString()}`} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索主诉、诊断结果..."
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
              { value: 'pending', label: '待开始' },
              { value: 'in_progress', label: '进行中' },
              { value: 'completed', label: '已完成' },
              { value: 'cancelled', label: '已取消' },
            ]}
          />
          <Select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部类型' },
              { value: 'online', label: '在线问诊' },
              { value: 'offline', label: '到院就诊' },
              { value: 'phone', label: '电话咨询' },
              { value: 'follow_up', label: '复诊' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : consultations.length === 0 ? (
          <EmptyState title="暂无问诊数据" description="当前筛选条件下没有找到问诊记录" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">主诉</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">医生</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">客户/宠物</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">类型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">时长</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">费用</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {consultations.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 text-sm max-w-[200px]">
                        <span className="line-clamp-2">{c.chief_complaint}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{c.doctor?.full_name || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-slate-600">{c.client?.owner_name || '-'}</div>
                          {c.client?.pet_name && <div className="text-xs text-slate-500">{c.client.pet_name}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                          {typeLabels[c.consultation_type] || c.consultation_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {c.duration_minutes ? `${c.duration_minutes}分钟` : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-900 text-sm">
                        {c.fee_amount ? `¥${c.fee_amount}` : '-'}
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                      <td className="px-6 py-4 text-slate-500 text-xs whitespace-nowrap">
                        {new Date(c.created_at).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200/50">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
