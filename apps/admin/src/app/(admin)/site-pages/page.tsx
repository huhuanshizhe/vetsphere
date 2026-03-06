'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSite } from '@/context/SiteContext';
import {
  Card,
  Button,
  Input,
  Select,
  StatusBadge,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  TableContainer,
} from '@/components/ui';

interface SitePage {
  id: string;
  site_code: string;
  page_key: string;
  title: string;
  subtitle?: string;
  seo_title?: string;
  seo_description?: string;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export default function SitePagesPage() {
  const supabase = createClient();
  const { currentSite, siteLabel } = useSite();

  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  // 新建弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newPage, setNewPage] = useState({ page_key: '', title: '', subtitle: '' });

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<SitePage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadPages();
  }, [currentSite, filterStatus]);

  async function loadPages() {
    setLoading(true);
    try {
      let query = supabase
        .from('site_pages')
        .select('*')
        .eq('site_code', currentSite)
        .order('updated_at', { ascending: false });

      if (filterStatus) query = query.eq('status', filterStatus);

      const { data, error } = await query;
      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('加载站点页面失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newPage.page_key || !newPage.title) return;
    setCreateLoading(true);
    try {
      const { error } = await supabase.from('site_pages').insert({
        site_code: currentSite,
        page_key: newPage.page_key,
        title: newPage.title,
        subtitle: newPage.subtitle || null,
        status: 'draft',
      });
      if (error) throw error;
      setShowCreate(false);
      setNewPage({ page_key: '', title: '', subtitle: '' });
      loadPages();
    } catch (error) {
      console.error('创建失败:', error);
      alert('创建失败，page_key 可能已存在');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handlePublish(page: SitePage) {
    try {
      const { error } = await supabase
        .from('site_pages')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', page.id);
      if (error) throw error;
      loadPages();
    } catch (error) {
      console.error('发布失败:', error);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('site_pages').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      loadPages();
    } catch (error) {
      console.error('删除失败:', error);
    } finally {
      setDeleteLoading(false);
    }
  }

  const statusMap: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">站点页面管理</h1>
          <p className="text-slate-500 mt-1">管理 {siteLabel} 的定制页面内容</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>新建页面</Button>
      </div>

      <Card>
        <div className="flex gap-4">
          <div className="w-40">
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: '', label: '全部状态' },
                { value: 'draft', label: '草稿' },
                { value: 'published', label: '已发布' },
                { value: 'archived', label: '已归档' },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : pages.length === 0 ? (
          <EmptyState
            icon="🌐"
            title="暂无站点页面"
            description={`为 ${siteLabel} 创建定制化页面内容`}
            action={<Button onClick={() => setShowCreate(true)}>创建第一个页面</Button>}
          />
        ) : (
          <TableContainer>
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">页面标识</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">标题</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">更新时间</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <code className="text-xs bg-white px-2 py-1 rounded text-emerald-400">{page.page_key}</code>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-medium text-slate-900">{page.title}</span>
                        {page.subtitle && <div className="text-xs text-slate-500 mt-0.5">{page.subtitle}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        page.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' :
                        page.status === 'archived' ? 'bg-slate-500/20 text-slate-500' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {statusMap[page.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(page.updated_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {page.status === 'draft' && (
                          <Button size="sm" onClick={() => handlePublish(page)}>发布</Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteTarget(page)}
                        >
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Card>

      {/* 新建页面弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative bg-slate-950 border border-slate-200/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">新建站点页面</h3>
            <div className="space-y-4">
              <Input
                label="页面标识 (page_key)"
                placeholder="e.g. home, about, pricing"
                value={newPage.page_key}
                onChange={(e) => setNewPage(prev => ({ ...prev, page_key: e.target.value }))}
              />
              <Input
                label="页面标题"
                placeholder="页面标题"
                value={newPage.title}
                onChange={(e) => setNewPage(prev => ({ ...prev, title: e.target.value }))}
              />
              <Input
                label="副标题 (可选)"
                placeholder="副标题"
                value={newPage.subtitle}
                onChange={(e) => setNewPage(prev => ({ ...prev, subtitle: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>取消</Button>
              <Button onClick={handleCreate} loading={createLoading}>创建</Button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除页面"
        message={`确定要删除页面 "${deleteTarget?.title}" 吗？此操作不可恢复。`}
        confirmText="确认删除"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
        danger
      />
    </div>
  );
}
