'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import { useSite } from '@/context/SiteContext';

interface VerifiedDoctor {
  verificationId: string | null;
  userId: string;
  siteCode: 'cn' | 'intl';
  sourceSite: 'cn' | 'intl';
  contact: string | null;
  email: string | null;
  displayName: string | null;
  fullName: string | null;
  realName: string | null;
  organizationName: string | null;
  positionTitle: string | null;
  verificationType: string | null;
  approvedLevel: string | null;
  reviewedAt: string | null;
}

interface VerifiedDoctorsResponse {
  items: VerifiedDoctor[];
  total: number;
  page: number;
  pageSize: number;
  siteCode: 'cn' | 'intl' | 'global';
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
      const params = new URLSearchParams();
      params.set('site_code', currentSite || 'global');
      if (keyword) params.set('keyword', keyword);
      if (type) params.set('type', type);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const data = await apiFetch<VerifiedDoctorsResponse>(
        `/api/v1/admin/verified-doctors?${params.toString()}`,
      );
      setDoctors(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load verified doctors:', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [currentSite, keyword, type, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">已认证医生</h1>
        <p className="text-slate-500 text-sm mt-1">
          只展示统一用户目录中、最新认证状态仍为已通过的真实医生名册
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
          <LoadingState text="加载已认证医生名册..." />
        ) : doctors.length === 0 ? (
          <EmptyState
            icon="🩺"
            title="暂无已认证医生"
            description="当前目录语义下没有已通过认证的真实医生用户"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">医生</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">联系方式</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">认证类型</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">单位 / 职位</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">站点</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">最新通过时间</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map((doctor) => {
                    const name = doctor.realName || doctor.fullName || doctor.displayName || '-';
                    return (
                      <tr key={`${doctor.siteCode}-${doctor.userId}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{name}</p>
                          <p className="text-xs text-slate-500">{doctor.displayName || '未设置昵称'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{doctor.contact || doctor.email || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                            {doctor.verificationType ? TYPE_LABELS[doctor.verificationType] || doctor.verificationType : '-'}
                          </span>
                          {doctor.approvedLevel && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 rounded">
                              {doctor.approvedLevel}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{doctor.organizationName || '-'}</p>
                          <p className="text-xs text-slate-500">{doctor.positionTitle || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold text-slate-500">{doctor.siteCode.toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-500">
                            {doctor.reviewedAt ? new Date(doctor.reviewedAt).toLocaleDateString('zh-CN') : '-'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3 text-xs">
                            <Link href={`/users/${doctor.userId}?site=${doctor.siteCode}`} className="text-slate-500 hover:text-slate-900 transition-colors">
                              用户详情
                            </Link>
                            {doctor.verificationId && (
                              <Link href={`/verifications/${doctor.verificationId}`} className="text-slate-500 hover:text-slate-900 transition-colors">
                                认证详情
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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