'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DebugProductsPage() {
  const supabase = createClient();
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setRawData(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误：{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">产品数据调试</h1>
      
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
        <h2 className="font-bold text-red-800 mb-2">⚠️ 重要检查：</h2>
        <p className="text-red-700">请检查产品的 <code className="bg-red-100 px-2 py-1 rounded">status</code> 字段值是什么！</p>
        <p className="text-red-700 mt-2">Admin 后台期望的值：<code className="bg-red-100 px-2 py-1 rounded">pending_review</code></p>
        <p className="text-red-700">供应商后台提交的值可能是：<code className="bg-red-100 px-2 py-1 rounded">Pending</code></p>
      </div>

      <table className="w-full border-collapse bg-white shadow-md">
        <thead>
          <tr className="bg-slate-100">
            <th className="border p-2 text-left">ID</th>
            <th className="border p-2 text-left">名称</th>
            <th className="border p-2 text-left">status 值</th>
            <th className="border p-2 text-left">supplier_id</th>
            <th className="border p-2 text-left">匹配检查</th>
          </tr>
        </thead>
        <tbody>
          {rawData.map(product => (
            <tr key={product.id}>
              <td className="border p-2 font-mono text-xs">{product.id}</td>
              <td className="border p-2">{product.name}</td>
              <td className="border p-2 font-mono text-sm bg-yellow-50">
                {product.status}
                <br/>
                <span className="text-xs text-gray-500">
                  (类型：{typeof product.status})
                </span>
              </td>
              <td className="border p-2 text-xs">{product.supplier_id?.slice(0, 8)}...</td>
              <td className="border p-2">
                {product.status === 'pending_review' ? (
                  <span className="text-green-600 font-bold">✓ 匹配</span>
                ) : product.status === 'Pending' ? (
                  <span className="text-red-600 font-bold">✕ 不匹配！应该是 pending_review</span>
                ) : (
                  <span className="text-amber-600">?</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h2 className="font-bold text-blue-800 mb-2">📊 统计：</h2>
        <pre className="bg-white p-3 rounded font-mono text-sm">
          {JSON.stringify(
            rawData.reduce((acc, p) => {
              acc[p.status] = (acc[p.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
}
