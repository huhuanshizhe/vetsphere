'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { Order, CourseEnrollment } from '../types';
import { RefundRequestModal } from '../components/RefundRequestModal';
import Link from 'next/link';

type TabType = 'overview' | 'profile' | 'orders' | 'courses' | 'points' | 'settings';

const UserCenterClient: React.FC = () => {
  const { user, logout, isAuthenticated, updateUser } = useAuth();
  const { t, locale } = useLanguage();
  const { addNotification } = useNotification();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [pointsData, setPointsData] = useState({ points: 0, level: 'Resident' });
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [avatarUploading, setAvatarUploading] = useState(false);

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

  // Refund state
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);

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
        if (fetchedProfile.avatarUrl) {
          setAvatarUrl(fetchedProfile.avatarUrl);
          updateUser({ avatarUrl: fetchedProfile.avatarUrl });
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
        title: t.userCenter.profileUpdated,
        message: t.userCenter.profileSavedSuccess,
        read: false,
        timestamp: new Date()
      });
    } else {
      addNotification({
        id: `profile-err-${Date.now()}`,
        type: 'system',
        title: t.userCenter.saveFailed,
        message: t.userCenter.profileSaveFailed,
        read: false,
        timestamp: new Date()
      });
    }
    setIsEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return; // 5MB limit

    setAvatarUploading(true);
    try {
      const url = await api.updateUserAvatar(user.id, file);
      if (url) {
        setAvatarUrl(url);
        updateUser({ avatarUrl: url });
        addNotification({
          id: `avatar-${Date.now()}`,
          type: 'system',
          title: t.userCenter.profileUpdated,
          message: t.userCenter.avatarUploadSuccess,
          read: false,
          timestamp: new Date()
        });
      } else {
        addNotification({
          id: `avatar-err-${Date.now()}`,
          type: 'system',
          title: t.userCenter.saveFailed,
          message: t.userCenter.avatarUploadFailed,
          read: false,
          timestamp: new Date()
        });
      }
    } catch {
      addNotification({
        id: `avatar-err-${Date.now()}`,
        type: 'system',
        title: t.userCenter.saveFailed,
        message: t.userCenter.avatarUploadFailed,
        read: false,
        timestamp: new Date()
      });
    } finally {
      setAvatarUploading(false);
      // Reset input so same file can be selected again
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
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
      'pending': t.userCenter.statusPending,
      'shipped': t.userCenter.statusShipped,
      'in_transit': t.userCenter.statusInTransit,
      'out_for_delivery': t.userCenter.statusOutForDelivery,
      'delivered': t.userCenter.statusDelivered,
      'exception': t.userCenter.statusException
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
    { id: 'overview', label: t.userCenter.overview || 'Overview', icon: '📊' },
    { id: 'profile', label: t.userCenter.personalInfo, icon: '👤' },
    { id: 'courses', label: t.userCenter.myCourses, icon: '📚' },
    { id: 'orders', label: t.userCenter.myOrders, icon: '📦' },
    { id: 'points', label: t.userCenter.pointsHub || t.userCenter.pointsRecord, icon: '⭐' },
    { id: 'settings', label: t.userCenter.accountSettings, icon: '⚙️' }
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
          <p className="text-slate-500">{t.userCenter.redirectingToLogin}</p>
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
            {/* Avatar with upload */}
            <div className="relative group">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg focus:outline-none focus:ring-4 focus:ring-vs/20 transition-all"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-vs to-emerald-600 flex items-center justify-center text-white text-3xl font-black">
                    {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {avatarUploading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {t.userCenter.avatarHint}
              </p>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-slate-900">{user.name || user.email?.split('@')[0]}</h1>
              <p className="text-slate-500">{user.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getLevelColor(pointsData.level)}`}>
                  {pointsData.level}
                </span>
                <span className="text-sm text-slate-500">{pointsData.points} {t.dashboard.points}</span>
                <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">{user.role}</span>
              </div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              {t.userCenter.signOut}
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
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Personal Card with Stats */}
                  <div className="bg-gradient-to-r from-slate-50 to-emerald-50 rounded-[32px] p-8 border border-slate-100">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      {/* Large Avatar */}
                      <div className="w-24 h-24 rounded-full overflow-hidden shadow-xl ring-4 ring-white">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-vs to-emerald-600 flex items-center justify-center text-white text-4xl font-black">
                            {user.name?.[0]?.toUpperCase() || '👨‍⚕️'}
                          </div>
                        )}
                      </div>
                      
                      {/* User Info */}
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                          <h2 className="text-3xl font-black text-slate-900">{user.name || user.email?.split('@')[0]}</h2>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${getLevelColor(pointsData.level)}`}>
                            {pointsData.level}
                          </span>
                        </div>
                        <p className="text-slate-400 font-bold text-sm mb-6">{user.email}</p>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-8 border-t border-slate-200/50 pt-6">
                          <div className="text-center md:text-left">
                            <p className="text-xs font-black text-slate-400 uppercase mb-1">{t.dashboard.enrolled || 'Enrolled'}</p>
                            <p className="text-2xl font-black text-slate-900">{enrollments.length}</p>
                          </div>
                          <div className="text-center md:text-left">
                            <p className="text-xs font-black text-slate-400 uppercase mb-1">{t.dashboard.completed || 'Completed'}</p>
                            <p className="text-2xl font-black text-slate-900">
                              {enrollments.filter(e => e.completionStatus === 'completed').length}
                            </p>
                          </div>
                          <div className="text-center md:text-left">
                            <p className="text-xs font-black text-vs uppercase mb-1">{t.dashboard.points || 'Points'}</p>
                            <p className="text-2xl font-black text-vs">{pointsData.points}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Courses */}
                  {enrollments.length > 0 && (
                    <div className="bg-white rounded-[32px] border border-slate-100 p-8">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-slate-900 text-lg">{t.userCenter.recentCourses || 'Recent Courses'}</h3>
                        <button 
                          onClick={() => setActiveTab('courses')} 
                          className="text-vs text-sm font-bold hover:underline"
                        >
                          {t.dashboard.viewAll || 'View All'} →
                        </button>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        {enrollments.slice(0, 3).map(enrollment => (
                          <div key={enrollment.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition">
                            <div className="w-16 h-16 bg-slate-200 rounded-xl overflow-hidden flex-shrink-0">
                              {enrollment.course?.imageUrl ? (
                                <img src={enrollment.course.imageUrl} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 truncate">{enrollment.course?.title || 'Course'}</p>
                              <p className="text-xs text-slate-400">{enrollment.course?.startDate} • {enrollment.course?.location?.city || 'TBD'}</p>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${
                                enrollment.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                              }`}>
                                {enrollment.paymentStatus === 'paid' ? (t.dashboard.enrolled || 'Enrolled') : 'Pending'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Link 
                      href={`/${locale}/courses`}
                      className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-vs/30 transition group"
                    >
                      <div className="text-3xl mb-3">📖</div>
                      <h4 className="font-bold text-slate-900 group-hover:text-vs transition">{t.userCenter.browseCourses || 'Browse Courses'}</h4>
                      <p className="text-sm text-slate-500 mt-1">{t.userCenter.discoverNew || 'Discover new learning opportunities'}</p>
                    </Link>
                    <button 
                      onClick={() => setActiveTab('profile')}
                      className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-vs/30 transition group text-left"
                    >
                      <div className="text-3xl mb-3">👤</div>
                      <h4 className="font-bold text-slate-900 group-hover:text-vs transition">{t.userCenter.editProfile || 'Edit Profile'}</h4>
                      <p className="text-sm text-slate-500 mt-1">{t.userCenter.updateInfo || 'Update your information'}</p>
                    </button>
                    <button 
                      onClick={() => setActiveTab('points')}
                      className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-vs/30 transition group text-left"
                    >
                      <div className="text-3xl mb-3">⭐</div>
                      <h4 className="font-bold text-slate-900 group-hover:text-vs transition">{t.userCenter.viewPoints || 'View Points'}</h4>
                      <p className="text-sm text-slate-500 mt-1">{t.userCenter.earnRewards || 'Earn rewards and level up'}</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-900">{t.userCenter.personalInfo}</h2>
                    <button
                      onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold ${
                        isEditing ? 'bg-vs text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isEditing ? t.userCenter.saveChanges : t.userCenter.editProfile}
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t.auth.fullName}</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t.userCenter.hospital}</label>
                      <input
                        type="text"
                        value={profileForm.hospital}
                        onChange={e => setProfileForm(p => ({ ...p, hospital: e.target.value }))}
                        disabled={!isEditing}
                        placeholder={t.userCenter.enterWorkplace}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs disabled:bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t.userCenter.specialty}</label>
                      <select
                        value={profileForm.specialty}
                        onChange={e => setProfileForm(p => ({ ...p, specialty: e.target.value }))}
                        disabled={!isEditing}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs disabled:bg-slate-50"
                      >
                        <option value="">{t.userCenter.selectSpecialty}</option>
                        <option value="Orthopedics">Orthopedics</option>
                        <option value="Neurosurgery">Neurosurgery</option>
                        <option value="Soft Tissue">Soft Tissue Surgery</option>
                        <option value="Ophthalmology">Ophthalmology</option>
                        <option value="Exotic">Exotic Animals</option>
                        <option value="Ultrasound">Diagnostic Ultrasound</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t.userCenter.phone}</label>
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
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t.userCenter.bio}</label>
                      <textarea
                        value={profileForm.bio}
                        onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                        disabled={!isEditing}
                        rows={4}
                        placeholder={t.userCenter.tellAbout}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs disabled:bg-slate-50 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-slate-900 mb-4">{t.userCenter.orderHistory}</h2>
                  {orders.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">📦</div>
                      <p className="text-slate-500 mb-4">{t.userCenter.noOrdersYet}</p>
                      <Link href={`/${locale}/shop`} className="text-vs font-bold hover:underline">
                        {t.userCenter.browseEquipment} →
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
                              {/* Refund Button */}
                              {(order.status === 'Paid' || order.status === 'Completed') && (
                                <div className="mb-4 pb-4 border-b border-slate-200">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRefundOrder(order);
                                    }}
                                    className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-100 transition"
                                  >
                                    {locale === 'zh' ? '申请退款' : 'Request Refund'}
                                  </button>
                                  {(order as any).refund_status && (
                                    <span className={`ml-3 px-2 py-1 rounded text-xs font-bold ${
                                      (order as any).refund_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                      (order as any).refund_status === 'partial' ? 'bg-blue-100 text-blue-700' :
                                      (order as any).refund_status === 'full' ? 'bg-emerald-100 text-emerald-700' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {(order as any).refund_status === 'pending' ? (locale === 'zh' ? '退款处理中' : 'Refund Pending') :
                                       (order as any).refund_status === 'partial' ? (locale === 'zh' ? '部分退款' : 'Partial Refund') :
                                       (order as any).refund_status === 'full' ? (locale === 'zh' ? '已全额退款' : 'Fully Refunded') :
                                       (order as any).refund_status}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {trackingLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="animate-spin w-6 h-6 border-3 border-vs border-t-transparent rounded-full" />
                                  <span className="ml-3 text-slate-500 text-sm">{t.common.loading}</span>
                                </div>
                              ) : trackingData ? (
                                <div className="space-y-4">
                                  {/* Tracking Header */}
                                  <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <p className="text-xs text-slate-500">{t.userCenter.trackOrder}</p>
                                        <p className="font-bold text-slate-900">{trackingData.carrier || '-'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-slate-500">#</p>
                                        <p className="font-mono font-bold text-slate-900">{trackingData.trackingNumber || '-'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${getTrackingStatusColor(trackingData.status)}`} />
                                      <span className="font-bold text-sm">{getTrackingStatusLabel(trackingData.status)}</span>
                                    </div>
                                  </div>
                                  
                                  {trackingData.estimatedDelivery && (
                                    <div className="bg-white rounded-lg px-4 py-3 border border-slate-200">
                                      <span className="text-sm text-slate-500">{t.userCenter.estimatedDelivery}: </span>
                                      <span className="font-bold text-slate-900">
                                        {trackingData.estimatedDelivery.split('T')[0]}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Tracking Timeline */}
                                  {trackingData.events && trackingData.events.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="text-sm font-bold text-slate-700 mb-3">{t.userCenter.trackingTimeline}</h4>
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
                                                {event.timestamp?.split('T')[0]} {event.timestamp?.split('T')[1]?.slice(0, 5) || ''}
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
                                  <p className="text-sm">{t.userCenter.noOrdersYet}</p>
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
                  <h2 className="text-xl font-black text-slate-900 mb-4">{t.userCenter.enrolledCourses}</h2>
                  {enrollments.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">📚</div>
                      <p className="text-slate-500 mb-4">{t.userCenter.noCoursesYet}</p>
                      <Link href={`/${locale}/courses`} className="text-vs font-bold hover:underline">
                        {t.userCenter.browseCourses} →
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
                            {t.dashboard.enrolled}: {enrollment.enrollmentDate?.split('T')[0] || ''}
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
                              {t.userCenter.downloadCertificate} →
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
                  {/* Points Header - Large Display */}
                  <div className="bg-gradient-to-r from-vs/10 to-emerald-50 rounded-[32px] p-8 text-center">
                    <div className="text-6xl font-black text-vs mb-2">{pointsData.points}</div>
                    <p className="text-slate-500 font-medium mb-4">{t.userCenter.yourTotalPoints || 'Your Total Points'}</p>
                    <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${getLevelColor(pointsData.level)}`}>
                      {pointsData.level}
                    </div>
                  </div>

                  {/* Level Progress */}
                  <div className="bg-slate-50 rounded-xl p-6">
                    <h3 className="font-bold text-slate-700 mb-4">{t.userCenter.levelProgress}</h3>
                    <div className="flex items-center gap-2">
                      {['Resident', 'Specialist', 'Senior', 'Expert', 'Master'].map((level, idx) => (
                        <React.Fragment key={level}>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                              ['Resident', 'Specialist', 'Senior', 'Expert', 'Master'].indexOf(pointsData.level) >= idx
                                ? 'bg-vs text-white shadow-lg shadow-vs/30'
                                : 'bg-slate-200 text-slate-400'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="text-xs text-slate-500 mt-2 font-medium">{level}</div>
                          </div>
                          {idx < 4 && (
                            <div className={`flex-1 h-1 rounded ${
                              ['Resident', 'Specialist', 'Senior', 'Expert', 'Master'].indexOf(pointsData.level) > idx
                                ? 'bg-vs'
                                : 'bg-slate-200'
                            }`} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* How to Earn Points */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h3 className="font-bold text-slate-700 mb-4">{t.userCenter.howToEarn || 'How to Earn Points'}</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-slate-50 rounded-xl p-5 text-center hover:bg-slate-100 transition">
                        <div className="text-3xl mb-2">📝</div>
                        <p className="font-bold text-slate-700 mb-1">{t.userCenter.postCase || 'Post Case'}</p>
                        <p className="text-vs font-black text-lg">+200 pts</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-5 text-center hover:bg-slate-100 transition">
                        <div className="text-3xl mb-2">💬</div>
                        <p className="font-bold text-slate-700 mb-1">{t.userCenter.comment || 'Comment'}</p>
                        <p className="text-vs font-black text-lg">+20 pts</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-5 text-center hover:bg-slate-100 transition">
                        <div className="text-3xl mb-2">🔗</div>
                        <p className="font-bold text-slate-700 mb-1">{t.userCenter.share || 'Share'}</p>
                        <p className="text-vs font-black text-lg">+50 pts</p>
                      </div>
                    </div>
                  </div>

                  {/* Points History */}
                  <div>
                    <h3 className="font-bold text-slate-700 mb-3">{t.userCenter.recentActivity}</h3>
                    {pointsHistory.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <div className="text-4xl mb-3">📊</div>
                        <p className="text-slate-500">{t.userCenter.noActivityYet}</p>
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
                        {pointsHistory.slice(0, 10).map((tx, idx) => (
                          <div key={tx.id || idx} className="flex items-center justify-between p-4">
                            <div>
                              <p className="font-medium text-slate-700">{tx.reason}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{tx.createdAt?.split('T')[0] || ''}</p>
                            </div>
                            <span className={`font-black text-lg ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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
                  <h2 className="text-xl font-black text-slate-900">{t.userCenter.accountSettings}</h2>

                  <div className="space-y-4">
                    <div className="p-4 border border-slate-200 rounded-xl">
                      <h3 className="font-bold text-slate-700 mb-2">{t.userCenter.emailNotifications}</h3>
                      <p className="text-sm text-slate-500 mb-3">{t.userCenter.enableNotif}</p>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300 text-vs focus:ring-vs" />
                        <span className="text-sm font-medium">{t.userCenter.emailNotifications}</span>
                      </label>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl">
                      <h3 className="font-bold text-slate-700 mb-2">{t.userCenter.languagePreference}</h3>
                      <select className="w-full md:w-64 px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-vs/20 focus:border-vs">
                        <option value="zh">中文</option>
                        <option value="en">English</option>
                        <option value="th">ไทย</option>
                      </select>
                    </div>

                    <div className="p-4 border border-red-200 rounded-xl bg-red-50">
                      <h3 className="font-bold text-red-700 mb-2">{t.userCenter.dangerZone}</h3>
                      <p className="text-sm text-red-600 mb-3">{t.userCenter.deleteWarning}</p>
                      <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition">
                        {t.userCenter.deleteAccount}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">👋</div>
            <h3 className="text-xl font-black text-slate-900 mb-2">{t.userCenter.confirmLogout}</h3>
            <p className="text-slate-500 text-sm mb-6">{t.userCenter.logoutWarning}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition">
                {t.common.cancel}
              </button>
              <button onClick={handleLogout} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition">
                {t.userCenter.signOut}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      {refundOrder && (
        <RefundRequestModal
          order={refundOrder}
          isOpen={!!refundOrder}
          onClose={() => setRefundOrder(null)}
          onSuccess={() => {
            loadUserData();
            setRefundOrder(null);
          }}
          locale={locale}
        />
      )}
    </div>
  );
};

export default UserCenterClient;
