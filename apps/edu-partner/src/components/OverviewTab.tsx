'use client';

import KPICard from './KPICard';
import type { Course, Order } from '@vetsphere/shared/types';

interface OverviewTabProps {
  courses: Course[];
  orders: Order[];
  onAddCourse: () => void;
}

export default function OverviewTab({ courses, orders, onAddCourse }: OverviewTabProps) {
  // Calculate statistics
  const publishedCourses = courses.filter(c => c.status === 'Published').length;
  const pendingCourses = courses.filter(c => c.status === 'Pending').length;
  const totalEnrollments = courses.reduce((sum, c) => sum + (c.enrolledCount || 0), 0);
  
  // Calculate revenue from course orders
  const courseOrders = orders.filter(o => o.items.some(item => item.type === 'course'));
  const totalRevenue = courseOrders.reduce((sum, order) => {
    const courseItems = order.items.filter(item => item.type === 'course');
    return sum + courseItems.reduce((s, item) => s + (item.price * item.quantity), 0);
  }, 0);

  // Recent enrollments (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentOrders = courseOrders.filter(o => new Date(o.date) >= weekAgo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">教学概览</h1>
          <p className="text-gray-400 mt-1">管理您的课程和学员</p>
        </div>
        <button onClick={onAddCourse} className="edu-button flex items-center gap-2">
          <span>➕</span>
          <span>发布新课程</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="已发布课程"
          value={publishedCourses}
          subtitle={`${pendingCourses} 个待审核`}
          color="purple"
          icon="📚"
        />
        <KPICard
          label="总学员数"
          value={totalEnrollments}
          subtitle={`本周 +${recentOrders.length}`}
          color="green"
          icon="👥"
        />
        <KPICard
          label="总收入"
          value={`¥${totalRevenue.toLocaleString()}`}
          color="amber"
          icon="💰"
        />
        <KPICard
          label="课程订单"
          value={courseOrders.length}
          subtitle="已完成支付"
          color="default"
          icon="📋"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="edu-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">最近报名</h3>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">暂无最近报名</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.slice(0, 5).map((order, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-purple-500/10 last:border-0">
                  <div>
                    <p className="text-white text-sm">{order.customerName}</p>
                    <p className="text-gray-500 text-xs">{order.customerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-purple-400 text-sm">¥{order.totalAmount}</p>
                    <p className="text-gray-500 text-xs">{new Date(order.date).toLocaleDateString('zh-CN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Course Status Overview */}
        <div className="edu-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">课程状态</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">已发布</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-purple-500/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${courses.length ? (publishedCourses / courses.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-white text-sm w-8">{publishedCourses}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">待审核</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-amber-500/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${courses.length ? (pendingCourses / courses.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-white text-sm w-8">{pendingCourses}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">已拒绝</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-red-500/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${courses.length ? (courses.filter(c => c.status === 'Rejected').length / courses.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-white text-sm w-8">{courses.filter(c => c.status === 'Rejected').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
