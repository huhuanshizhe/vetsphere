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
  user_id: string;
  name: string;
  email: string;
  company?: string;
  country?: string;
  message: string;
  status: string;
  created_at: string;
  product_name?: string;
}

export default function AdminShopInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchInquiries();
  }, [page, filterStatus]);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('product_inquiries')
        .select('*', { count: 'exact' });
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to).order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Fetch product names
      const productIds = data?.map(i => i.product_id) || [];
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds);
        
        const productMap = new Map(products?.map(p => [p.id, p.name]) || []);
        const inquiriesWithProducts = data?.map(i => ({
          ...i,
          product_name: productMap.get(i.product_id) || 'Unknown'
        }));
        
        setInquiries(inquiriesWithProducts || []);
      } else {
        setInquiries(data || []);
      }
      
      setTotal(count || 0);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    } finally {
      setLoading(false);
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

  const handleUpdateStatus = async (inquiryId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('product_inquiries')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', inquiryId);
      
      if (error) throw error;
      
      alert('询盘状态已更新');
      fetchInquiries();
    } catch (error) {
      console.error('Failed to update inquiry status:', error);
      alert('更新失败');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">询盘管理</h1>
        <p className="text-gray-600 mt-1">管理所有产品询盘</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
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
                    <select
                      value={inquiry.status}
                      onChange={(e) => handleUpdateStatus(inquiry.id, e.target.value)}
                      className="border border-gray-300 rounded-md text-xs px-2 py-1"
                    >
                      <option value="new">新询盘</option>
                      <option value="contacted">已联系</option>
                      <option value="quoted">已报价</option>
                      <option value="closed">已成交</option>
                      <option value="lost">已流失</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-700">
          共 {total} 个询盘，第 {page} 页 / 共 {Math.ceil(total / limit)} 页
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
