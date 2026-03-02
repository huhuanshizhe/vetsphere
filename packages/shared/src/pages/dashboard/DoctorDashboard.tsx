'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { KPICard } from '../../components/dashboard/KPICard';
import { ResponsiveTable, TableColumn } from '../../components/ui/ResponsiveTable';
import { OrderCard } from '../../components/dashboard/OrderCard';
import { Order, CourseEnrollment, UserRole } from '../../types';

interface DoctorDashboardProps {
  user: {
    id?: string;
    name: string;
    email: string;
    role: UserRole;
    level?: string;
  };
  enrollments: CourseEnrollment[];
  orders: Order[];
  userPoints: number;
  loading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  logout: () => void | Promise<void>;
  locale: string;
}

const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  user,
  enrollments,
  orders,
  userPoints,
  loading,
  activeTab,
  setActiveTab,
  logout,
  locale,
}) => {
  const router = useRouter();
  const completedCourses = enrollments.filter(e => e.completionStatus === 'completed').length;

  // Order table columns
  const orderColumns: TableColumn<Order>[] = [
    {
      key: 'id',
      header: 'Order ID',
      render: (value) => <span className="font-bold text-slate-900">{value}</span>,
    },
    {
      key: 'items',
      header: 'Items',
      render: (_, row) => `${row.items.length} item(s)`,
      hideOnMobile: true,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (value) => `¥${value?.toLocaleString() || 0}`,
    },
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => {
        const statusStyle = 
          value === 'Paid' || value === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
          value === 'Shipped' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600';
        return (
          <span className={`px-2 py-1 rounded text-xs font-bold ${statusStyle}`}>
            {value}
          </span>
        );
      },
    },
  ];

  // Mobile card renderer for orders
  const renderOrderCard = (order: Order) => (
    <OrderCard order={order} locale={locale} />
  );

  return (
    <DashboardLayout
      sidebarItems={['My Dashboard', 'My Courses', 'My Orders', 'Rewards Hub']}
      user={user}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      logout={logout}
    >
      {/* My Dashboard Tab */}
      {activeTab === 'My Dashboard' && (
        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Profile Card */}
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-[32px] md:rounded-[40px] border border-slate-100 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 md:gap-10">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#00A884]/10 rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-inner shrink-0">
                  👨‍⚕️
                </div>
                <div className="flex-1 text-center sm:text-left w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{user.name}</h2>
                    <span className="inline-block px-3 py-1 bg-[#00A884] text-white text-xs font-black uppercase rounded-full tracking-widest">
                      {user.level || 'Resident'}
                    </span>
                  </div>
                  <p className="text-slate-400 font-bold text-sm mb-4 sm:mb-6">{user.email}</p>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 border-t border-slate-50 pt-4 sm:pt-6">
                    <div>
                      <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase mb-1">Enrolled</p>
                      <p className="text-lg sm:text-xl font-black">{enrollments.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase mb-1">Completed</p>
                      <p className="text-lg sm:text-xl font-black">{completedCourses}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-black text-[#00A884] uppercase mb-1">Points</p>
                      <p className="text-lg sm:text-xl font-black text-[#00A884]">{userPoints}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Enrollments Preview */}
            {enrollments.length > 0 && (
              <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-[32px] border border-slate-100">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h3 className="font-black text-slate-900">Recent Courses</h3>
                  <button 
                    onClick={() => setActiveTab('My Courses')} 
                    className="text-[#00A884] text-xs font-bold hover:underline min-h-[44px] px-2"
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {enrollments.slice(0, 3).map(enrollment => (
                    <div key={enrollment.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-200 rounded-lg sm:rounded-xl overflow-hidden shrink-0">
                        {enrollment.course?.imageUrl && (
                          <img 
                            src={enrollment.course.imageUrl} 
                            className="w-full h-full object-cover" 
                            alt="" 
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm sm:text-base truncate">
                          {enrollment.course?.title || 'Course'}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {enrollment.course?.startDate} • {enrollment.course?.location?.city}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${
                        enrollment.paymentStatus === 'paid' 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {enrollment.paymentStatus === 'paid' ? 'Confirmed' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Courses Tab */}
      {activeTab === 'My Courses' && (
        <div className="space-y-4 sm:space-y-6">
          <h3 className="font-black text-lg sm:text-xl text-slate-900">My Enrolled Courses</h3>
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : enrollments.length === 0 ? (
            <div className="bg-white p-8 sm:p-12 rounded-2xl sm:rounded-[32px] border border-slate-100 text-center">
              <p className="text-slate-400 mb-4">You haven&apos;t enrolled in any courses yet.</p>
              <button 
                onClick={() => router.push(`/${locale}/courses`)} 
                className="bg-[#00A884] text-white px-6 py-3 rounded-xl font-bold text-sm min-h-[44px]"
              >
                Browse Courses
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {enrollments.map(enrollment => (
                <div key={enrollment.id} className="bg-white p-4 sm:p-5 rounded-xl sm:rounded-[24px] border border-slate-100 shadow-sm">
                  <div className="aspect-[16/10] bg-slate-100 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 overflow-hidden">
                    {enrollment.course?.imageUrl && (
                      <img 
                        src={enrollment.course.imageUrl} 
                        className="w-full h-full object-cover" 
                        alt={enrollment.course.title} 
                      />
                    )}
                  </div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase truncate">
                      {enrollment.course?.specialty}
                    </span>
                    <span className={`shrink-0 px-2 py-1 rounded text-xs font-bold ${
                      enrollment.paymentStatus === 'paid' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-amber-100 text-amber-600'
                    }`}>
                      {enrollment.paymentStatus === 'paid' ? 'Confirmed' : 'Pending Payment'}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 mb-1 line-clamp-2">
                    {enrollment.course?.title}
                  </h4>
                  <p className="text-xs text-slate-500 mb-3 sm:mb-4">
                    {enrollment.course?.startDate} • {enrollment.course?.location?.city || 'TBD'}
                  </p>
                  <div className="pt-3 sm:pt-4 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-xs text-slate-400">
                      Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                    </span>
                    <span className={`text-xs font-bold ${
                      enrollment.completionStatus === 'completed' 
                        ? 'text-emerald-600' 
                        : 'text-slate-400'
                    }`}>
                      {enrollment.completionStatus === 'completed' ? '✓ Completed' : enrollment.completionStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Orders Tab */}
      {activeTab === 'My Orders' && (
        <div className="space-y-4 sm:space-y-6">
          <h3 className="font-black text-lg sm:text-xl text-slate-900">Order History</h3>
          {orders.length === 0 ? (
            <div className="bg-white p-8 sm:p-12 rounded-2xl sm:rounded-[32px] border border-slate-100 text-center">
              <p className="text-slate-400">No orders yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-100 overflow-hidden">
              <ResponsiveTable
                columns={orderColumns}
                data={orders}
                keyField="id"
                mobileCardRenderer={renderOrderCard}
              />
            </div>
          )}
        </div>
      )}

      {/* Rewards Hub Tab */}
      {activeTab === 'Rewards Hub' && (
        <div className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-[32px] border border-slate-100">
          <h3 className="font-black text-lg sm:text-xl text-slate-900 mb-4 sm:mb-6">Points & Rewards</h3>
          <div className="text-center py-6 sm:py-8">
            <p className="text-4xl sm:text-5xl md:text-6xl font-black text-[#00A884] mb-2">{userPoints}</p>
            <p className="text-slate-400 font-bold">Total Points</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
            <KPICard
              icon="📝"
              label="Post Case"
              value="+200 pts"
              color="primary"
            />
            <KPICard
              icon="💬"
              label="Comment"
              value="+20 pts"
              color="primary"
            />
            <KPICard
              icon="🔗"
              label="Share"
              value="+50 pts"
              color="primary"
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DoctorDashboard;
export { DoctorDashboard };
