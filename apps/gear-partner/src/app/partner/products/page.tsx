'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: string;
  name: string;
  brand: string;
  price_min: number;
  price_max: number;
  status: string;
  has_price: boolean;
  created_at: string;
  published_at: string;
}

export default function PartnerProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchProducts();
  }, [filterStatus]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('请先登录');
        router.push('/login');
        return;
      }
      
      let query = supabase
        .from('products')
        .select('*');
      
      // Filter by supplier
      query = query.eq('supplier_id', user.id);
      
      // Status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('确定要删除这个商品吗？')) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .update({
          deleted_at: new Date().toISOString(),
          is_deleted: true,
          status: 'offline',
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
      
      if (error) throw error;
      
      alert('商品已删除');
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('删除失败');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending_review':
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'published':
      case 'Published':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
      case 'Draft':
        return '草稿';
      case 'pending_review':
      case 'Pending':
        return '审核中';
      case 'approved':
      case 'Approved':
        return '已通过';
      case 'rejected':
      case 'Rejected':
        return '已拒绝';
      case 'published':
      case 'Published':
        return '已发布';
      default:
        return status || '草稿';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
          <p className="text-gray-600 mt-1">管理您的所有商品</p>
        </div>
        <button
          onClick={() => router.push('/partner/products/new')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          发布商品
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="all">全部状态</option>
          <option value="draft">草稿</option>
          <option value="pending_review">审核中</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
          <option value="published">已发布</option>
        </select>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">暂无商品</p>
          <button
            onClick={() => router.push('/partner/products/new')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
          >
            发布第一个商品
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {product.name}
                </h3>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(product.status)}`}>
                  {getStatusLabel(product.status)}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>品牌:</span>
                  <span className="font-medium">{product.brand || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>价格:</span>
                  <span className="font-medium">
                    {!product.has_price ? '询单' : `$${product.price_min?.toFixed(2) || '0.00'} - $${product.price_max?.toFixed(2) || '0.00'}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>创建时间:</span>
                  <span>{new Date(product.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => router.push(`/partner/products/${product.id}/edit`)}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
