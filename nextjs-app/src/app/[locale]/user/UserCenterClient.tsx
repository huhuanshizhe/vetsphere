'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/services/api';
import { Order, CourseEnrollment } from '@/types';
import Link from 'next/link';

type TabType = 'profile' | 'orders' | 'courses' | 'points' | 'settings';

const UserCenterClient: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { t, locale } = useLanguage();
  const { addNotification } = useNotification();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [pointsData, setPointsData] = useState({ points: 0, level: 'Resident' });
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    hospital: '',
    specialty: '',
    phone: '',
    bio: ''
  });

  // Tracking state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${locale}/auth`);
      return;
    }
    loadUserData();
  }, [isAuthenticated, locale]);

  const loadUserData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const [fetchedOrders, fetchedEnrollments, fetchedPoints, fetchedHistory, fetchedProfile] = await Promise.all([
        api.getOrders(user.email),
        api.getEnrollments(user.id),
        api.fetchUserPoints(user.id),
        api.getPointsHistory(user.id),
        api.getUserProfile(user.id)
      ]);

      setOrders(fetchedOrders);
      setEnrollments(fetchedEnrollments);
      setPointsData(fetchedPoints);
      setPointsHistory(fetchedHistory);
      
      // Load profile data into form
      if (fetchedProfile) {
        setProfileForm({
          name: fetchedProfile.displayName || user.name || '',
          hospital: fetchedProfile.hospital || '',
          specialty: fetchedProfile.specialty || '',
          phone: fetchedProfile.phone || '',
          bio: fetchedProfile.bio || ''
        });
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push(`/${locale}`);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    
    const success = await api.saveUserProfile(user.id, {
      displayName: profileForm.name,
      hospital: profileForm.hospital,
      specialty: profileForm.specialty,
      phone: profileForm.phone,
      bio: profileForm.bio
    });

    if (success) {
      addNotification({
        id: `profile-${Date.now()}`,
        type: 'system',
        title: 'Profile Updated',
        message: 'Your profile has been saved successfully.',
        read: false,
        timestamp: new Date()
      });
    } else {
      addNotification({
        id: `profile-err-${Date.now()}`,
        type: 'system',
        title: 'Save Failed',
        message: 'Failed to save profile. Please try again.',
        read: false,
        timestamp: new Date()
      });
    }
    setIsEditing(false);
  };

  // Load tracking info for an order
  const loadTracking = async (order: Order) => {
    if (selectedOrder?.id === order.id && trackingData) {
      // Toggle off if clicking same order
      setSelectedOrder(null);
      setTrackingData(null);
      return;
    }
    
    setSelectedOrder(order);
    setTrackingLoading(true);
    setTrackingData(null);
    
    try {
      const response = await fetch(`/api/orders/${order.id}/tracking`);
      if (response.ok) {
        const data = await response.json();
        setTrackingData(data);
      }
    } catch (error) {
      console.error('Failed to load tracking:', error);
    } finally {
      setTrackingLoading(false);
    }
  };

  const getTrackingStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'pending': '待发货',
      'shipped': '已发货',
      'in_transit': '运输中',
      'out_for_delivery': '派送中',
      'delivered': '已签收',
      'exception': '异常'
    };
    return labels[status] || status;
  };

  const getTrackingStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-500';
      case 'out_for_delivery': return 'bg-blue-500';
      case 'in_transit': return 'bg-cyan-500';
      case 'shipped': return 'bg-indigo-500';
      case 'exception': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'profile', label: '个人资料', icon: '👤' },
    { id: 'orders', label: '我的订单', icon: '📦' },
    { id: 'courses', label: '我的课程', icon: '📚' },
    { id: 'points', label: '积分记录', icon: '⭐' },
    { id: 'settings', label: '账户设置', icon: '⚙️' }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Master': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'Expert': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'Senior': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'Specialist': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      default: return 'bg-slate-200 text-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': case 'paid': case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'Pending': case 'pending': return 'bg-amber-100 text-amber-700';
      case 'Shipped': return 'bg-blue-100 text-blue-700';
      case 'Cancelled': case 'refunded': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-50 pt-32 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-vs border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-vs to-emerald-600 flex items-center justify-center text-white text-3xl font-black shadow-lg">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-slate-900">{user.name || user.email?.split('@')[0]}</h1>
              <p className="text-slate-500">{user.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getLevelColor(pointsData.level)}`}>
                  {pointsData.level}
                </span>
                <span className="text-sm text-slate-500">{pointsData.points} Points</span>
                <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">{user.role}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-vs border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900">Personal Information</h2>
                    <button
                      onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold ${
                        isEditing ? 'bg-vs text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isEditing ? 'Save Changes' : 'Edit Profile'}
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Hospital/Clinic</label>
                      <input
                        type="text"
                        value={profileForm.hospital}
                        onChange={e => setProfileForm(p => ({ ...p, hospital: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="Enter your workplace"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Specialty</label>
                      <select
                        value={profileForm.specialty}
                        onChange={e => setProfileForm(p => ({ ...p, specialty: e.target.value }))}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs disabled:bg-slate-50"
                      >
                        <option value="">Select specialty</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Neurosurgery">Neurosurgery</option>
                        <option value="Soft Tissue">Soft Tissue Surgery</option>
                        <option value="Ophthalmology">Ophthalmology</option>
                        <option value="Exotic">Exotic Animals</option>
                        <option value="Ultrasound">Diagnostic Ultrasound</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="+86 138 0000 0000"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs disabled:bg-slate-50"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Bio</label>
                      <textarea
                        value={profileForm.bio}
                        onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                        disabled={!isEditing}
                        rows={4}
                        placeholder="Tell us about yourself..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs disabled:bg-slate-50 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-slate-900 mb-4">Order History</h2>
                  {orders.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">📦</div>
                      <p className="text-slate-500 mb-4">No orders yet</p>
                      <Link href={`/${locale}/shop`} className="text-vs font-bold hover:underline">
                        Browse Equipment →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map(order => (
                        <div key={order.id} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition">
                          {/* Order Header - Clickable */}
                          <div 
                            onClick={() => loadTracking(order)}
                            className="p-4 cursor-pointer hover:bg-slate-50 transition"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <span className="font-mono text-sm text-slate-500">#{order.id.slice(0, 8)}</span>
                                <span className="ml-3 text-sm text-slate-400">{order.date}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                                <svg 
                                  className={`w-4 h-4 text-slate-400 transition-transform ${selectedOrder?.id === order.id ? 'rotate-180' : ''}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-slate-600">
                                {order.items?.length || 0} item(s)
                              </div>
                              <div className="text-lg font-black text-slate-900">
                                ¥{order.totalAmount?.toLocaleString() || 0}
                              </div>
                            </div>
                          </div>
                          
                          {/* Tracking Panel - Expandable */}
                          {selectedOrder?.id === order.id && (
                            <div className="border-t border-slate-200 bg-slate-50 p-4">
                              {trackingLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="animate-spin w-6 h-6 border-3 border-vs border-t-transparent rounded-full" />
                                  <span className="ml-3 text-slate-500 text-sm">加载物流信息...</span>
                                </div>
                              ) : trackingData ? (
                                <div className="space-y-4">
                                  {/* Tracking Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <p className="text-xs text-slate-500">承运商</p>
                                        <p className="font-bold text-slate-900">{trackingData.carrier || '待指定'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-500">运单号</p>
                                        <p className="font-mono font-bold text-slate-900">{trackingData.trackingNumber || '待分配'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${getTrackingStatusColor(trackingData.status)}`} />
                                      <span className="font-bold text-sm">{getTrackingStatusLabel(trackingData.status)}</span>
                                    </div>
                                  </div>
                                  
                                  {trackingData.estimatedDelivery && (
                                    <div className="bg-white rounded-lg px-4 py-3 border border-slate-200">
                                      <span className="text-sm text-slate-500">预计送达: </span>
                                      <span className="font-bold text-slate-900">
                                        {new Date(trackingData.estimatedDelivery).toLocaleDateString('zh-CN', { 
                                          month: 'long', day: 'numeric', weekday: 'long' 
                                        })}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Tracking Timeline */}
                                  {trackingData.events && trackingData.events.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="text-sm font-bold text-slate-700 mb-3">物流轨迹</h4>
                                      <div className="relative space-y-0">
                                        {trackingData.events.map((event: any, idx: number) => (
                                          <div key={event.id || idx} className="flex gap-3 pb-4 last:pb-0">
                                            {/* Timeline Line */}
                                            <div className="flex flex-col items-center">
                                              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                                idx === 0 ? 'bg-vs ring-4 ring-vs/20' : 'bg-slate-300'
                                              }`} />
                                              {idx < trackingData.events.length - 1 && (
                                                <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                                              )}
                                            </div>
                                            {/* Event Content */}
                                            <div className="flex-1 pb-2">
                                              <p className={`text-sm font-medium ${idx === 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                                                {event.description}
                                              </p>
                                              {event.location && (
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                  📍 {event.location}
                                                </p>
                                              )}
                                              <p className="text-xs text-slate-400 mt-1">
                                                {new Date(event.timestamp).toLocaleString('zh-CN', {
                                                  month: 'numeric', day: 'numeric',
                                                  hour: '2-digit', minute: '2-digit'
                                                })}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-slate-500">
                                  <div className="text-3xl mb-2">📭</div>
                                  <p className="text-sm">暂无物流信息</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Courses Tab */}
              {activeTab === 'courses' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-slate-900 mb-4">Enrolled Courses</h2>
                  {enrollments.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">📚</div>
                      <p className="text-slate-500 mb-4">No enrolled courses yet</p>
                      <Link href={`/${locale}/courses`} className="text-vs font-bold hover:underline">
                        Browse Courses →
                      </Link>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {enrollments.map(enrollment => (
                        <div key={enrollment.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-slate-900 line-clamp-1">
                              {enrollment.course?.title || `Course ${enrollment.courseId}`}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(enrollment.paymentStatus)}`}>
                              {enrollment.paymentStatus === 'paid' ? 'Confirmed' : enrollment.paymentStatus}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mb-3">
                            Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-vs rounded-full transition-all"
                                style={{ width: `${enrollment.completionStatus === 'completed' ? 100 : enrollment.completionStatus === 'in_progress' ? 50 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-500 capitalize">
                              {enrollment.completionStatus?.replace('_', ' ')}
                            </span>
                          </div>
                          {enrollment.certificateIssued && (
                            <button className="mt-3 text-sm text-vs font-bold hover:underline">
                              Download Certificate →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Points Tab */}
              {activeTab === 'points' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900">Points & Level</h2>
                    <div className="text-right">
                      <div className="text-3xl font-black text-vs">{pointsData.points}</div>
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getLevelColor(pointsData.level)}`}>
                        {pointsData.level}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4">
                    <h3 className="font-bold text-slate-700 mb-3">Level Progress</h3>
                    <div className="flex items-center gap-4">
                      {['Resident', 'Specialist', 'Senior', 'Expert', 'Master'].map((level, idx) => (
                        <div key={level} className="flex-1 text-center">
                          <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                            ['Resident', 'Specialist', 'Senior', 'Expert', 'Master'].indexOf(pointsData.level) >= idx
                              ? 'bg-vs text-white'
                              : 'bg-slate-200 text-slate-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{level}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-700 mb-3">Recent Activity</h3>
                    {pointsHistory.length === 0 ? (
                      <p className="text-slate-500 text-center py-8">No activity yet</p>
                    ) : (
                      <div className="space-y-2">
                        {pointsHistory.slice(0, 10).map((tx, idx) => (
                          <div key={tx.id || idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                            <div>
                              <p className="text-sm font-medium text-slate-700">{tx.reason}</p>
                              <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleString()}</p>
                            </div>
                            <span className={`font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-black text-slate-900">Account Settings</h2>

                  <div className="space-y-4">
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <h3 className="font-bold text-slate-700 mb-2">Email Notifications</h3>
                      <p className="text-sm text-slate-500 mb-3">Receive updates about courses, orders, and community activity</p>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300 text-vs focus:ring-vs" />
                        <span className="text-sm font-medium">Enable email notifications</span>
                      </label>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl">
                      <h3 className="font-bold text-slate-700 mb-2">Language Preference</h3>
                      <select className="w-full md:w-64 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs">
                        <option value="zh">中文</option>
                        <option value="en">English</option>
                        <option value="th">ไทย</option>
                      </select>
                    </div>

                    <div className="p-4 border border-red-200 rounded-xl bg-red-50">
                      <h3 className="font-bold text-red-700 mb-2">Danger Zone</h3>
                      <p className="text-sm text-red-600 mb-3">Once you delete your account, there is no going back.</p>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCenterClient;
