'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  pricing_mode: 'fixed' | 'inquiry';
  stock_quantity: number;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'published';
  supplier_id?: string;
  image_url?: string;
  created_at: string;
  published_at?: string;
  rejection_reason?: string;
  supplier?: {
    company_name: string;
  };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-slate-100 text-slate-600' },
  pending_review: { label: '待审核', className: 'bg-amber-100 text-amber-600' },
  approved: { label: '已通过', className: 'bg-emerald-100 text-emerald-600' },
  rejected: { label: '已拒绝', className: 'bg-red-100 text-red-600' },
  published: { label: '已发布', className: 'bg-blue-100 text-blue-600' },
};

export default function AdminProductsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadProducts();
  }, [filter]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*, supplier:suppliers(company_name)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          status: 'approved', 
          rejection_reason: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', productId);

      if (error) throw error;
      loadProducts();
      alert('产品已通过审核');
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('操作失败');
    }
  };

  const handleReject = async (productId: string) => {
    if (!rejectionReason.trim()) {
      alert('请输入拒绝原因');
      return;
    }
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          status: 'rejected', 
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString() 
        })
        .eq('id', productId);

      if (error) throw error;
      setRejectionReason('');
      setSelectedProduct(null);
      loadProducts();
      alert('产品已拒绝');
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('操作失败');
    }
  };

  const handlePublishToSite = async (productId: string, site: 'cn' | 'intl') => {
    try {
      // Check if site view exists
      const { data: existing } = await supabase
        .from('product_site_views')
        .select('id')
        .eq('product_id', productId)
        .eq('site', site)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('product_site_views')
          .update({ 
            status: 'published',
            published_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('product_site_views')
          .insert({
            product_id: productId,
            site: site,
            status: 'published',
            published_at: new Date().toISOString()
          });
        if (error) throw error;
      }

      // Update product status to published
      const { error: productError } = await supabase
        .from('products')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (productError) throw productError;

      loadProducts();
      alert(`已发布到 ${site === 'cn' ? '中国站' : '国际站'}`);
    } catch (error) {
      console.error('Failed to publish:', error);
      alert('发布失败');
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
          <h1 className="text-2xl font-bold text-slate-900">产品管理</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { key: 'all', label: '全部', count: products.length },
            { key: 'pending_review', label: '待审核', count: products.filter(p => p.status === 'pending_review').length },
            { key: 'approved', label: '已通过', count: products.filter(p => p.status === 'approved').length },
            { key: 'published', label: '已发布', count: products.filter(p => p.status === 'published').length },
            { key: 'rejected', label: '已拒绝', count: products.filter(p => p.status === 'rejected').length },
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

        {/* Products Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">产品</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">供应商</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">价格</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">状态</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-200"></div>
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-slate-500">SKU: {product.sku || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{product.supplier?.company_name || '-'}</td>
                  <td className="px-6 py-4">
                    {product.pricing_mode === 'fixed' ? (
                      <span>¥{product.price?.toLocaleString()}</span>
                    ) : (
                      <span className="text-slate-500">询价</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusConfig[product.status]?.className}`}>
                      {statusConfig[product.status]?.label}
                    </span>
                    {product.rejection_reason && (
                      <p className="text-xs text-red-500 mt-1">{product.rejection_reason}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {product.status === 'pending_review' && (
                        <>
                          <button 
                            onClick={() => handleApprove(product.id)}
                            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
                          >
                            通过
                          </button>
                          <button 
                            onClick={() => setSelectedProduct(product)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            拒绝
                          </button>
                        </>
                      )}
                      {product.status === 'approved' && (
                        <>
                          <button 
                            onClick={() => handlePublishToSite(product.id, 'cn')}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            发布到中国站
                          </button>
                          <button 
                            onClick={() => handlePublishToSite(product.id, 'intl')}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                          >
                            发布到国际站
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">拒绝产品</h3>
            <p className="text-sm text-slate-600 mb-4">产品: {selectedProduct.name}</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="请输入拒绝原因..."
              className="w-full p-3 border border-slate-200 rounded-lg mb-4"
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button 
                onClick={() => handleReject(selectedProduct.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
