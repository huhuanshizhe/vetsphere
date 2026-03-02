'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { api } from '@vetsphere/shared/services/api';
import type { Course, Order } from '@vetsphere/shared/types';

import EduLayout from '@/components/EduLayout';
import OverviewTab from '@/components/OverviewTab';
import CourseManagementTab from '@/components/CourseManagementTab';
import StudentRosterTab from '@/components/StudentRosterTab';
import RevenueAnalysisTab from '@/components/RevenueAnalysisTab';
import CourseOrderTab from '@/components/CourseOrderTab';
import CourseCreationWizard from '@/components/courses/CourseCreationWizard';
import CourseEditModal from '@/components/courses/CourseEditModal';
import { useProviderCourses } from '@/hooks/useProviderCourses';

export default function EduDashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('教学概览');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // 使用自定义 hook 获取课程数据
  const { courses, loading: coursesLoading, refetch: refetchCourses } = useProviderCourses();

  // 创建/编辑状态
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Auth check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/');
      } else if (user.role !== 'CourseProvider') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  // Load orders
  useEffect(() => {
    if (user?.role === 'CourseProvider') {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const fetchedOrders = await api.getOrders();
      // Filter orders that contain courses
      const courseOrders = (Array.isArray(fetchedOrders) ? fetchedOrders : [])
        .filter(order => order.items.some(item => item.type === 'course'));
      setOrders(courseOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Course actions
  const handleAddCourse = () => {
    setShowCreateWizard(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('确定要删除这门课程吗？此操作不可撤销。')) return;
    
    try {
      await api.manageCourse('delete', { id: courseId });
      refetchCourses();
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('删除失败，请重试');
    }
  };

  const handleCourseCreated = () => {
    refetchCourses();
    setShowCreateWizard(false);
  };

  const handleCourseUpdated = () => {
    refetchCourses();
    setEditingCourse(null);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0A1F]">
        <div className="animate-pulse text-purple-400">加载中...</div>
      </div>
    );
  }

  const loading = coursesLoading || ordersLoading;

  // Render active tab
  const renderTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-purple-400">加载数据中...</div>
        </div>
      );
    }

    switch (activeTab) {
      case '教学概览':
        return (
          <OverviewTab
            courses={courses}
            orders={orders}
            onAddCourse={handleAddCourse}
          />
        );
      case '课程管理':
        return (
          <CourseManagementTab
            courses={courses}
            onAddCourse={handleAddCourse}
            onEditCourse={handleEditCourse}
            onDeleteCourse={handleDeleteCourse}
          />
        );
      case '课程订单':
        return <CourseOrderTab orders={orders} loading={ordersLoading} onRefresh={loadOrders} />;
      case '学员名单':
        return <StudentRosterTab orders={orders} />;
      case '收益分析':
        return <RevenueAnalysisTab orders={orders} />;
      default:
        return null;
    }
  };

  return (
    <>
      <EduLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={{ name: user.name, email: user.email }}
        onLogout={handleLogout}
      >
        {renderTab()}
      </EduLayout>

      {/* 创建课程向导 */}
      <CourseCreationWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onSuccess={handleCourseCreated}
      />

      {/* 编辑课程弹窗 */}
      {editingCourse && (
        <CourseEditModal
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSuccess={handleCourseUpdated}
        />
      )}
    </>
  );
}
