'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { api } from '@vetsphere/shared/services/api';
import { Order, Course } from '@vetsphere/shared/types';
import AdminLayout from '@/components/AdminLayout';
import OverviewTab from '@/components/OverviewTab';
import AIBrainCenterTab from '@/components/AIBrainCenterTab';
import CourseAuditTab from '@/components/CourseAuditTab';
import UserManagementTab from '@/components/UserManagementTab';
import FinancialReportTab from '@/components/FinancialReportTab';
import RefundManagementTab from '@/components/RefundManagementTab';
import CourseOrderTab from '@/components/CourseOrderTab';
import ProductManagementTab from '@/components/ProductManagementTab';
import ShopOrderTab from '@/components/ShopOrderTab';
import CourseProductLinkingTab from '@/components/CourseProductLinkingTab';
import InquiryManagementTab from '@/components/InquiryManagementTab';
import DoctorAuditTab from '@/components/DoctorAuditTab';

const TABS = ['概览', 'AI 大脑中枢', '医生审核', '全局课程管理', '课程订单', '商品管理', '商城订单', '询盘管理', '课程-设备关联', '用户管理', '财务报表', '退款管理'];

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const defaultStats = {
  users: { total: 0, newToday: 0, newThisWeek: 0, activeToday: 0 },
  orders: { total: 0, pending: 0, paid: 0, shipped: 0, revenue: 0, revenueThisMonth: 0 },
  courses: { total: 0, published: 0, pending: 0, enrollments: 0, enrollmentsThisMonth: 0 },
  products: { total: 0, published: 0, lowStock: 0 },
  community: { posts: 0, postsThisWeek: 0, pendingModeration: 0 },
};

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('概览');
  const [loading, setLoading] = useState(true);

  // Data state
  const [stats, setStats] = useState(defaultStats);
  const [courses, setCourses] = useState<Course[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [courseOrders, setCourseOrders] = useState<any[]>([]);
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, fetchedCourses, fetchedOrders, usersRes, fetchedCourseOrders, productsRes, shopOrdersRes] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.ok ? r.json() : defaultStats),
        api.getCourses(),
        api.getOrders(),
        fetch('/api/admin/recent-users').then(r => r.ok ? r.json() : []),
        api.getCourseOrders(),
        fetch('/api/admin/products').then(r => r.ok ? r.json() : []),
        fetch('/api/admin/shop-orders').then(r => r.ok ? r.json() : []),
      ]);

      setStats(statsRes);
      setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
      setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setCourseOrders(Array.isArray(fetchedCourseOrders) ? fetchedCourseOrders : []);
      setAdminProducts(Array.isArray(productsRes) ? productsRes : []);
      setShopOrders(Array.isArray(shopOrdersRes) ? shopOrdersRes : []);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Silent refresh for courses only (no loading screen)
  const refreshCourses = useCallback(async () => {
    try {
      const fetchedCourses = await api.getCourses();
      setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
    } catch (error) {
      console.error('Failed to refresh courses:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (user.role !== 'Admin') {
      router.push('/');
      return;
    }
    loadData();
  }, [user, router, loadData]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (!user || user.role !== 'Admin') {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="text-slate-500">正在验证权限...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">加载管理数据...</span>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      user={{ name: user.name, email: user.email, role: user.role }}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabs={TABS}
      onLogout={handleLogout}
    >
      {activeTab === '概览' && <OverviewTab stats={stats} />}
      {activeTab === 'AI 大脑中枢' && <AIBrainCenterTab />}
      {activeTab === '医生审核' && <DoctorAuditTab onRefresh={loadData} />}
      {activeTab === '全局课程管理' && <CourseAuditTab courses={courses} onRefresh={refreshCourses} />}
      {activeTab === '课程订单' && <CourseOrderTab orders={courseOrders} onRefresh={loadData} />}
      {activeTab === '商品管理' && <ProductManagementTab products={adminProducts} onRefresh={loadData} />}
      {activeTab === '商城订单' && <ShopOrderTab orders={shopOrders} onRefresh={loadData} />}
      {activeTab === '询盘管理' && <InquiryManagementTab onRefresh={loadData} />}
      {activeTab === '课程-设备关联' && <CourseProductLinkingTab />}
      {activeTab === '用户管理' && <UserManagementTab users={users} />}
      {activeTab === '财务报表' && <FinancialReportTab orders={orders} />}
      {activeTab === '退款管理' && <RefundManagementTab onRefresh={loadData} />}
    </AdminLayout>
  );
}
