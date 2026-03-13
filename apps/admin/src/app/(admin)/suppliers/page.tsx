'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Supplier {
  id: string;
  company_name: string;
  company_name_zh?: string;
  email: string;
  phone?: string;
  website?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  is_verified: boolean;
  rating: number;
  total_orders: number;
  created_at: string;
  rejection_reason?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: '待审核', className: 'bg-amber-100 text-amber-600' },
  approved: { label: '已通过', className: 'bg-emerald-100 text-emerald-600' },
  rejected: { label: '已拒绝', className: 'bg-red-100 text-red-600' },
  suspended: { label: '已暂停', className: 'bg-slate-100 text-slate-600' },
};

export default function AdminSuppliersPage() {
  const supabase = createClient();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, [filter]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (supplierId: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ 
          status: 'approved', 
          is_verified: true,
          rejection_reason: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', supplierId);

      if (error) throw error;
      loadSuppliers();
      alert('供应商已通过审核');
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('操作失败');
    }
  };

  const handleReject = async (supplierId: string) => {
    if (!rejectionReason.trim()) {
      alert('请输入拒绝原因');
      return;
    }
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ 
          status: 'rejected', 
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString() 
        })
        .eq('id', supplierId);

      if (error) throw error;
      setRejectionReason('');
      setSelectedSupplier(null);
      loadSuppliers();
      alert('供应商已拒绝');
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('操作失败');
    }
  };

  const handleSuspend = async (supplierId: string) => {
    if (!confirm('确定要暂停该供应商吗？')) return;
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ 
          status: 'suspended',
          updated_at: new Date().toISOString() 
        })
        .eq('id', supplierId);

      if (error) throw error;
      loadSuppliers();
      alert('供应商已暂停');
    } catch (error) {
      console.error('Failed to suspend:', error);
      alert('操作失败');
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
          <h1 className="text-2xl font-bold text-slate-900">供应商管理</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { key: 'all', label: '全部', count: suppliers.length },
            { key: 'pending', label: '待审核', count: suppliers.filter(s => s.status === 'pending').length },
            { key: 'approved', label: '已通过', count: suppliers.filter(s => s.status === 'approved').length },
            { key: 'suspended', label: '已暂停', count: suppliers.filter(s => s.status === 'suspended').length },
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

        {/* Suppliers Table */}
        <div className="bg-white rounded-xl border border-slate-200">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">公司</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">联系信息</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">评分</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">状态</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{supplier.company_name}</p>
                    {supplier.company_name_zh && (
                      <p className="text-xs text-slate-500">{supplier.company_name_zh}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <p>{supplier.email}</p>
                    {supplier.phone && <p className="text-slate-500">{supplier.phone}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span>{supplier.rating}</span>
                      <span className="text-slate-400 text-xs">({supplier.total_orders} 订单)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusConfig[supplier.status]?.className}`}>
                      {statusConfig[supplier.status]?.label}
                    </span>
                    {supplier.rejection_reason && (
                      <p className="text-xs text-red-500 mt-1">{supplier.rejection_reason}</p>
                    )}
                    {supplier.is_verified && (
                      <span className="ml-2 text-xs text-emerald-600">✓ 已认证</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {supplier.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApprove(supplier.id)}
                            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
                          >
                            通过
                          </button>
                          <button 
                            onClick={() => setSelectedSupplier(supplier)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            拒绝
                          </button>
                        </>
                      )}
                      {supplier.status === 'approved' && (
                        <button 
                          onClick={() => handleSuspend(supplier.id)}
                          className="px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-700"
                        >
                          暂停
                        </button>
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
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">拒绝供应商</h3>
            <p className="text-sm text-slate-600 mb-4">公司: {selectedSupplier.company_name}</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="请输入拒绝原因..."
              className="w-full p-3 border border-slate-200 rounded-lg mb-4"
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setSelectedSupplier(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                取消
              </button>
              <button 
                onClick={() => handleReject(selectedSupplier.id)}
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
