'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Inquiry {
  id: string;
  product_id: string;
  user_id?: string;
  name: string;
  email: string;
  company?: string;
  country?: string;
  phone?: string;
  message: string;
  status: string;
  reply?: string;
  replied_at?: string;
  created_at: string;
  updated_at: string;
  product_name?: string;
}

export default function PartnerInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    fetchInquiries();
  }, [filterStatus]);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      
      // Get current user (supplier)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      let query = supabase
        .from('product_inquiries')
        .select('*', { count: 'exact' });
      
      // Get all products from this supplier
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('supplier_id', user.id);
      
      const productIds = products?.map(p => p.id) || [];
      
      if (productIds.length > 0) {
        query = query.in('product_id', productIds);
      } else {
        // No products, no inquiries
        setInquiries([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Fetch product names
      const productIdsSet = new Set(data?.map(i => i.product_id) || []);
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name')
        .in('id', Array.from(productIdsSet));
      
      const productMap = new Map(productsData?.map(p => [p.id, p.name]) || []);
      const inquiriesWithProducts = data?.map(i => ({
        ...i,
        product_name: productMap.get(i.product_id) || 'Unknown Product'
      }));
      
      setInquiries(inquiriesWithProducts || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const [total, setTotal] = useState(0);

  const handleReply = async (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setReplyContent(inquiry.reply || '');
    setShowReplyModal(true);
  };

  const submitReply = async () => {
    if (!selectedInquiry) return;
    
    try {
      const { error } = await supabase
        .from('product_inquiries')
        .update({
          reply: replyContent,
          replied_at: new Date().toISOString(),
          status: 'quoted',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedInquiry.id);
      
      if (error) throw error;
      
      alert('回复已发送');
      setShowReplyModal(false);
      fetchInquiries();
    } catch (error) {
      console.error('Failed to send reply:', error);
      alert('回复失败');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      quoted: 'bg-purple-100 text-purple-800',
      closed: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">询盘管理</h1>
        <p className="text-gray-600 mt-1">管理客户对您商品的询盘</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="all">全部状态</option>
          <option value="new">新询盘</option>
          <option value="contacted">已联系</option>
          <option value="quoted">已报价</option>
          <option value="closed">已成交</option>
          <option value="lost">已流失</option>
        </select>
      </div>

      {/* Inquiries Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">询盘信息</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">产品</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户信息</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : inquiries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  暂无询盘
                </td>
              </tr>
            ) : (
              inquiries.map((inquiry) => (
                <tr key={inquiry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{inquiry.name}</div>
                    <div className="text-sm text-gray-500">{inquiry.email}</div>
                    <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                      {inquiry.message}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="max-w-xs truncate" title={inquiry.product_name}>
                      {inquiry.product_name || 'Unknown Product'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {inquiry.company && <div>{inquiry.company}</div>}
                    {inquiry.country && <div>{inquiry.country}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleReply(inquiry)}
                      className="text-emerald-600 hover:text-emerald-900"
                    >
                      {inquiry.reply ? '查看/回复' : '回复'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">回复询盘</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600 mb-2">
                <strong>客户:</strong> {selectedInquiry.name} ({selectedInquiry.email})
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <strong>产品:</strong> {selectedInquiry.product_name}
              </div>
              <div className="text-sm text-gray-600">
                <strong>询盘内容:</strong>
                <p className="mt-1">{selectedInquiry.message}</p>
              </div>
              {selectedInquiry.reply && (
                <div className="mt-3 pt-3 border-t">
                  <strong>之前的回复:</strong>
                  <p className="mt-1 text-gray-700">{selectedInquiry.reply}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    回复时间：{new Date(selectedInquiry.replied_at || '').toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                回复内容
              </label>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="请输入您的回复..."
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowReplyModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={submitReply}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                发送回复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
