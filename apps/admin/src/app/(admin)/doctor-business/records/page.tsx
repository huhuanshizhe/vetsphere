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

interface MedicalRecord {
  id: string;
  doctor_id: string;
  client_id?: string;
  pet_name?: string;
  pet_species?: string;
  diagnosis: string;
  symptoms?: string;
  treatment?: string;
  medications?: string;
  follow_up_notes?: string;
  record_date: string;
  created_at: string;
  doctor?: { full_name: string };
  client?: { owner_name: string };
}

const PAGE_SIZE = 20;

export default function DoctorRecordsPage() {
  const supabase = createClient();

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, thisMonth: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadRecords();
  }, [searchKeyword, page]);

  async function loadRecords() {
    setLoading(true);
    try {
      let query = supabase
        .from('medical_records')
        .select(`
          id, doctor_id, client_id, pet_name, pet_species, diagnosis, symptoms,
          treatment, medications, follow_up_notes, record_date, created_at,
          doctor_profiles:doctor_id(full_name),
          doctor_clients:client_id(owner_name)
        `, { count: 'exact' })
        .is('deleted_at', null);

      if (searchKeyword) {
        query = query.or(`diagnosis.ilike.%${searchKeyword}%,pet_name.ilike.%${searchKeyword}%,symptoms.ilike.%${searchKeyword}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('record_date', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((r: any) => ({
        ...r,
        doctor: Array.isArray(r.doctor_profiles) ? r.doctor_profiles[0] : r.doctor_profiles,
        client: Array.isArray(r.doctor_clients) ? r.doctor_clients[0] : r.doctor_clients,
      }));

      setRecords(mapped);
      setTotal(count || 0);

      // This month stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: monthCount } = await supabase
        .from('medical_records')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('record_date', monthStart);

      setStats({ total: count || 0, thisMonth: monthCount || 0 });
    } catch (error) {
      console.error('加载病历数据失败:', error);
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
        <h1 className="text-2xl font-bold text-slate-900">病历数据</h1>
        <p className="text-slate-500 mt-1">查看医生端的诊疗病历记录</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="总病历数" value={stats.total} />
        <StatCard label="本月新增" value={stats.thisMonth} />
      </div>

      <Card>
        <Input
          placeholder="搜索诊断、宠物名、症状..."
          value={searchKeyword}
          onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        />
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : records.length === 0 ? (
          <EmptyState title="暂无病历数据" description="当前筛选条件下没有找到病历记录" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">就诊日期</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">宠物</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">主人</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">诊断</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">症状</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">治疗方案</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">主治医生</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 text-sm whitespace-nowrap">
                        {new Date(record.record_date).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-slate-900">{record.pet_name || '-'}</div>
                          <div className="text-xs text-slate-500">{speciesLabels[record.pet_species || ''] || record.pet_species}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{record.client?.owner_name || '-'}</td>
                      <td className="px-6 py-4 text-slate-900 text-sm max-w-[200px]">
                        <span className="line-clamp-2">{record.diagnosis}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm max-w-[200px]">
                        <span className="line-clamp-1">{record.symptoms || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm max-w-[200px]">
                        <span className="line-clamp-1">{record.treatment || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{record.doctor?.full_name || '-'}</td>
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
