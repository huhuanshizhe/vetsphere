'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Inquiry {
  id: string;
  productId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  companyName?: string;
  clinicName?: string;
  country?: string;
  estimatedPurchaseTime?: string;
  budgetRange?: string;
  quantity?: number;
  message: string;
  status: string;
  priority?: string;
  inquiryType?: string;
  assignedTo?: string;
  assignedAt?: string;
  adminNotes?: string;
  internalNotes?: string;
  followUpDate?: string;
  lastContactDate?: string;
  contactCount?: number;
  createdAt: string;
  repliedAt?: string;
  product?: {
    id: string;
    name: string;
    brand: string;
    imageUrl: string;
  };
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface InquiryManagementTabProps {
  onRefresh?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'new', label: '新询盘', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: '已联系', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'quoted', label: '已报价', color: 'bg-purple-100 text-purple-700' },
  { value: 'negotiating', label: '协商中', color: 'bg-orange-100 text-orange-700' },
  { value: 'converted', label: '已转化', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: '已关闭', color: 'bg-gray-100 text-gray-600' },
];

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: '紧急', color: 'bg-red-100 text-red-700', emoji: '🔴' },
  { value: 'high', label: '高', color: 'bg-orange-100 text-orange-700', emoji: '🟠' },
  { value: 'normal', label: '普通', color: 'bg-yellow-100 text-yellow-700', emoji: '🟡' },
  { value: 'low', label: '低', color: 'bg-green-100 text-green-700', emoji: '🟢' },
];

const BUDGET_LABELS: Record<string, string> = {
  'under5k': '< $5K',
  '5k-15k': '$5K - $15K',
  '15k-50k': '$15K - $50K',
  '50k-100k': '$50K - $100K',
  'over100k': '> $100K',
  'undisclosed': '未透露',
};

const TIMELINE_LABELS: Record<string, string> = {
  'immediate': '立即',
  '1-3months': '1-3个月',
  '3-6months': '3-6个月',
  '6-12months': '6-12个月',
  'planning': '规划中',
};

