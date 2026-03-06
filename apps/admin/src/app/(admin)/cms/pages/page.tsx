'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CmsPage, STATUS_COLORS, STATUS_LABELS } from '@/types/admin';
import {
  Card,
  Button,
  Input,
  Select,
  StatusBadge,
  LoadingState,
  EmptyState,
  ConfirmDialog,
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

const PAGE_SIZE = 20;

export default function CmsPagesPage() {
  const supabase = createClient();
  
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // 弹窗状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPage, setNewPage] = useState({ page_key: '', name: '', title: '', description: '' });
  const [dialogLoading, setDialogLoading] = useState(false);
  
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pageToChange, setPageToChange] = useState<CmsPage | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');

  useEffect(() => {
    loadPages();
  }, [filterStatus, searchKeyword, page]);

  async function loadPages() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('cms_pages')
        .select('*', { count: 'exact' });
      
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      
      if (searchKeyword) {
        query = query.or(`name.ilike.%${searchKeyword}%,page_key.ilike.%${searchKeyword}%,title.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setPages(data || []);
      setTotal(count || 0);
      
      await loadStats();
    } catch (error) {
      console.error('加载页面列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const { count: totalCount } = await supabase
      .from('cms_pages')
      .select('*', { count: 'exact', head: true });
    
    const { count: publishedCount } = await supabase
      .from('cms_pages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');
    
    const { count: draftCount } = await supabase
      .from('cms_pages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');
    
    setStats({
      total: totalCount || 0,
      published: publishedCount || 0,
      draft: draftCount || 0,
    });
  }

  async function handleCreatePage() {
    if (!newPage.page_key || !newPage.name) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('cms_pages')
        .insert({
          page_key: newPage.page_key,
          name: newPage.name,
          title: newPage.title,
          description: newPage.description,
          status: 'draft',
          version: 1,
        });
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'cms',
        action: 'create',
        target_type: 'cms_page',
        target_name: newPage.name,
        changes_summary: `创建CMS页面: ${newPage.name}`,
      });
      
      setShowCreateDialog(false);
      setNewPage({ page_key: '', name: '', title: '', description: '' });
      loadPages();
    } catch (error) {
      console.error('创建失败:', error);
      alert('创建失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleChangeStatus() {
    if (!pageToChange || !newStatus) return;
    
    setDialogLoading(true);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'published') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.published_at = new Date().toISOString();
        updateData.published_by = user?.id;
      }
      
      const { error } = await supabase
        .from('cms_pages')
        .update(updateData)
        .eq('id', pageToChange.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'cms',
        action: newStatus === 'published' ? 'publish' : 'offline',
        target_type: 'cms_page',
        target_id: pageToChange.id,
        target_name: pageToChange.name,
        changes_summary: `${newStatus === 'published' ? '发布' : '下线'}页面: ${pageToChange.name}`,
      });
      
      setShowStatusDialog(false);
      setPageToChange(null);
      setNewStatus('');
      loadPages();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CMS 页面管理</h1>
          <p className="text-slate-500 mt-1">管理网站落地页、内容页配置</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          新建页面
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="总页面数" value={stats.total} />
        <StatCard label="已发布" value={stats.published} />
        <StatCard label="草稿" value={stats.draft} />
      </div>

      {/* 筛选栏 */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索页面名称、标识..."
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(1);
              }}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部状态' },
                { value: 'draft', label: '草稿' },
                { value: 'published', label: '已发布' },
                { value: 'offline', label: '已下线' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : pages.length === 0 ? (
          <EmptyState
            title="暂无页面"
            description="点击上方按钮创建第一个CMS页面"
          />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">页面名称</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">页面标识</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">标题</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">版本</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">更新时间</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {pages.map((cmsPage) => (
                    <tr key={cmsPage.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900">{cmsPage.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm text-slate-500 bg-white px-2 py-1 rounded">
                          {cmsPage.page_key}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {cmsPage.title || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={cmsPage.status} />
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        v{cmsPage.version}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(cmsPage.updated_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => window.location.href = `/cms/pages/${cmsPage.id}`}
                          >
                            编辑
                          </Button>
                          {cmsPage.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setPageToChange(cmsPage);
                                setNewStatus('published');
                                setShowStatusDialog(true);
                              }}
                            >
                              发布
                            </Button>
                          )}
                          {cmsPage.status === 'published' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPageToChange(cmsPage);
                                setNewStatus('offline');
                                setShowStatusDialog(true);
                              }}
                            >
                              下线
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200/50">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* 新建页面弹窗 */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">新建CMS页面</h3>
            
            <div className="space-y-4">
              <Input
                label="页面标识"
                placeholder="如: homepage, about-us"
                value={newPage.page_key}
                onChange={(e) => setNewPage(prev => ({ ...prev, page_key: e.target.value }))}
              />
              <Input
                label="页面名称"
                placeholder="如: 首页, 关于我们"
                value={newPage.name}
                onChange={(e) => setNewPage(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label="页面标题（可选）"
                placeholder="浏览器标题"
                value={newPage.title}
                onChange={(e) => setNewPage(prev => ({ ...prev, title: e.target.value }))}
              />
              <Input
                label="描述（可选）"
                placeholder="页面描述"
                value={newPage.description}
                onChange={(e) => setNewPage(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewPage({ page_key: '', name: '', title: '', description: '' });
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleCreatePage}
                loading={dialogLoading}
                disabled={!newPage.page_key || !newPage.name}
              >
                创建
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 状态变更确认弹窗 */}
      <ConfirmDialog
        open={showStatusDialog}
        title={newStatus === 'published' ? '发布页面' : '下线页面'}
        message={
          newStatus === 'published'
            ? `确定要发布页面 "${pageToChange?.name}" 吗？发布后用户即可访问。`
            : `确定要下线页面 "${pageToChange?.name}" 吗？下线后用户将无法访问。`
        }
        confirmText={newStatus === 'published' ? '确认发布' : '确认下线'}
        onConfirm={handleChangeStatus}
        onCancel={() => {
          setShowStatusDialog(false);
          setPageToChange(null);
          setNewStatus('');
        }}
        loading={dialogLoading}
        danger={newStatus === 'offline'}
      />
    </div>
  );
}
