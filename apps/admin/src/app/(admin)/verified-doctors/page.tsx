'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  Button,
  Input,
  Select,
  LoadingState,
  EmptyState,
  Pagination,
} from '@/components/ui';
import { getAccessTokenSafe } from '@vetsphere/shared/services/supabase';
import { useSite } from '@/context/SiteContext';

interface VerifiedDoctor {
  verificationId: string;
  userId: string;
  siteCode: string;
  contact: string | null;
  email: string | null;
  displayName: string | null;
  realName: string | null;
  organizationName: string | null;
  positionTitle: string | null;
  verificationType: string;
  approvedLevel: string | null;
  reviewedAt: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  veterinarian: '执业兽医师',
  assistant_doctor: '助理兽医师',
  nurse_care: '护理/美容师',
  student: '在校学生',
  researcher_teacher: '科研/教育',
  industry_practitioner: '行业从业者',
  general_practitioner: 'General Practitioner',
  specialist: 'Specialist',
  clinic_owner: 'Clinic Owner',
  technician: 'Technician',
  other: '其他',
};

export default function VerifiedDoctorsPage() {
  const { currentSite } = useSite();
  const [doctors, setDoctors] = useState<VerifiedDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAccessTokenSafe();
      if (!token) return;

      const params = new URLSearchParams();
      params.set('site_code', currentSite || 'global');
      if (keyword) params.set('keyword', keyword);
      if (type) params.set('type', type);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/v1/admin/verified-doctors?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setDoctors(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load verified doctors:', e);
    } finally {
      setLoading(false);
    }
  }, [keyword, type, page, currentSite]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">已认证医生</h1>
        <p className="text-slate-500 text-sm mt-1">
          展示所有审核通过的医生用户
          {currentSite && currentSite !== 'global' && (
            <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded">
              {currentSite.toUpperCase()}
            </span>
          )}
        </p>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索姓名 / 单位 / 联系方式..."
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部认证类型' },
                ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
          </div>
          <Button variant="secondary" onClick={loadData}>
            刷新
          </Button>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState text="加载已认证医生..." />
        ) : doctors.length === 0 ? (
          <EmptyState
            icon="🩺"
            title="暂无已认证医生"
            description="还没有通过审核的医生用户"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      医生
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      联系方式
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      认证类型
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      单位 / 职位
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      站点
                    </th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      认证时间
                    </th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map((d) => (
                    <tr key={d.verificationId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">{d.realName || '-'}</p>
                        <p className="text-xs text-slate-500">{d.displayName || '未设置昵称'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{d.contact || d.email || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                          {TYPE_LABELS[d.verificationType] || d.verificationType}
                        </span>
                        {d.approvedLevel && (
                          <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 rounded">
                            {d.approvedLevel}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-700">{d.organizationName || '-'}</p>
                        <p className="text-xs text-slate-500">{d.positionTitle || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold text-slate-500">
                          {(d.siteCode || '').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-500">
                          {d.reviewedAt ? new Date(d.reviewedAt).toLocaleDateString('zh-CN') : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/verifications/${d.verificationId}`}
                          className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          查看认证
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 pb-4">
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>
    </>
  );
}