export default function InquiryManagementTab({ onRefresh }: InquiryManagementTabProps) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    status: '',
    priority: '',
    assignedTo: '',
    internalNotes: '',
    followUpDate: '',
  });

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/inquiries');
      if (response.ok) {
        const data = await response.json();
        setInquiries(data.inquiries || []);
      }
    } catch (error) {
      console.error('Failed to load inquiries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAdminUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/recent-users?role=Admin');
      if (response.ok) {
        const data = await response.json();
        setAdminUsers(data.filter((u: AdminUser) => u.role === 'Admin'));
      }
    } catch (error) {
      console.error('Failed to load admin users:', error);
    }
  }, []);

  useEffect(() => {
    loadInquiries();
    loadAdminUsers();
  }, [loadInquiries, loadAdminUsers]);

  // Filter inquiries
  const filteredInquiries = inquiries.filter(inquiry => {
    if (filterStatus !== 'all' && inquiry.status !== filterStatus) return false;
    if (filterPriority !== 'all' && inquiry.priority !== filterPriority) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        inquiry.customerName.toLowerCase().includes(query) ||
        inquiry.customerEmail.toLowerCase().includes(query) ||
        inquiry.clinicName?.toLowerCase().includes(query) ||
        inquiry.product?.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleSelectInquiry = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setEditForm({
      status: inquiry.status,
      priority: inquiry.priority || 'normal',
      assignedTo: inquiry.assignedTo || '',
      internalNotes: inquiry.internalNotes || '',
      followUpDate: inquiry.followUpDate || '',
    });
  };

  const handleUpdateInquiry = async () => {
    if (!selectedInquiry) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/inquiries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInquiry.id,
          ...editForm,
        }),
      });

      if (response.ok) {
        // Update local state
        setInquiries(prev => prev.map(inq => 
          inq.id === selectedInquiry.id 
            ? { ...inq, ...editForm }
            : inq
        ));
        setSelectedInquiry(prev => prev ? { ...prev, ...editForm } : null);
        onRefresh?.();
      }
    } catch (error) {
      console.error('Failed to update inquiry:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusOption = (status: string) => 
    STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

  const getPriorityOption = (priority: string) => 
    PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[2];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stats
  const stats = {
    total: inquiries.length,
    new: inquiries.filter(i => i.status === 'new').length,
    contacted: inquiries.filter(i => i.status === 'contacted').length,
    converted: inquiries.filter(i => i.status === 'converted').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">询盘管理</h2>
          <p className="text-sm text-gray-400 mt-1">管理临床咨询和设备询盘</p>
        </div>
        <button
          onClick={loadInquiries}
          className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/30 transition-colors"
        >
          刷新
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
          <p className="text-xs text-gray-400">总询盘</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-400">{stats.new}</p>
          <p className="text-xs text-gray-400">新询盘</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-400">{stats.contacted}</p>
          <p className="text-xs text-gray-400">已联系</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-400">{stats.converted}</p>
          <p className="text-xs text-gray-400">已转化</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索客户名、邮箱、诊所..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-[#0F172A] border border-blue-500/20 rounded-xl text-slate-900 text-sm placeholder:text-gray-600"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-[#0F172A] border border-blue-500/20 rounded-xl text-slate-900 text-sm"
        >
          <option value="all">全部状态</option>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="px-4 py-2 bg-[#0F172A] border border-blue-500/20 rounded-xl text-slate-900 text-sm"
        >
          <option value="all">全部优先级</option>
          {PRIORITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>
          ))}
        </select>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inquiry List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-400 mt-2">加载中...</p>
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="py-12 text-center bg-blue-500/5 border border-dashed border-blue-500/20 rounded-xl">
              <p className="text-gray-400">暂无询盘</p>
            </div>
          ) : (
            filteredInquiries.map(inquiry => {
              const statusOpt = getStatusOption(inquiry.status);
              const priorityOpt = getPriorityOption(inquiry.priority || 'normal');
              const isSelected = selectedInquiry?.id === inquiry.id;

              return (
                <div
                  key={inquiry.id}
                  onClick={() => handleSelectInquiry(inquiry)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-blue-500/20 border-2 border-blue-500' 
                      : 'bg-[#0F172A] border border-blue-500/20 hover:border-blue-500/40'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    {inquiry.product?.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={inquiry.product.imageUrl} 
                        alt="" 
                        className="w-14 h-14 rounded-lg object-cover bg-white shrink-0"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{priorityOpt.emoji}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusOpt.color}`}>
                          {statusOpt.label}
                        </span>
                        {inquiry.budgetRange && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">
                            {BUDGET_LABELS[inquiry.budgetRange] || inquiry.budgetRange}
                          </span>
                        )}
                      </div>

                      {/* Customer info */}
                      <h4 className="font-bold text-slate-900 truncate">
                        {inquiry.clinicName || inquiry.companyName || inquiry.customerName}
                      </h4>
                      <p className="text-sm text-gray-400 truncate">
                        {inquiry.customerName} • {inquiry.customerEmail}
                      </p>

                      {/* Product */}
                      <p className="text-xs text-blue-400 mt-1 truncate">
                        {inquiry.product?.brand} {inquiry.product?.name}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{inquiry.country || '未知地区'}</span>
                        <span>•</span>
                        <span>{formatDate(inquiry.createdAt)}</span>
                        {inquiry.estimatedPurchaseTime && (
                          <>
                            <span>•</span>
                            <span>{TIMELINE_LABELS[inquiry.estimatedPurchaseTime] || inquiry.estimatedPurchaseTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedInquiry ? (
            <div className="bg-[#0F172A] border border-blue-500/20 rounded-xl p-5 space-y-5 sticky top-4">
              <h3 className="font-bold text-slate-900 text-lg">询盘详情</h3>

              {/* Customer Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">客户信息</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-900 font-bold">{selectedInquiry.customerName}</p>
                  <p className="text-gray-400">{selectedInquiry.customerEmail}</p>
                  {selectedInquiry.customerPhone && (
                    <p className="text-gray-400">{selectedInquiry.customerPhone}</p>
                  )}
                  {selectedInquiry.clinicName && (
                    <p className="text-blue-400">{selectedInquiry.clinicName}</p>
                  )}
                  {selectedInquiry.country && (
                    <p className="text-gray-400">{selectedInquiry.country}</p>
                  )}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">留言内容</h4>
                <p className="text-sm text-gray-300 bg-blue-500/5 p-3 rounded-lg">
                  {selectedInquiry.message}
                </p>
              </div>

              {/* Edit Form */}
              <div className="space-y-4 pt-4 border-t border-blue-500/10">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">状态管理</h4>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">状态</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg text-slate-900 text-sm"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">优先级</label>
                  <select
                    value={editForm.priority}
                    onChange={e => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg text-slate-900 text-sm"
                  >
                    {PRIORITY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">分配给</label>
                  <select
                    value={editForm.assignedTo}
                    onChange={e => setEditForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="w-full px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg text-slate-900 text-sm"
                  >
                    <option value="">未分配</option>
                    {adminUsers.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">跟进日期</label>
                  <input
                    type="date"
                    value={editForm.followUpDate}
                    onChange={e => setEditForm(prev => ({ ...prev, followUpDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg text-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">内部备注</label>
                  <textarea
                    value={editForm.internalNotes}
                    onChange={e => setEditForm(prev => ({ ...prev, internalNotes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-lg text-slate-900 text-sm resize-none"
                    placeholder="添加内部备注..."
                  />
                </div>

                <button
                  onClick={handleUpdateInquiry}
                  disabled={saving}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存更改'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#0F172A] border border-dashed border-blue-500/20 rounded-xl p-8 text-center">
              <p className="text-gray-500">选择一个询盘查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
