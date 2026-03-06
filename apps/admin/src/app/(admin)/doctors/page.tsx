'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getAccessTokenSafe } from '@vetsphere/shared/services/supabase';
import {
  Card,
  Button,
  Input,
  Select,
  StatusBadge,
  LoadingState,
  EmptyState,
  StatCard,
  Pagination,
} from '@/components/ui';

interface DoctorItem {
  id: string;
  userId: string;
  realName: string;
  mobile?: string;
  displayName?: string;
  verificationType: string;
  organizationName: string;
  positionTitle: string;
  specialtyTags: string[];
  status: string;
  approvedLevel?: string;
  submittedAt: string | null;
  reviewedAt: string | null;
}

const PAGE_SIZE = 20;

// 认证类型标签
const typeLabels: Record<string, string> = {
  veterinarian: '执业兽医师',
  assistant_doctor: '助理兽医师',
  nurse_care: '护理/美容师',
  student: '在校学生',
  researcher_teacher: '科研/教育',
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, approved: 0 });
  const [filterType, setFilterType] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSafe();
      if (!token) return;

      const params = new URLSearchParams();
      params.set('status', 'approved');
      if (filterType) params.set('type', filterType);
      if (searchKeyword) params.set('mobile', searchKeyword);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/v1/admin/cn-verifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load doctors');

      const data = await res.json();
      setDoctors(data.items || []);
      setTotal(data.total || 0);
      setStats({
        total: data.total || 0,
        approved: data.total || 0,
      });
    } catch (error) {
      console.error('加载医生列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, searchKeyword, page]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">医生列表</h1>
        <p className="text-slate-500 mt-1">查看平台已认证通过的专业人员</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="已认证总数" value={stats.total} icon="✅" />
        <StatCard label="本页显示" value={doctors.length} icon="📋" />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索手机号..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              options={[
                { value: '', label: '全部类型' },
                { value: 'veterinarian', label: '执业兽医师' },
                { value: 'assistant_doctor', label: '助理兽医师' },
                { value: 'nurse_care', label: '护理/美容师' },
                { value: 'student', label: '在校学生' },
                { value: 'researcher_teacher', label: '科研/教育' },
              ]}
            />
          </div>
          <Button variant="secondary" onClick={loadDoctors}>
            刷新
          </Button>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState text="加载医生列表..." />
        ) : doctors.length === 0 ? (
          <EmptyState
            icon="🩺"
            title="暂无已认证医生"
            description={filterType ? '当前筛选条件下没有数据' : '还没有通过认证的专业人员'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      姓名
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      手机号
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      认证类型
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      单位/职位
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      专业方向
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      认证时间
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      状态
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex-shrink-0 flex items-center justify-center text-emerald-700 text-sm font-bold">
                            {doc.realName?.[0] || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{doc.realName || '-'}</p>
                            <p className="text-xs text-slate-500">{doc.displayName || '未设置昵称'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{doc.mobile || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                          {typeLabels[doc.verificationType] || doc.verificationType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{doc.organizationName || '-'}</p>
                        <p className="text-xs text-slate-500">{doc.positionTitle || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(doc.specialtyTags || []).slice(0, 2).map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded">
                              {s}
                            </span>
                          ))}
                          {(doc.specialtyTags || []).length > 2 && (
                            <span className="text-[10px] text-slate-500">+{doc.specialtyTags.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-500">
                          {doc.reviewedAt
                            ? new Date(doc.reviewedAt).toLocaleDateString('zh-CN')
                            : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.status as any} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/cn-verifications/${doc.id}`}
                          className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          查看详情
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 pb-4">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
