'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';

interface DashboardStats {
  users: { total: number; newToday: number; newThisWeek: number; activeToday: number };
  orders: { total: number; pending: number; paid: number; shipped: number; revenue: number; revenueThisMonth: number };
  courses: { total: number; published: number; enrollments: number; enrollmentsThisMonth: number };
  products: { total: number; published: number; lowStock: number };
  community: { posts: number; postsThisWeek: number; pendingModeration: number };
}

interface RecentOrder {
  id: string;
  customerEmail: string;
  amount: number;
  status: string;
  date: string;
}

interface RecentUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

const AdminDashboardClient: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { locale } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'users' | 'moderation'>('overview');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${locale}/sys-admin`);
      return;
    }
    if (user?.role !== 'Admin') {
      router.push(`/${locale}`);
      return;
    }
    loadDashboardData();
  }, [isAuthenticated, user, locale]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/recent-orders'),
        fetch('/api/admin/recent-users')
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      } else {
        // Fallback mock data for demo
        setStats({
          users: { total: 156, newToday: 3, newThisWeek: 12, activeToday: 45 },
          orders: { total: 89, pending: 5, paid: 72, shipped: 12, revenue: 458900, revenueThisMonth: 128500 },
          courses: { total: 24, published: 18, enrollments: 234, enrollmentsThisMonth: 42 },
          products: { total: 156, published: 142, lowStock: 8 },
          community: { posts: 567, postsThisWeek: 34, pendingModeration: 3 }
        });
      }

      if (ordersRes.ok) {
        setRecentOrders(await ordersRes.json());
      } else {
        setRecentOrders([
          { id: 'ORD-001', customerEmail: 'doctor@clinic.com', amount: 12800, status: 'Paid', date: '2026-02-27' },
          { id: 'ORD-002', customerEmail: 'vet@hospital.cn', amount: 5600, status: 'Pending', date: '2026-02-27' },
          { id: 'ORD-003', customerEmail: 'zhang@pet.com', amount: 28000, status: 'Shipped', date: '2026-02-26' },
        ]);
      }

      if (usersRes.ok) {
        setRecentUsers(await usersRes.json());
      } else {
        setRecentUsers([
          { id: '1', email: 'newdoctor@clinic.com', name: 'Dr. Wang', role: 'User', createdAt: '2026-02-27' },
          { id: '2', email: 'vet@hospital.cn', name: 'Dr. Chen', role: 'User', createdAt: '2026-02-27' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (!isAuthenticated || user?.role !== 'Admin') {
    return (
      <div className="min-h-screen bg-slate-50 pt-32 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-vs border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Admin Dashboard</h1>
              <p className="text-slate-500 mt-1">Welcome back, {user?.name || user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href={`/${locale}/sys-admin/moderation`}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Content Moderation
              </Link>
              <button 
                onClick={loadDashboardData}
                className="px-4 py-2 bg-vs text-white rounded-xl text-sm font-bold hover:bg-vs/90 transition"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'orders', label: 'Orders', icon: '📦' },
            { id: 'users', label: 'Users', icon: '👥' },
            { id: 'moderation', label: 'Moderation', icon: '🛡️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-vs text-white shadow-lg'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-vs border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl">👥</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        +{stats.users.newToday} today
                      </span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{stats.users.total}</p>
                    <p className="text-sm text-slate-500 font-medium">Total Users</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl">💰</span>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        This Month
                      </span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">¥{(stats.orders.revenueThisMonth / 1000).toFixed(1)}k</p>
                    <p className="text-sm text-slate-500 font-medium">Revenue</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl">📚</span>
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        +{stats.courses.enrollmentsThisMonth} enrolled
                      </span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{stats.courses.enrollments}</p>
                    <p className="text-sm text-slate-500 font-medium">Course Enrollments</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl">🛡️</span>
                      {stats.community.pendingModeration > 0 && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                          {stats.community.pendingModeration} pending
                        </span>
                      )}
                    </div>
                    <p className="text-3xl font-black text-slate-900">{stats.community.posts}</p>
                    <p className="text-sm text-slate-500 font-medium">Community Posts</p>
                  </div>
                </div>

                {/* Secondary Stats Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Orders Summary */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-4">Orders Summary</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Total Orders</span>
                        <span className="font-bold">{stats.orders.total}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Pending</span>
                        <span className="font-bold text-amber-600">{stats.orders.pending}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Paid</span>
                        <span className="font-bold text-emerald-600">{stats.orders.paid}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-600">Shipped</span>
                        <span className="font-bold text-blue-600">{stats.orders.shipped}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">Total Revenue</p>
                      <p className="text-2xl font-black text-vs">¥{stats.orders.revenue.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* User Activity */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-4">User Activity</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Active Today</span>
                        <span className="font-bold text-emerald-600">{stats.users.activeToday}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">New Today</span>
                        <span className="font-bold">{stats.users.newToday}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-600">New This Week</span>
                        <span className="font-bold">{stats.users.newThisWeek}</span>
                      </div>
                    </div>
                    <div className="mt-6">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                        <span>Weekly Growth</span>
                        <span>{((stats.users.newThisWeek / stats.users.total) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-vs rounded-full transition-all"
                          style={{ width: `${Math.min((stats.users.newThisWeek / stats.users.total) * 100 * 5, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Inventory Alert */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-4">Inventory Status</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Total Products</span>
                        <span className="font-bold">{stats.products.total}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Published</span>
                        <span className="font-bold text-emerald-600">{stats.products.published}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-600">Low Stock Alert</span>
                        <span className={`font-bold ${stats.products.lowStock > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {stats.products.lowStock}
                        </span>
                      </div>
                    </div>
                    {stats.products.lowStock > 0 && (
                      <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
                        <p className="text-sm text-red-700 font-medium">
                          ⚠️ {stats.products.lowStock} products need restocking
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Recent Orders */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-slate-900">Recent Orders</h3>
                      <button 
                        onClick={() => setActiveTab('orders')}
                        className="text-sm font-bold text-vs hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-3">
                      {recentOrders.slice(0, 5).map(order => (
                        <div key={order.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                          <div>
                            <p className="font-mono text-sm font-bold text-slate-900">{order.id}</p>
                            <p className="text-xs text-slate-500">{order.customerEmail}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">¥{order.amount.toLocaleString()}</p>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Users */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-black text-slate-900">New Users</h3>
                      <button 
                        onClick={() => setActiveTab('users')}
                        className="text-sm font-bold text-vs hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-3">
                      {recentUsers.slice(0, 5).map(u => (
                        <div key={u.id} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                            {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 text-sm">{u.name || 'New User'}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                          <span className="text-xs text-slate-400">{u.createdAt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-lg font-black text-slate-900">All Orders</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 font-mono text-sm font-bold">{order.id}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{order.customerEmail}</td>
                          <td className="px-6 py-4 font-bold">¥{order.amount.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{order.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h3 className="text-lg font-black text-slate-900">User Management</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold">
                                {u.name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                              </div>
                              <span className="font-bold text-sm">{u.name || 'User'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{u.createdAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Moderation Tab */}
            {activeTab === 'moderation' && stats && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="text-3xl mb-2">📝</div>
                    <p className="text-3xl font-black text-slate-900">{stats.community.posts}</p>
                    <p className="text-sm text-slate-500">Total Posts</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="text-3xl mb-2">📅</div>
                    <p className="text-3xl font-black text-slate-900">{stats.community.postsThisWeek}</p>
                    <p className="text-sm text-slate-500">Posts This Week</p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm bg-amber-50">
                    <div className="text-3xl mb-2">⏳</div>
                    <p className="text-3xl font-black text-amber-700">{stats.community.pendingModeration}</p>
                    <p className="text-sm text-amber-600">Pending Review</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-4">Content Moderation Queue</h3>
                  {stats.community.pendingModeration === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">✅</div>
                      <p className="text-slate-500 font-medium">All content has been reviewed</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Link 
                        href={`/${locale}/sys-admin/moderation`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-vs text-white rounded-xl font-bold hover:bg-vs/90 transition"
                      >
                        Review {stats.community.pendingModeration} Item(s)
                        <span>→</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardClient;
