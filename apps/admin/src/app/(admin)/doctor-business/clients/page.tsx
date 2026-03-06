'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Button,
  Input,
  Select,
  LoadingState,
  EmptyState,
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface ClientRecord {
  id: string;
  doctor_id: string;
  owner_name: string;
  pet_name?: string;
  pet_species?: string;
  pet_breed?: string;
  phone?: string;
  notes?: string;
  visit_count: number;
  last_visit_at?: string;
  created_at: string;
  doctor?: { full_name: string };
}

const PAGE_SIZE = 20;

export default function DoctorClientsPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadClients();
  }, [searchKeyword, page]);

  async function loadClients() {
    setLoading(true);
    try {
      let query = supabase
        .from('doctor_clients')
        .select(`
          id, doctor_id, owner_name, pet_name, pet_species, pet_breed,
          phone, notes, visit_count, last_visit_at, created_at,
          doctor_profiles:doctor_id(full_name)
        `, { count: 'exact' })
        .is('deleted_at', null);

      if (searchKeyword) {
        query = query.or(`owner_name.ilike.%${searchKeyword}%,pet_name.ilike.%${searchKeyword}%,phone.ilike.%${searchKeyword}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((c: any) => ({
        ...c,
        doctor: Array.isArray(c.doctor_profiles) ? c.doctor_profiles[0] : c.doctor_profiles,
      }));

      setClients(mapped);
      setTotal(count || 0);
      setStats({ total: count || 0 });
    } catch (error) {
      console.error('加载客户数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const speciesLabels: Record<string, string> = {
    dog: '犬', cat: '猫', rabbit: '兔', bird: '禽', reptile: '爬行', other: '其他',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">客户数据</h1>
        <p className="text-slate-500 mt-1">查看医生端的客户（宠物主人）记录</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <StatCard label="总客户数" value={stats.total} />
      </div>

      <Card>
        <Input
          placeholder="搜索宠物主人、宠物名、电话..."
          value={searchKeyword}
          onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        />
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : clients.length === 0 ? (
          <EmptyState title="暂无客户数据" description="当前筛选条件下没有找到客户记录" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">宠物主人</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">宠物</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">联系方式</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">就诊医生</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">就诊次数</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">最近就诊</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">注册时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-medium">{client.owner_name}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-slate-600">{client.pet_name || '-'}</div>
                          <div className="text-xs text-slate-500">
                            {speciesLabels[client.pet_species || ''] || client.pet_species || '-'}
                            {client.pet_breed && ` / ${client.pet_breed}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{client.phone || '-'}</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{client.doctor?.full_name || '-'}</td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{client.visit_count || 0}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {client.last_visit_at ? new Date(client.last_visit_at).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(client.created_at).toLocaleDateString('zh-CN')}
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
