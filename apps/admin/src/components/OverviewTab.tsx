'use client';

import React from 'react';
import KPICard from './KPICard';

interface Stats {
  users: { total: number; newToday: number; newThisWeek: number; activeToday: number };
  orders: { total: number; pending: number; paid: number; shipped: number; revenue: number; revenueThisMonth: number };
  courses: { total: number; published: number; pending: number; enrollments: number; enrollmentsThisMonth: number };
  products: { total: number; published: number; lowStock: number };
  community: { posts: number; postsThisWeek: number; pendingModeration: number };
}

interface OverviewTabProps {
  stats: Stats;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          label="平台总用户"
          value={stats.users.total.toLocaleString()}
          subtitle={`今日新增 ${stats.users.newToday}`}
          color="emerald"
        />
        <KPICard
          label="总收入"
          value={`¥${stats.orders.revenue.toLocaleString()}`}
          subtitle={`本月 ¥${stats.orders.revenueThisMonth.toLocaleString()}`}
          color="emerald"
        />
        <KPICard
          label="总订单"
          value={stats.orders.total.toLocaleString()}
          subtitle={`待处理 ${stats.orders.pending}`}
          color="amber"
        />
        <KPICard
          label="待审核课程"
          value={stats.courses.pending}
          subtitle={`共 ${stats.courses.total} 门课程`}
          color={stats.courses.pending > 0 ? 'amber' : 'default'}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          label="已上架课程"
          value={stats.courses.published}
          subtitle={`总报名 ${stats.courses.enrollments}`}
        />
        <KPICard
          label="本周新用户"
          value={stats.users.newThisWeek}
        />
        <KPICard
          label="商品总数"
          value={stats.products.total}
          subtitle={stats.products.lowStock > 0 ? `${stats.products.lowStock} 件低库存` : '库存充足'}
          color={stats.products.lowStock > 0 ? 'red' : 'default'}
        />
        <KPICard
          label="社区帖子"
          value={stats.community.posts}
          subtitle={`本周新增 ${stats.community.postsThisWeek}`}
        />
      </div>

      {/* Quick status */}
      <div className="bg-black/20 border border-white/5 rounded-2xl p-5 sm:p-6">
        <h3 className="text-sm font-bold text-white mb-4">系统状态</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-slate-400">数据库连接正常</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-slate-400">AI 服务运行中</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${stats.community.pendingModeration > 0 ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
            <span className="text-sm text-slate-400">
              待审内容 {stats.community.pendingModeration} 条
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
