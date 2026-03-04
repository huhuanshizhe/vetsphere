'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  Button,
  Input,
  Select,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface CourseProductRelation {
  id: string;
  course_id: string;
  product_id: string;
  relation_type: string;
  recommendation_reason?: string;
  display_order: number;
  created_at: string;
  course?: { id: string; title: string; slug: string; status: string };
  product?: { id: string; name: string; slug: string; status: string; brand?: string };
}

const PAGE_SIZE = 20;

export default function CourseProductLinkingPage() {
  const supabase = createClient();

  const [relations, setRelations] = useState<CourseProductRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 新建关联
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [addForm, setAddForm] = useState({ course_id: '', product_id: '', relation_type: 'recommended', recommendation_reason: '', display_order: 0 });
  const [dialogLoading, setDialogLoading] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [relationToDelete, setRelationToDelete] = useState<CourseProductRelation | null>(null);

  useEffect(() => {
    loadRelations();
  }, [searchKeyword, filterType, page]);

  async function loadRelations() {
    setLoading(true);
    try {
      let query = supabase
        .from('course_product_relations')
        .select(`
          id, course_id, product_id, relation_type, recommendation_reason, display_order, created_at,
          course:courses!course_id(id, title, slug, status),
          product:products!product_id(id, name, slug, status, brand)
        `, { count: 'exact' });

      if (filterType) {
        query = query.eq('relation_type', filterType);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((r: any) => ({
        ...r,
        course: Array.isArray(r.course) ? r.course[0] : r.course,
        product: Array.isArray(r.product) ? r.product[0] : r.product,
      }));

      setRelations(mapped);
      setTotal(count || 0);
      setStats({ total: count || 0 });
    } catch (error) {
      console.error('加载关联列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function openAddDialog() {
    setAddForm({ course_id: '', product_id: '', relation_type: 'recommended', recommendation_reason: '', display_order: 0 });
    setShowAddDialog(true);

    // Load courses and products for selection
    const [coursesRes, productsRes] = await Promise.all([
      supabase.from('courses').select('id, title').eq('status', 'published').is('deleted_at', null).order('title').limit(200),
      supabase.from('products').select('id, name').eq('status', 'published').is('deleted_at', null).order('name').limit(200),
    ]);

    setCourses(coursesRes.data || []);
    setProducts(productsRes.data || []);
  }

  async function handleAdd() {
    if (!addForm.course_id || !addForm.product_id) return;
    setDialogLoading(true);
    try {
      const { error } = await supabase.from('course_product_relations').insert({
        course_id: addForm.course_id,
        product_id: addForm.product_id,
        relation_type: addForm.relation_type,
        recommendation_reason: addForm.recommendation_reason || null,
        display_order: addForm.display_order,
      });
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'course_product',
        action: 'link',
        target_type: 'course_product_relation',
        changes_summary: '创建课程-商品关联',
      });

      setShowAddDialog(false);
      loadRelations();
    } catch (error) {
      console.error('创建关联失败:', error);
      alert('创建失败，可能关联已存在');
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleDelete() {
    if (!relationToDelete) return;
    setDialogLoading(true);
    try {
      const { error } = await supabase.from('course_product_relations').delete().eq('id', relationToDelete.id);
      if (error) throw error;
      setShowDeleteDialog(false);
      setRelationToDelete(null);
      loadRelations();
    } catch (error) {
      console.error('删除失败:', error);
    } finally {
      setDialogLoading(false);
    }
  }

  const typeLabels: Record<string, string> = {
    recommended: '推荐搭配',
    required: '必需配套',
    optional: '可选配套',
    related: '相关联动',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">课程-商品关联</h1>
          <p className="text-slate-400 mt-1">管理课程与商品之间的推荐关联关系</p>
        </div>
        <Button onClick={openAddDialog}>新建关联</Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <StatCard label="总关联数" value={stats.total} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索课程或商品名称..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              options={[
                { value: '', label: '全部类型' },
                { value: 'recommended', label: '推荐搭配' },
                { value: 'required', label: '必需配套' },
                { value: 'optional', label: '可选配套' },
                { value: 'related', label: '相关联动' },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : relations.length === 0 ? (
          <EmptyState title="暂无关联" description="点击上方按钮创建课程-商品关联" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">课程</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-300">关系</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">商品</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">推荐理由</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">排序</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {relations.map((rel) => (
                    <tr key={rel.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-white font-medium text-sm line-clamp-1">{rel.course?.title || rel.course_id.slice(0, 8)}</span>
                          <div className="text-xs text-slate-500">{rel.course?.slug}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                          {typeLabels[rel.relation_type] || rel.relation_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="text-white font-medium text-sm line-clamp-1">{rel.product?.name || rel.product_id.slice(0, 8)}</span>
                          <div className="text-xs text-slate-500">{rel.product?.brand}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm max-w-[200px]">
                        <span className="line-clamp-2">{rel.recommendation_reason || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{rel.display_order}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setRelationToDelete(rel); setShowDeleteDialog(true); }}>
                          删除
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-700/50">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>

      {/* 新建关联对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddDialog(false)} />
          <div className="relative bg-slate-950 border border-slate-700/50 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">新建课程-商品关联</h3>
            <div className="space-y-4">
              <Select
                label="选择课程 *"
                value={addForm.course_id}
                onChange={(e) => setAddForm(f => ({ ...f, course_id: e.target.value }))}
                options={[
                  { value: '', label: '请选择课程...' },
                  ...courses.map(c => ({ value: c.id, label: c.title })),
                ]}
              />
              <Select
                label="选择商品 *"
                value={addForm.product_id}
                onChange={(e) => setAddForm(f => ({ ...f, product_id: e.target.value }))}
                options={[
                  { value: '', label: '请选择商品...' },
                  ...products.map(p => ({ value: p.id, label: p.name })),
                ]}
              />
              <Select
                label="关联类型"
                value={addForm.relation_type}
                onChange={(e) => setAddForm(f => ({ ...f, relation_type: e.target.value }))}
                options={[
                  { value: 'recommended', label: '推荐搭配' },
                  { value: 'required', label: '必需配套' },
                  { value: 'optional', label: '可选配套' },
                  { value: 'related', label: '相关联动' },
                ]}
              />
              <Input
                label="推荐理由"
                value={addForm.recommendation_reason}
                onChange={(e) => setAddForm(f => ({ ...f, recommendation_reason: e.target.value }))}
                placeholder="为什么推荐这个搭配？"
              />
              <Input
                label="排序"
                type="number"
                value={String(addForm.display_order)}
                onChange={(e) => setAddForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowAddDialog(false)}>取消</Button>
              <Button onClick={handleAdd} loading={dialogLoading} disabled={!addForm.course_id || !addForm.product_id}>创建关联</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="删除关联"
        message={`确定要删除课程 "${relationToDelete?.course?.title}" 与商品 "${relationToDelete?.product?.name}" 的关联吗？`}
        confirmText="确认删除"
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteDialog(false); setRelationToDelete(null); }}
        loading={dialogLoading}
        danger
      />
    </div>
  );
}
