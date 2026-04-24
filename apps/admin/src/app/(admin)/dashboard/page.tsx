'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import { Card, StatCard, Tabs, QuickActionCard, ActivityItem } from '@/components/ui';
import { useSite } from '@/context/SiteContext';
import { useGlobalToast } from '@/context/ToastContext';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import {
  ClipboardCheck,
  BookOpen,
  Package,
  Users,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalDoctors: number;
  pendingVerifications: number;
  totalCourses: number;
  publishedCourses: number;
  totalProducts: number;
  publishedProducts: number;
  newLeads: number;
  totalLeads: number;
  todayUsers: number;
  todayLeads: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentSite, siteLabel } = useSite();
  const toast = useGlobalToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch<{ stats: DashboardStats; recentLogs: any[] }>(
          `/api/admin/dashboard-stats?site_code=${currentSite}`
        );
        if (aborted) return;
        setStats(data.stats);
        setRecentLogs(data.recentLogs || []);
      } catch (err) {
        if (aborted) return;
        toast.error(`加载仪表盘数据失败：${getErrorMessage(err)}`);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [currentSite, toast]);

  const actionLabels: Record<string, string> = {
    create: '创建', update: '更新', delete: '删除', publish: '发布',
    offline: '下线', approve: '通过', reject: '拒绝',
  };

  const moduleLabels: Record<string, string> = {
    doctor_verify: '医生审核', user: '用户', cms: '内容',
    course: '课程', product: '商品', system: '系统',
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        {/* skeleton: 欢迎区 */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-2">
            <div className="h-7 w-64 rounded-md bg-slate-200 animate-pulse" />
            <div className="h-4 w-80 rounded bg-slate-100 animate-pulse" />
          </div>
          <div className="lg:w-80 h-24 rounded-xl bg-slate-100 animate-pulse" />
        </div>
        {/* skeleton: 4个 KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-white border border-slate-200 p-4 flex flex-col gap-3"
            >
              <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
              <div className="h-8 w-16 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* skeleton: 主区 */}
        <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div className="space-y-6">
      {/* 1. 欢迎区 + 优先任务 */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting()}，{user?.name || '管理员'}
          </h1>
          <p className="text-slate-500 mt-1">
            欢迎回到 VetSphere 运营中枢，当前管理 {siteLabel}
          </p>
        </div>
        
        {/* 优先任务提示 */}
        {(stats?.pendingVerifications || 0) > 0 && (
          <Card className="lg:w-80 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">待处理任务</h3>
                <p className="text-sm text-amber-700 mt-0.5">
                  {stats?.pendingVerifications} 位医生等待审核
                </p>
                <Link 
                  href="/doctor-verifications" 
                  className="text-sm font-medium text-amber-700 hover:text-amber-900 mt-2 inline-block"
                >
                  立即处理 →
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 2. 关键指标 - 4个KPI卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="今日新用户" 
          value={stats?.todayUsers || 0} 
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard 
          label="待审核医生" 
          value={stats?.pendingVerifications || 0} 
          icon={<ClipboardCheck className="w-5 h-5" />}
          color="amber"
        />
        <StatCard 
          label="已发布课程" 
          value={stats?.publishedCourses || 0} 
          icon={<BookOpen className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard 
          label="新采购线索" 
          value={stats?.newLeads || 0} 
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* 3. 业务视图切换 Tabs */}
      <Card>
        <Tabs
          tabs={[
            { key: 'overview', label: '总览' },
            { key: 'courses', label: '课程' },
            { key: 'products', label: '商品' },
            { key: 'users', label: '用户' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {activeTab === 'overview' && (
            <>
              <StatCard label="总用户" value={stats?.totalUsers || 0} compact />
              <StatCard label="认证医生" value={stats?.totalDoctors || 0} compact />
              <StatCard label="总课程" value={stats?.totalCourses || 0} compact />
              <StatCard label="总商品" value={stats?.totalProducts || 0} compact />
            </>
          )}
          {activeTab === 'courses' && (
            <>
              <StatCard label="总课程" value={stats?.totalCourses || 0} compact />
              <StatCard label="已发布" value={stats?.publishedCourses || 0} compact />
              <StatCard label="草稿" value={(stats?.totalCourses || 0) - (stats?.publishedCourses || 0)} compact />
              <StatCard label="发布率" value={`${stats?.totalCourses ? Math.round((stats.publishedCourses / stats.totalCourses) * 100) : 0}%`} compact />
            </>
          )}
          {activeTab === 'products' && (
            <>
              <StatCard label="总商品" value={stats?.totalProducts || 0} compact />
              <StatCard label="已发布" value={stats?.publishedProducts || 0} compact />
              <StatCard label="草稿" value={(stats?.totalProducts || 0) - (stats?.publishedProducts || 0)} compact />
              <StatCard label="发布率" value={`${stats?.totalProducts ? Math.round((stats.publishedProducts / stats.totalProducts) * 100) : 0}%`} compact />
            </>
          )}
          {activeTab === 'users' && (
            <>
              <StatCard label="总用户" value={stats?.totalUsers || 0} compact />
              <StatCard label="认证医生" value={stats?.totalDoctors || 0} compact />
              <StatCard label="今日新增" value={stats?.todayUsers || 0} compact />
              <StatCard label="待审核" value={stats?.pendingVerifications || 0} compact />
            </>
          )}
        </div>
      </Card>

      {/* 4. 快捷操作 + 5. 最近动态 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* 快捷操作 */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">快捷操作</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <QuickActionCard
              href="/doctor-verifications"
              icon={<ClipboardCheck className="w-5 h-5" />}
              title="医生审核"
              description="处理待审核申请"
              color="emerald"
            />
            <QuickActionCard
              href="/courses"
              icon={<BookOpen className="w-5 h-5" />}
              title="课程管理"
              description="管理平台课程"
              color="blue"
            />
            <QuickActionCard
              href="/products"
              icon={<Package className="w-5 h-5" />}
              title="商品管理"
              description="管理平台商品"
              color="purple"
            />
            <QuickActionCard
              href="/leads"
              icon={<Users className="w-5 h-5" />}
              title="采购线索"
              description="跟进客户需求"
              color="amber"
            />
            <QuickActionCard
              href="/growth-tracks"
              icon={<TrendingUp className="w-5 h-5" />}
              title="成长体系"
              description="管理成长方向"
              color="cyan"
            />
            <QuickActionCard
              href="/analytics"
              icon={<TrendingUp className="w-5 h-5" />}
              title="数据统计"
              description="查看运营数据"
              color="slate"
            />
          </div>
        </div>

        {/* 最近动态 */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">最近动态</h2>
          <Card padding="none" className="divide-y divide-slate-100">
            {recentLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                暂无操作记录
              </div>
            ) : (
              recentLogs.slice(0, 6).map((log) => (
                <ActivityItem
                  key={log.id}
                  icon={log.admin_name?.[0] || '系'}
                  title={`${log.admin_name || '系统'} ${actionLabels[log.action] || log.action}`}
                  description={`${moduleLabels[log.module] || log.module} · ${log.target_name || '-'}`}
                  time={new Date(log.created_at).toLocaleString('zh-CN', {
                    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                />
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
