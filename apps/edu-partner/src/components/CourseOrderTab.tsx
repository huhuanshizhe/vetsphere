'use client';

import { useState, useMemo, useCallback } from 'react';
import KPICard from './KPICard';
import DataTable from './DataTable';
import { api } from '@vetsphere/shared/services/api';

interface CourseOrderItem {
  id: string;
  name: string;
  price: number;
  type: string;
  quantity: number;
}

interface Enrollment {
  id: string;
  courseId: string;
  paymentStatus: string;
  completionStatus: string;
  certificateIssued: boolean;
  enrollmentDate: string;
}

interface CourseOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  items: CourseOrderItem[];
  totalAmount: number;
  status: string;
  date: string;
  paymentMethod?: string;
  paymentStatus?: string;
  currency?: string;
  refundStatus?: string;
  enrollments: Enrollment[];
  providerCourseIds?: string[];
  courseNameMap?: Record<string, string>;
  [key: string]: any;
}

interface CourseOrderTabProps {
  orders: any[];
  loading: boolean;
  onRefresh: () => void;
}

const STATUS_MAP: Record<string, string> = {
  Pending: '待支付',
  Paid: '已支付',
  Completed: '已完成',
  Refunded: '已退款',
};

const ENROLLMENT_MAP: Record<string, string> = {
  enrolled: '待入学',
  in_progress: '学习中',
  completed: '已完成',
  dropped: '已退课',
};

