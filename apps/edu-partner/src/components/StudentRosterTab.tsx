'use client';

import DataTable from './DataTable';
import type { Order } from '@vetsphere/shared/types';

interface StudentRosterTabProps {
  orders: Order[];
}

interface StudentEnrollment {
  orderId: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  date: string;
  amount: number;
  status: string;
}

export default function StudentRosterTab({ orders }: StudentRosterTabProps) {
  // Extract enrollments from orders
  const enrollments: StudentEnrollment[] = orders.flatMap(order =>
    order.items
      .filter(item => item.type === 'course')
      .map(item => ({
        orderId: order.id,
        studentName: order.customerName,
        studentEmail: order.customerEmail,
        courseName: item.name,
        date: order.date,
        amount: item.price * item.quantity,
        status: order.status,
      }))
  );

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['订单ID', '学员姓名', '邮箱', '课程名称', '报名日期', '金额', '状态'];
    const rows = enrollments.map(e => [
      e.orderId,
      e.studentName,
      e.studentEmail,
      e.courseName,
      new Date(e.date).toLocaleDateString('zh-CN'),
      e.amount.toString(),
      e.status,
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `学员名单_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const columns = [
    { key: 'studentName', label: '学员姓名' },
    { key: 'studentEmail', label: '邮箱', hideOnMobile: true },
    { key: 'courseName', label: '课程名称' },
    {
      key: 'date',
      label: '报名日期',
      render: (item: StudentEnrollment) => new Date(item.date).toLocaleDateString('zh-CN'),
      hideOnMobile: true,
    },
    {
      key: 'amount',
      label: '金额',
      render: (item: StudentEnrollment) => <span className="text-purple-400">¥{item.amount}</span>,
    },
    {
      key: 'status',
      label: '状态',
      render: (item: StudentEnrollment) => (
        <span className={`px-2 py-1 rounded text-xs ${
          item.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
        }`}>
          {item.status === 'Paid' ? '已支付' : '待支付'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">学员名单</h1>
          <p className="text-gray-400 mt-1">共 {enrollments.length} 名学员报名</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg flex items-center gap-2 transition-colors"
        >
          <span>📥</span>
          <span>导出 CSV</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="edu-card p-4 text-center">
          <p className="text-2xl font-bold text-white">{enrollments.length}</p>
          <p className="text-sm text-gray-500">总报名数</p>
        </div>
        <div className="edu-card p-4 text-center">
          <p className="text-2xl font-bold text-green-400">
            {enrollments.filter(e => e.status === 'Paid').length}
          </p>
          <p className="text-sm text-gray-500">已支付</p>
        </div>
        <div className="edu-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">
            {enrollments.filter(e => e.status === 'Pending').length}
          </p>
          <p className="text-sm text-gray-500">待支付</p>
        </div>
        <div className="edu-card p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">
            {new Set(enrollments.map(e => e.studentEmail)).size}
          </p>
          <p className="text-sm text-gray-500">独立学员</p>
        </div>
      </div>

      {/* Table */}
      <div className="edu-card p-4">
        <DataTable
          data={enrollments}
          columns={columns}
          emptyMessage="暂无学员报名记录"
        />
      </div>
    </div>
  );
}
