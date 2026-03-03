'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, StatCard, LoadingState } from '@/components/ui';

interface DashboardStats {
  // 用户相关
  totalUsers: number;
  totalDoctors: number;
  pendingVerifications: number;
  
  // 内容相关
  totalCourses: number;
  publishedCourses: number;
  totalProducts: number;
  publishedProducts: number;
  
  // 业务相关
  newLeads: number;
  totalLeads: number;
  
  // 今日数据
  todayUsers: number;
  todayLeads: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      
      // 并行加载所有统计
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
        supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
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
    create: '创建',
    update: '更新',
    delete: '删除',
    publish: '发布',
    offline: '下线',
    approve: '通过',
    reject: '拒绝',
    feature: '推荐',
    unfeature: '取消推荐',
  };

  const moduleLabels: Record<string, string> = {
    doctor_verify: '医生审核',
    user: '用户管理',
    cms: 'CMS内容',
    growth: '成长体系',
    course: '课程管理',
    product: '商品管理',
    route: '路由管理',
    system: '系统设置',
    lead: '线索管理',
  };

  if (loading) {
    return (
      <div className="p-8">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-white">仪表盘</h1>
        <p className="text-slate-400 mt-1">欢迎回来，这里是系统运营概览</p>
      </div>

      {/* 今日数据 */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">今日数据</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="新增用户" value={stats?.todayUsers || 0} />
          <StatCard label="新增线索" value={stats?.todayLeads || 0} />
          <StatCard label="待审核医生" value={stats?.pendingVerifications || 0} />
          <StatCard label="新线索" value={stats?.newLeads || 0} />
        </div>
      </div>

      {/* 用户数据 */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">用户概览</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="总用户数" value={stats?.totalUsers || 0} />
          <StatCard label="认证医生" value={stats?.totalDoctors || 0} />
          <StatCard label="待审核" value={stats?.pendingVerifications || 0} />
        </div>
      </div>

      {/* 内容数据 */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">内容概览</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="总课程数" value={stats?.totalCourses || 0} />
          <StatCard label="已发布课程" value={stats?.publishedCourses || 0} />
          <StatCard label="总商品数" value={stats?.totalProducts || 0} />
          <StatCard label="已发布商品" value={stats?.publishedProducts || 0} />
        </div>
      </div>

      {/* 业务数据 */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">业务概览</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <StatCard label="总线索数" value={stats?.totalLeads || 0} />
          <StatCard label="待跟进" value={stats?.newLeads || 0} />
        </div>
      </div>

      {/* 快捷入口 */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/doctor-verifications"
            className="block p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-emerald-500/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors">医生审核</h3>
            <p className="text-sm text-slate-500 mt-1">处理待审核申请</p>
          </a>
          
          <a
            href="/courses"
            className="block p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-emerald-500/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors">课程管理</h3>
            <p className="text-sm text-slate-500 mt-1">管理平台课程</p>
          </a>
          
          <a
            href="/products"
            className="block p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-emerald-500/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors">商品管理</h3>
            <p className="text-sm text-slate-500 mt-1">管理平台商品</p>
          </a>
          
          <a
            href="/leads"
            className="block p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 hover:border-emerald-500/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors">采购线索</h3>
            <p className="text-sm text-slate-500 mt-1">跟进客户需求</p>
          </a>
        </div>
      </div>

      {/* 最近操作 */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">最近操作</h2>
        <Card padding="none">
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              暂无操作记录
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {recentLogs.map((log) => (
                <div key={log.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm text-slate-400">
                      {log.admin_name?.[0] || '系'}
                    </div>
                    <div>
                      <div className="text-sm text-white">
                        <span className="text-slate-400">{log.admin_name || '系统'}</span>
                        <span className="mx-2">{actionLabels[log.action] || log.action}</span>
                        <span>{log.target_name || '-'}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {moduleLabels[log.module] || log.module}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(log.created_at).toLocaleString('zh-CN', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