export default function CourseOrderTab({ orders: rawOrders, loading, onRefresh }: CourseOrderTabProps) {
  const orders: CourseOrder[] = rawOrders.map((o: any) => ({ ...o, enrollments: o.enrollments || [] }));
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<CourseOrder | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (filter !== 'all') {
      if (filter === 'pending_enroll') {
        result = result.filter(o => o.status === 'Paid' && o.enrollments.some(e => e.completionStatus === 'enrolled'));
      } else if (filter === 'in_progress') {
        result = result.filter(o => o.enrollments.some(e => e.completionStatus === 'in_progress'));
      } else if (filter === 'completed') {
        result = result.filter(o => o.enrollments.every(e => e.completionStatus === 'completed'));
      } else {
        result = result.filter(o => o.status === filter);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.customerName?.toLowerCase().includes(q) ||
        o.customerEmail?.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.items.some(i => i.name?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [orders, filter, search]);

  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = orders.filter(o => {
      const d = new Date(o.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const revenue = orders
      .filter(o => o.status === 'Paid' || o.status === 'Completed')
      .reduce((sum, o) => {
        const amt = o.items.filter(i => i.type === 'course').reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
        return sum + amt;
      }, 0);
    const pendingEnroll = orders.filter(o =>
      o.status === 'Paid' && o.enrollments.some(e => e.completionStatus === 'enrolled')
    ).length;
    const thisMonthRevenue = thisMonth
      .filter(o => o.status === 'Paid' || o.status === 'Completed')
      .reduce((sum, o) => {
        const amt = o.items.filter(i => i.type === 'course').reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
        return sum + amt;
      }, 0);
    return { total: orders.length, revenue, pendingEnroll, thisMonthRevenue };
  }, [orders]);

  const getEnrollmentLabel = (order: CourseOrder) => {
    if (!order.enrollments.length) return '-';
    const e = order.enrollments[0];
    if (e.certificateIssued) return '已发证';
    return ENROLLMENT_MAP[e.completionStatus] || e.completionStatus;
  };

  const getEnrollmentColor = (order: CourseOrder) => {
    if (!order.enrollments.length) return 'text-gray-500';
    const e = order.enrollments[0];
    if (e.certificateIssued) return 'text-purple-400';
    switch (e.completionStatus) {
      case 'enrolled': return 'text-amber-400';
      case 'in_progress': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'dropped': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getCourseName = (order: CourseOrder) => {
    const courseItems = order.items.filter(i => i.type === 'course');
    if (courseItems.length === 0) return '-';
    if (courseItems.length === 1) return courseItems[0].name;
    return `${courseItems[0].name} +${courseItems.length - 1}`;
  };

  const loadDetail = useCallback(async (order: CourseOrder) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    try {
      const detail = await api.getCourseOrderDetail(order.id);
      setDetailData(detail);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleAction = async (enrollmentId: string, action: 'confirm' | 'complete' | 'issue_cert') => {
    setActionLoading(true);
    try {
      const success = await api.confirmEnrollment(enrollmentId, action);
      if (success && selectedOrder) {
        const detail = await api.getCourseOrderDetail(selectedOrder.id);
        setDetailData(detail);
        onRefresh();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['订单号', '学员姓名', '学员邮箱', '课程名称', '金额', '支付状态', '入学状态', '日期'];
    const rows = filteredOrders.flatMap(o =>
      o.items.filter(i => i.type === 'course').map(item => {
        const enrollment = o.enrollments.find(e => e.courseId === item.id);
        return [
          o.id, o.customerName, o.customerEmail, item.name,
          ((item.price || 0) * (item.quantity || 1)).toString(),
          STATUS_MAP[o.status] || o.status,
          enrollment ? (ENROLLMENT_MAP[enrollment.completionStatus] || enrollment.completionStatus) : '-',
          new Date(o.date).toLocaleDateString('zh-CN'),
        ];
      })
    );
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `我的课程订单_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  type OrderColumn = {
    key: string;
    label: string;
    render?: (item: CourseOrder) => React.ReactNode;
    hideOnMobile?: boolean;
  };

  const columns: OrderColumn[] = [
    {
      key: 'id',
      label: '订单号',
      render: (row: CourseOrder) => <span className="font-mono text-purple-300 text-xs">#{row.id.slice(0, 12)}</span>,
    },
    {
      key: 'customerName',
      label: '学员',
      render: (row: CourseOrder) => (
        <div>
          <p className="text-white font-medium text-sm">{row.customerName || '-'}</p>
          <p className="text-gray-500 text-xs">{row.customerEmail}</p>
        </div>
      ),
    },
    {
      key: 'items',
      label: '课程',
      render: (row: CourseOrder) => <span className="text-gray-300 text-sm truncate block max-w-[180px]">{getCourseName(row)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'totalAmount',
      label: '金额',
      render: (row: CourseOrder) => <span className="text-green-400 font-bold">¥{(row.totalAmount || 0).toLocaleString()}</span>,
    },
    {
      key: 'status',
      label: '支付',
      render: (row: CourseOrder) => {
        const color = (row.status === 'Paid' || row.status === 'Completed') ? 'green' : row.status === 'Pending' ? 'amber' : 'gray';
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${color}-500/10 text-${color}-400`}>
            {STATUS_MAP[row.status] || row.status}
          </span>
        );
      },
    },
    {
      key: 'enrollments',
      label: '入学状态',
      render: (row: CourseOrder) => <span className={`text-sm font-bold ${getEnrollmentColor(row)}`}>{getEnrollmentLabel(row)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'date',
      label: '日期',
      render: (row: CourseOrder) => <span className="text-gray-500 text-xs">{row.date?.split('T')[0]}</span>,
      hideOnMobile: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-purple-400">加载订单数据...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">课程订单管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理您的课程报名订单与学员入学状态</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-bold border border-purple-500/30 transition"
          >
            导出CSV
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-bold border border-green-500/30 transition"
          >
            刷新
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="我的课程订单" value={kpis.total} color="default" icon="📋" />
        <KPICard label="总收入" value={`¥${kpis.revenue.toLocaleString()}`} color="green" icon="💰" />
        <KPICard label="待入学" value={kpis.pendingEnroll} color="amber" subtitle="已支付未入学" icon="⏳" />
        <KPICard label="本月收入" value={`¥${kpis.thisMonthRevenue.toLocaleString()}`} color="purple" icon="📈" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: '全部' },
            { key: 'Pending', label: '待支付' },
            { key: 'Paid', label: '已支付' },
            { key: 'pending_enroll', label: '待入学' },
            { key: 'in_progress', label: '学习中' },
            { key: 'completed', label: '已完成' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === f.key
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-purple-500/5 text-gray-500 border border-purple-500/10 hover:bg-purple-500/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索学员/订单号/课程..."
            className="w-full px-3 py-1.5 bg-purple-500/5 border border-purple-500/20 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-purple-500/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="edu-card rounded-xl overflow-hidden">
        <DataTable
          data={filteredOrders}
          columns={columns}
          emptyMessage="暂无课程订单"
          mobileCardRenderer={(order: CourseOrder) => (
            <div
              key={order.id}
              className="edu-card p-4 cursor-pointer"
              onClick={() => loadDetail(order)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-white font-bold text-sm">{order.customerName || order.customerEmail}</p>
                  <p className="text-gray-500 text-xs font-mono">#{order.id.slice(0, 12)}</p>
                </div>
                <span className="text-green-400 font-bold">¥{(order.totalAmount || 0).toLocaleString()}</span>
              </div>
              <p className="text-gray-400 text-xs mb-2 truncate">{getCourseName(order)}</p>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-bold ${getEnrollmentColor(order)}`}>{getEnrollmentLabel(order)}</span>
                <span className="text-gray-600 text-xs">{order.date?.split('T')[0]}</span>
              </div>
            </div>
          )}
        />
        {/* Desktop rows are clickable for detail */}
        {filteredOrders.length > 0 && (
          <div className="hidden md:block">
            {/* Click hint */}
            <div className="text-center py-2 text-xs text-gray-600 border-t border-purple-500/10">
              点击任意行查看详情
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1025] border border-purple-500/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-purple-500/10 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white">课程订单详情</h3>
                <p className="text-xs text-gray-500 font-mono mt-1">#{selectedOrder.id}</p>
              </div>
              <button
                onClick={() => { setSelectedOrder(null); setDetailData(null); }}
                className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-gray-400 hover:bg-purple-500/20 hover:text-white"
              >
                x
              </button>
            </div>

            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-pulse text-purple-400">加载中...</div>
                </div>
              ) : detailData ? (
                <>
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-purple-500/5 rounded-xl p-4 border border-purple-500/10">
                      <p className="text-xs text-gray-500 mb-1">学员</p>
                      <p className="text-white font-bold">{detailData.customerName || '-'}</p>
                      <p className="text-gray-400 text-xs">{detailData.customerEmail}</p>
                    </div>
                    <div className="bg-purple-500/5 rounded-xl p-4 border border-purple-500/10">
                      <p className="text-xs text-gray-500 mb-1">金额</p>
                      <p className="text-green-400 font-bold text-xl">¥{(detailData.totalAmount || 0).toLocaleString()}</p>
                      <p className="text-gray-500 text-xs">{STATUS_MAP[detailData.status] || detailData.status}</p>
                    </div>
                  </div>

                  {/* Enrollments */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-3">课程报名信息</h4>
                    <div className="space-y-3">
                      {(detailData.enrollments || []).map((enrollment: any) => (
                        <div key={enrollment.id} className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-white font-bold">
                                {enrollment.course?.title_zh || enrollment.course?.title || `课程 ${enrollment.courseId}`}
                              </p>
                              {enrollment.course && (
                                <p className="text-gray-500 text-xs mt-1">
                                  {enrollment.course.start_date?.split('T')[0] || '-'}
                                  {enrollment.course.location && ` | ${typeof enrollment.course.location === 'string' ? enrollment.course.location : enrollment.course.location.city || ''}`}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                enrollment.completionStatus === 'completed' ? 'bg-green-500/10 text-green-400' :
                                enrollment.completionStatus === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                                enrollment.completionStatus === 'enrolled' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-red-500/10 text-red-400'
                              }`}>
                                {ENROLLMENT_MAP[enrollment.completionStatus] || enrollment.completionStatus}
                              </span>
                              {enrollment.certificateIssued && (
                                <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-purple-500/10 text-purple-400">已发证</span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                            <div>
                              <span className="text-gray-500">支付状态</span>
                              <p className={`font-bold ${enrollment.paymentStatus === 'paid' ? 'text-green-400' : 'text-amber-400'}`}>
                                {enrollment.paymentStatus === 'paid' ? '已支付' : enrollment.paymentStatus === 'refunded' ? '已退款' : '待支付'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">报名日期</span>
                              <p className="text-white font-medium">{enrollment.enrollmentDate?.split('T')[0] || '-'}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">容量</span>
                              <p className="text-white font-medium">
                                {enrollment.course ? `${enrollment.course.current_enrollment || 0}/${enrollment.course.max_enrollment || 30}` : '-'}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 flex-wrap">
                            {enrollment.paymentStatus === 'paid' && enrollment.completionStatus === 'enrolled' && (
                              <button
                                onClick={() => handleAction(enrollment.id, 'confirm')}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-400 transition disabled:opacity-50"
                              >
                                {actionLoading ? '...' : '确认入学'}
                              </button>
                            )}
                            {enrollment.completionStatus === 'in_progress' && (
                              <button
                                onClick={() => handleAction(enrollment.id, 'complete')}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-green-500 text-black rounded-lg text-xs font-bold hover:bg-green-400 transition disabled:opacity-50"
                              >
                                {actionLoading ? '...' : '标记完成'}
                              </button>
                            )}
                            {enrollment.completionStatus === 'completed' && !enrollment.certificateIssued && (
                              <button
                                onClick={() => handleAction(enrollment.id, 'issue_cert')}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-400 transition disabled:opacity-50"
                              >
                                {actionLoading ? '...' : '颁发证书'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 border-t border-purple-500/10 pt-3">
                    下单时间: {detailData.date?.split('T')[0]} | 支付方式: {detailData.paymentMethod || '-'}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-12">加载失败</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
