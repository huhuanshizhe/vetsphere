'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Inquiry {
  id: string;
  inquiry_number: string;
  product_name: string;
  customer_name: string;
  customer_email: string;
  customer_company?: string;
  quantity_requested?: number;
  target_price?: number;
  requirements?: string;
  status: 'pending' | 'quoted' | 'negotiating' | 'accepted' | 'rejected' | 'expired';
  quoted_price?: number;
  quoted_quantity?: number;
  quote_valid_until?: string;
  supplier_notes?: string;
  created_at: string;
  supplier?: {
    company_name: string;
  };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: '待报价', className: 'bg-amber-100 text-amber-600' },
  quoted: { label: '已报价', className: 'bg-blue-100 text-blue-600' },
  negotiating: { label: '议价中', className: 'bg-purple-100 text-purple-600' },
  accepted: { label: '已接受', className: 'bg-emerald-100 text-emerald-600' },
  rejected: { label: '已拒绝', className: 'bg-red-100 text-red-600' },
  expired: { label: '已过期', className: 'bg-slate-100 text-slate-600' },
};

export default function AdminInquiriesPage() {
  const supabase = createClient();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  useEffect(() => {
    loadInquiries();
  }, [filter]);

  const loadInquiries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('inquiries')
        .select('*, supplier:suppliers(company_name)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInquiries(data || []);
    } catch (error) {
      console.error('Failed to load inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">询盘管理</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { key: 'all', label: '全部', count: inquiries.length },
            { key: 'pending', label: '待报价', count: inquiries.filter(i => i.status === 'pending').length },
            { key: 'quoted', label: '已报价', count: inquiries.filter(i => i.status === 'quoted').length },
            { key: 'negotiating', label: '议价中', count: inquiries.filter(i => i.status === 'negotiating').length },
            { key: 'accepted', label: '已接受', count: inquiries.filter(i => i.status === 'accepted').length },
          ].map((stat) => (
            <button
              key={stat.key}
              onClick={() => setFilter(stat.key)}
              className={`p-4 rounded-xl border text-left ${filter === stat.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
            >
              <p className="text-2xl font-bold">{stat.count}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Inquiries Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">询盘号</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">产品</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">客户</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">需求</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">状态</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{inquiry.inquiry_number}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(inquiry.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium">{inquiry.product_name}</p>
                    {inquiry.supplier && (
                      <p className="text-xs text-slate-500">{inquiry.supplier.company_name}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{inquiry.customer_name}</p>
                    <p className="text-xs text-slate-500">{inquiry.customer_email}</p>
                    {inquiry.customer_company && (
                      <p className="text-xs text-slate-400">{inquiry.customer_company}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {inquiry.quantity_requested && (
                      <p>数量: {inquiry.quantity_requested}</p>
                    )}
                    {inquiry.target_price && (
                      <p>目标价: ¥{inquiry.target_price.toLocaleString()}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusConfig[inquiry.status]?.className}`}>
                      {statusConfig[inquiry.status]?.label}
                    </span>
                    {inquiry.quoted_price && (
                      <p className="text-xs text-slate-500 mt-1">
                        报价: ¥{inquiry.quoted_price.toLocaleString()}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedInquiry(inquiry)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">询盘详情</h3>
              <button 
                onClick={() => setSelectedInquiry(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">询盘号</p>
                  <p className="font-medium">{selectedInquiry.inquiry_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">状态</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${statusConfig[selectedInquiry.status]?.className}`}>
                    {statusConfig[selectedInquiry.status]?.label}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500">产品</p>
                <p className="font-medium">{selectedInquiry.product_name}</p>
                {selectedInquiry.supplier && (
                  <p className="text-sm text-slate-500">供应商: {selectedInquiry.supplier.company_name}</p>
                )}
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-2">客户信息</p>
                <p className="font-medium">{selectedInquiry.customer_name}</p>
                <p>{selectedInquiry.customer_email}</p>
                {selectedInquiry.customer_company && (
                  <p className="text-slate-600">{selectedInquiry.customer_company}</p>
                )}
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500 mb-2">需求详情</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedInquiry.quantity_requested && (
                    <div>
                      <span className="text-slate-500">请求数量:</span>{' '}
                      <span className="font-medium">{selectedInquiry.quantity_requested}</span>
                    </div>
                  )}
                  {selectedInquiry.target_price && (
                    <div>
                      <span className="text-slate-500">目标价格:</span>{' '}
                      <span className="font-medium">¥{selectedInquiry.target_price.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                {selectedInquiry.requirements && (
                  <div className="mt-2">
                    <span className="text-slate-500">特殊要求:</span>
                    <p className="mt-1">{selectedInquiry.requirements}</p>
                  </div>
                )}
              </div>

              {selectedInquiry.quoted_price && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-slate-500 mb-2">供应商报价</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">报价:</span>{' '}
                      <span className="font-bold text-lg">¥{selectedInquiry.quoted_price.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">数量:</span>{' '}
                      <span className="font-medium">{selectedInquiry.quoted_quantity}</span>
                    </div>
                  </div>
                  {selectedInquiry.quote_valid_until && (
                    <p className="text-sm text-slate-500 mt-2">
                      有效期至: {selectedInquiry.quote_valid_until}
                    </p>
                  )}
                  {selectedInquiry.supplier_notes && (
                    <p className="text-sm mt-2">{selectedInquiry.supplier_notes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
