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
  StatCard,
} from '@/components/ui';
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import { useSite } from '@/context/SiteContext';

type IntegrityFilter =
  | 'missing_directory_user'
  | 'latest_status_not_approved'
  | 'historical_approved_superseded';

interface VerificationAnomalyItem {
  id: string;
  userId: string;
  siteCode: 'cn' | 'intl';
  status: string;
  verificationType: string;
  realName: string | null;
  organizationName: string | null;
  contact: string | null;
  displayName: string | null;
  submittedAt: string | null;
  latestVerificationStatus: string | null;
  integrityIssueCode: IntegrityFilter;
  hasDirectoryUser: boolean;
}

interface VerificationAnomaliesResponse {
  items: VerificationAnomalyItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  siteCode: 'cn' | 'intl' | 'global';
  stats: {
    total: number;
    pendingReview: number;
    approved: number;
    rejected: number;
    anomalies: number;
  };
}

const INTEGRITY_LABELS: Record<IntegrityFilter, { label: string; className: string }> = {
  missing_directory_user: {
    label: '缺少目录用户',
    className: 'bg-red-50 text-red-700',
  },
  latest_status_not_approved: {
    label: '最新状态已变更',
    className: 'bg-amber-50 text-amber-700',
  },
  historical_approved_superseded: {
    label: '历史 approved 旧记录',
    className: 'bg-slate-100 text-slate-700',
  },
};

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

export default function VerificationAnomaliesPage() {
  const { currentSite } = useSite();
  const [items, setItems] = useState<VerificationAnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [integrity, setIntegrity] = useState<IntegrityFilter>('missing_directory_user');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, pendingReview: 0, approved: 0, rejected: 0, anomalies: 0 });
  const pageSize = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('site_code', currentSite || 'global');
      params.set('integrity', integrity);
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      if (keyword) params.set('keyword', keyword);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const data = await apiFetch<VerificationAnomaliesResponse>(
        `/api/v1/admin/verification-anomalies?${params.toString()}`,
      );
      setItems(data.items || []);
      setTotal(data.total || 0);
      setStats(data.stats || { total: 0, pendingReview: 0, approved: 0, rejected: 0, anomalies: 0 });
    } catch (error) {
      console.error('Failed to load verification anomalies:', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [currentSite, integrity, status, type, keyword, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">认证异常</h1>
        <p className="text-slate-500 text-sm mt-1">
          这里集中查看被主名册隐藏的脏数据、孤儿认证和历史 approved 旧记录。
          {currentSite && currentSite !== 'global' && (
            <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded">
              {currentSite.toUpperCase()}
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="全部申请" value={stats.total} />
        <StatCard label="异常总数" value={stats.anomalies} />
        <StatCard label="待处理" value={stats.pendingReview} />
        <StatCard label="已通过" value={stats.approved} />
        <StatCard label="已驳回" value={stats.rejected} />
      </div>

      <Card className="mb-6">
        <div className="flex flex-col xl:flex-row gap-4">
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
          <div className="w-full xl:w-44">
            <Select
              value={integrity}
              onChange={(e) => {
                setIntegrity(e.target.value as IntegrityFilter);
                setPage(1);
              }}
              options={Object.entries(INTEGRITY_LABELS).map(([value, meta]) => ({ value, label: meta.label }))}
            />
          </div>
          <div className="w-full xl:w-40">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部状态' },
                { value: 'submitted', label: '待审核' },
                { value: 'under_review', label: '审核中' },
                { value: 'approved', label: '已通过' },
                { value: 'rejected', label: '已驳回' },
              ]}
            />
          </div>
          <div className="w-full xl:w-44">
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部类型' },
                ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
          </div>
          <Button variant="secondary" onClick={loadData}>刷新</Button>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState text="加载认证异常..." />
        ) : items.length === 0 ? (
          <EmptyState icon="🧹" title="暂无异常记录" description="当前筛选条件下没有发现认证异常" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">申请人</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">联系方式</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">认证类型</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">异常类型</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">当前 / 最新状态</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">提交时间</th>
                    <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const integrityMeta = INTEGRITY_LABELS[item.integrityIssueCode];
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{item.realName || '-'}</p>
                          <p className="text-xs text-slate-500">{item.displayName || '未设置昵称'}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">{item.siteCode.toUpperCase()}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.contact || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                            {TYPE_LABELS[item.verificationType] || item.verificationType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${integrityMeta.className}`}>
                            {integrityMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">当前：{item.status}</p>
                          <p className="text-xs text-slate-500">最新：{item.latestVerificationStatus || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('zh-CN') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3 text-xs">
                            {item.hasDirectoryUser && (
                              <Link href={`/users/${item.userId}?site=${item.siteCode}`} className="text-slate-500 hover:text-slate-900 transition-colors">
                                用户
                              </Link>
                            )}
                            <Link href={`/verifications/${item.id}`} className="text-slate-500 hover:text-slate-900 transition-colors">
                              详情
                            </Link>
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