'use client';

import React, { useState, useMemo, useCallback } from 'react';
import KPICard from './KPICard';
import DataTable, { Column } from './DataTable';
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
  course?: any;
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
}

interface CourseOrderTabProps {
  orders: CourseOrder[];
  onRefresh: () => void;
}

const STATUS_MAP: Record<string, string> = {
  Pending: '待支付',
  Paid: '已支付',
  Completed: '已完成',
  Refunded: '已退款',
  PartialRefund: '部分退款',
};

const ENROLLMENT_STATUS_MAP: Record<string, string> = {
  enrolled: '待入学',
  in_progress: '学习中',
  completed: '已完成',
  dropped: '已退课',
};

const CourseOrderTab: React.FC<CourseOrderTabProps> = ({ orders, onRefresh }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<CourseOrder | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (filter !== 'all') {
      if (filter === 'pending_enroll') {
        result = result.filter(o =>
          o.status === 'Paid' &&
          o.enrollments.some(e => e.completionStatus === 'enrolled')
        );
      } else if (filter === 'in_progress') {
        result = result.filter(o =>
          o.enrollments.some(e => e.completionStatus === 'in_progress')
        );
      } else if (filter === 'completed') {
        result = result.filter(o =>
          o.enrollments.every(e => e.completionStatus === 'completed')
        );
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

  // KPI calculations
  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = orders.filter(o => {
      const d = new Date(o.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const courseRevenue = orders
      .filter(o => o.status === 'Paid' || o.status === 'Completed')
      .reduce((sum, o) => {
        const courseAmount = o.items
          .filter(i => i.type === 'course')
          .reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
        return sum + courseAmount;
      }, 0);

    const pendingEnroll = orders.filter(o =>
      o.status === 'Paid' &&
      o.enrollments.some(e => e.completionStatus === 'enrolled')
    ).length;

    return {
      total: orders.length,
      revenue: courseRevenue,
      pendingEnroll,
      thisMonth: thisMonth.length,
    };
  }, [orders]);

  // Get primary enrollment status for display
  const getEnrollmentLabel = (order: CourseOrder) => {
    if (!order.enrollments.length) return '-';
    const e = order.enrollments[0];
    if (e.certificateIssued) return '已发证';
    return ENROLLMENT_STATUS_MAP[e.completionStatus] || e.completionStatus;
  };

  const getEnrollmentStyle = (order: CourseOrder) => {
    if (!order.enrollments.length) return 'text-slate-500';
    const e = order.enrollments[0];
    if (e.certificateIssued) return 'text-purple-400';
    switch (e.completionStatus) {
      case 'enrolled': return 'text-amber-400';
      case 'in_progress': return 'text-blue-400';
      case 'completed': return 'text-emerald-400';
      case 'dropped': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  // Load order detail
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

  // Handle enrollment action
  const handleAction = async (enrollmentId: string, action: 'confirm' | 'complete' | 'issue_cert') => {
    setActionLoading(true);
    try {
      const success = await api.confirmEnrollment(enrollmentId, action);
      if (success) {
        // Reload detail
        if (selectedOrder) {
          const detail = await api.getCourseOrderDetail(selectedOrder.id);
          setDetailData(detail);
        }
        onRefresh();
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handle manual payment confirmation
  const handleConfirmPayment = async (orderId: string) => {
    setActionLoading(true);
    try {
      await api.updateOrderStatus(orderId, 'Paid');
      await api.updateEnrollmentsByOrderId(orderId, 'paid');
      if (selectedOrder) {
        const detail = await api.getCourseOrderDetail(selectedOrder.id);
        setDetailData(detail);
      }
      onRefresh();
    } finally {
      setActionLoading(false);
    }
  };

  // CSV export
  const handleExport = () => {
    const headers = ['订单号', '学员姓名', '学员邮箱', '课程名称', '金额', '支付状态', '入学状态', '日期'];
    const rows = filteredOrders.flatMap(o =>
      o.items.filter(i => i.type === 'course').map(item => {
        const enrollment = o.enrollments.find(e => e.courseId === item.id);
        return [
          o.id,
          o.customerName,
          o.customerEmail,
          item.name,
          ((item.price || 0) * (item.quantity || 1)).toString(),
          STATUS_MAP[o.status] || o.status,
          enrollment ? (ENROLLMENT_STATUS_MAP[enrollment.completionStatus] || enrollment.completionStatus) : '-',
          new Date(o.date).toLocaleDateString('zh-CN'),
        ];
      })
    );
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `课程订单_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Get course name from order items
  const getCourseName = (order: CourseOrder) => {
    const courseItems = order.items.filter(i => i.type === 'course');
    if (courseItems.length === 0) return '-';
    if (courseItems.length === 1) return courseItems[0].name;
    return `${courseItems[0].name} +${courseItems.length - 1}`;
  };

  // Table columns
  const columns: Column<CourseOrder>[] = [
    {
      key: 'id',
      header: '订单号',
      render: (v: string) => (
        <span className="font-mono text-white text-xs">#{v.slice(0, 12)}</span>
      ),
    },
    {
      key: 'customerName',
      header: '学员',
      render: (_: any, row: CourseOrder) => (
        <div>
          <p className="text-white font-medium text-sm">{row.customerName || '-'}</p>
          <p className="text-slate-500 text-xs truncate max-w-[160px]">{row.customerEmail}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: '课程',
      render: (_: any, row: CourseOrder) => (
        <span className="text-slate-300 text-sm truncate max-w-[200px] block">{getCourseName(row)}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'totalAmount',
      header: '金额',
      align: 'right',
      render: (v: number, row: CourseOrder) => (
        <span className="text-emerald-400 font-bold">
          {row.currency === 'USD' ? '$' : '¥'}{(v || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: '支付',
      render: (v: string) => {
        const color = v === 'Paid' || v === 'Completed' ? 'emerald' : v === 'Pending' ? 'amber' : 'slate';
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${color}-500/10 text-${color}-400`}>
            {STATUS_MAP[v] || v}
          </span>
        );
      },
    },
    {
      key: 'enrollments',
      header: '入学状态',
      render: (_: any, row: CourseOrder) => (
        <span className={`text-sm font-bold ${getEnrollmentStyle(row)}`}>
          {getEnrollmentLabel(row)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: 'date',
      header: '日期',
      align: 'right',
      render: (v: string) => (
        <span className="text-slate-500 text-xs">{v?.split('T')[0]}</span>
      ),
      hideOnMobile: true,
    },
  ];

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-white">课程订单管理</h2>
          <p className="text-sm text-slate-500 mt-1">管理所有课程报名订单与入学状态</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all min-h-[40px]"
          >
            导出CSV
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-sm font-bold text-emerald-400 hover:bg-emerald-500/30 transition-all min-h-[40px]"
          >
            刷新
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="课程订单总数" value={kpis.total} color="default" />
        <KPICard label="课程总收入" value={formatCurrency(kpis.revenue)} color="emerald" />
        <KPICard label="待确认入学" value={kpis.pendingEnroll} color="amber" subtitle="已支付未入学" />
        <KPICard label="本月新增" value={kpis.thisMonth} color="purple" />
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[32px] ${
                filter === f.key
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10'
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
            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredOrders}
          keyField="id"
          emptyMessage="暂无课程订单"
          onRowClick={loadDetail}
          mobileCardRenderer={(order: CourseOrder) => (
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-white font-bold text-sm">{order.customerName || order.customerEmail}</p>
                  <p className="text-slate-500 text-xs font-mono">#{order.id.slice(0, 12)}</p>
                </div>
                <span className="text-emerald-400 font-black">
                  ¥{(order.totalAmount || 0).toLocaleString()}
                </span>
              </div>
              <p className="text-slate-400 text-xs mb-2 truncate">{getCourseName(order)}</p>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-bold ${getEnrollmentStyle(order)}`}>
                  {getEnrollmentLabel(order)}
                </span>
                <span className="text-slate-600 text-xs">{order.date?.split('T')[0]}</span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0B1120] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-white">课程订单详情</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">#{selectedOrder.id}</p>
              </div>
              <button
                onClick={() => { setSelectedOrder(null); setDetailData(null); }}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-white"
              >
                x
              </button>
            </div>

            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : detailData ? (
                <>
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">学员</p>
                      <p className="text-white font-bold">{detailData.customerName || '-'}</p>
                      <p className="text-slate-400 text-xs">{detailData.customerEmail}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">金额</p>
                      <p className="text-emerald-400 font-black text-xl">
                        {detailData.currency === 'USD' ? '$' : '¥'}{(detailData.totalAmount || 0).toLocaleString()}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {detailData.paymentMethod || '未支付'} | {STATUS_MAP[detailData.status] || detailData.status}
                      </p>
                    </div>
                  </div>

                  {/* Course Enrollments */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-3">课程报名信息</h4>
                    <div className="space-y-3">
                      {(detailData.enrollments || []).map((enrollment: any) => (
                        <div key={enrollment.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-white font-bold">
                                {enrollment.course?.title_zh || enrollment.course?.title || `课程 ${enrollment.courseId}`}
                              </p>
                              {enrollment.course && (
                                <p className="text-slate-500 text-xs mt-1">
                                  {enrollment.course.start_date?.split('T')[0] || '-'}
                                  {enrollment.course.location && ` | ${typeof enrollment.course.location === 'string' ? enrollment.course.location : enrollment.course.location.city || ''}`}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                enrollment.completionStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                enrollment.completionStatus === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                                enrollment.completionStatus === 'enrolled' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-red-500/10 text-red-400'
                              }`}>
                                {ENROLLMENT_STATUS_MAP[enrollment.completionStatus] || enrollment.completionStatus}
                              </span>
                              {enrollment.certificateIssued && (
                                <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-purple-500/10 text-purple-400">
                                  已发证
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Enrollment Info Grid */}
                          <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                            <div>
                              <span className="text-slate-500">支付状态</span>
                              <p className={`font-bold ${enrollment.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {enrollment.paymentStatus === 'paid' ? '已支付' : enrollment.paymentStatus === 'refunded' ? '已退款' : '待支付'}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">报名日期</span>
                              <p className="text-white font-medium">{enrollment.enrollmentDate?.split('T')[0] || '-'}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">容量</span>
                              <p className="text-white font-medium">
                                {enrollment.course ? `${enrollment.course.current_enrollment || 0}/${enrollment.course.max_enrollment || 30}` : '-'}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
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
                                className="px-3 py-1.5 bg-emerald-500 text-black rounded-lg text-xs font-bold hover:bg-emerald-400 transition disabled:opacity-50"
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

                  {/* Manual Payment Confirmation */}
                  {detailData.status === 'Pending' && (
                    <div className="border-t border-white/5 pt-4">
                      <button
                        onClick={() => handleConfirmPayment(detailData.id)}
                        disabled={actionLoading}
                        className="w-full py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-sm hover:bg-amber-500/30 transition disabled:opacity-50"
                      >
                        {actionLoading ? '处理中...' : '手动确认支付（线下转账等）'}
                      </button>
                    </div>
                  )}

                  {/* Order Meta */}
                  <div className="text-xs text-slate-600 border-t border-white/5 pt-3">
                    下单时间: {detailData.date?.split('T')[0]} |
                    支付方式: {detailData.paymentMethod || '-'} |
                    退款状态: {detailData.refundStatus || '无'}
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-500 py-12">加载失败</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseOrderTab;
