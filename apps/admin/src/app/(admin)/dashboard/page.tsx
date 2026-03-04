'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, StatCard, LoadingState, Tabs, QuickActionCard, ActivityItem } from '@/components/ui';
import { useSite } from '@/context/SiteContext';
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
  const supabase = createClient();
  const { user } = useAuth();
  const { currentSite, siteLabel } = useSite();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [currentSite]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      
      const [
        { count: totalUsers },
        { count: totalDoctors },
        { count: pendingVerifications },
        { count: totalCourses },
        { count: publishedCourses },
        { count: totalProducts },
        { count: publishedProducts },
        { count: newLeads },
        { count: totalLeads },
        { count: todayUsers },
        { count: todayLeads },
        { data: logs },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_doctor', true),
        supabase.from('doctor_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('courses').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('courses').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'published'),
        supabase.from('products').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'published'),
        supabase.from('purchase_leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('purchase_leads').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('purchase_leads').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
        supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(8),
      ]);
      
      setStats({
        totalUsers: totalUsers || 0,
        totalDoctors: totalDoctors || 0,
        pendingVerifications: pendingVerifications || 0,
        totalCourses: totalCourses || 0,
        publishedCourses: publishedCourses || 0,
        totalProducts: totalProducts || 0,
        publishedProducts: publishedProducts || 0,
        newLeads: newLeads || 0,
        totalLeads: totalLeads || 0,
        todayUsers: todayUsers || 0,
        todayLeads: todayLeads || 0,
      });
      
      setRecentLogs(logs || []);
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  }

  const actionLabels: Record<string, string> = {
    create: '创建', update: '更新', delete: '删除', publish: '发布',
    offline: '下线', approve: '通过', reject: '拒绝',
  };

  const moduleLabels: Record<string, string> = {
    doctor_verify: '医生审核', user: '用户', cms: '内容',
    course: '课程', product: '商品', system: '系统',
  };

  if (loading) {
    return <div className="p-8"><LoadingState /></div>;
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
