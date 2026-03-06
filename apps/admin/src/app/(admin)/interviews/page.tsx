'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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

interface Interview {
  id: string;
  title: string;
  interviewee_name: string;
  interviewee_title?: string;
  interviewee_avatar?: string;
  category?: string;
  status: string;
  is_featured: boolean;
  view_count: number;
  published_at?: string;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function InterviewsPage() {
  const supabase = createClient();
  
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, pending: 0, featured: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [interviewToAction, setInterviewToAction] = useState<Interview | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadInterviews();
  }, [filterStatus, filterCategory, searchKeyword, page]);

  async function loadInterviews() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('interviews')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);
      
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      if (filterCategory) {
        query = query.eq('category', filterCategory);
      }
      if (searchKeyword) {
        query = query.or(`title.ilike.%${searchKeyword}%,interviewee_name.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setInterviews(data || []);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载访谈列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const [totalRes, publishedRes, pendingRes, featuredRes] = await Promise.all([
      supabase.from('interviews').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('interviews').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'published'),
      supabase.from('interviews').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending'),
      supabase.from('interviews').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_featured', true),
    ]);
    
    setStats({
      total: totalRes.count || 0,
      published: publishedRes.count || 0,
      pending: pendingRes.count || 0,
      featured: featuredRes.count || 0,
    });
  }

  async function handleAction() {
    if (!interviewToAction || !actionType) return;
    
    setDialogLoading(true);
    try {
      let updateData: any = {};
      
      switch (actionType) {
        case 'publish':
          updateData = { status: 'published', published_at: new Date().toISOString() };
          break;
        case 'unpublish':
          updateData = { status: 'draft' };
          break;
        case 'feature':
          updateData = { is_featured: !interviewToAction.is_featured };
          break;
        case 'delete':
          updateData = { deleted_at: new Date().toISOString() };
          break;
      }
      
      const { error } = await supabase
        .from('interviews')
        .update(updateData)
        .eq('id', interviewToAction.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'content',
        action: actionType,
        target_type: 'interview',
        target_id: interviewToAction.id,
        target_name: interviewToAction.title,
        changes_summary: `${actionType}访谈: ${interviewToAction.title}`,
      });
      
      setShowActionDialog(false);
      setInterviewToAction(null);
      setActionType('');
      loadInterviews();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  const categoryLabels: Record<string, string> = {
    expert: '专家访谈',
    founder: '创始人',
    industry: '行业洞察',
    technology: '技术前沿',
  };

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    published: '已发布',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">访谈管理</h1>
          <p className="text-slate-500 mt-1">管理专家访谈与行业洞察内容</p>
        </div>
        <Button onClick={() => window.location.href = '/interviews/new'}>
          新建访谈
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总访谈数" value={stats.total} />
        <StatCard label="已发布" value={stats.published} />
        <StatCard label="待审核" value={stats.pending} />
        <StatCard label="精选" value={stats.featured} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索访谈标题或受访者..."
              value={searchKeyword}
              onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部状态' },
              { value: 'published', label: '已发布' },
              { value: 'pending', label: '待审核' },
              { value: 'draft', label: '草稿' },
            ]}
          />
          <Select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部类型' },
              { value: 'expert', label: '专家访谈' },
              { value: 'founder', label: '创始人' },
              { value: 'industry', label: '行业洞察' },
              { value: 'technology', label: '技术前沿' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : interviews.length === 0 ? (
          <EmptyState title="暂无访谈" description="当前筛选条件下没有找到访谈" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">访谈</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">受访者</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">类型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">浏览量</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {interviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {interview.is_featured && <span className="text-amber-400 text-xs">精选</span>}
                          <span className="font-medium text-slate-900 line-clamp-1">{interview.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                            {interview.interviewee_avatar ? (
                              <img src={interview.interviewee_avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm text-slate-500">{interview.interviewee_name?.[0]}</span>
                            )}
                          </div>
                          <div>
                            <div className="text-slate-600 text-sm">{interview.interviewee_name}</div>
                            {interview.interviewee_title && (
                              <div className="text-slate-500 text-xs">{interview.interviewee_title}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {categoryLabels[interview.category || ''] || interview.category || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {interview.view_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={interview.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {interview.status !== 'published' && (
                            <Button size="sm" onClick={() => { setInterviewToAction(interview); setActionType('publish'); setShowActionDialog(true); }}>
                              发布
                            </Button>
                          )}
                          {interview.status === 'published' && (
                            <Button variant="ghost" size="sm" onClick={() => { setInterviewToAction(interview); setActionType('unpublish'); setShowActionDialog(true); }}>
                              下架
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => { setInterviewToAction(interview); setActionType('feature'); setShowActionDialog(true); }}>
                            {interview.is_featured ? '取消精选' : '精选'}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => window.location.href = `/interviews/${interview.id}`}>
                            编辑
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200/50">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={showActionDialog}
        title={actionType === 'publish' ? '发布访谈' : actionType === 'unpublish' ? '下架访谈' : actionType === 'feature' ? (interviewToAction?.is_featured ? '取消精选' : '设为精选') : '操作确认'}
        message={`确定要${actionType === 'publish' ? '发布' : actionType === 'unpublish' ? '下架' : actionType === 'feature' ? (interviewToAction?.is_featured ? '取消精选' : '设为精选') : '操作'}访谈 "${interviewToAction?.title}" 吗？`}
        confirmText="确认"
        onConfirm={handleAction}
        onCancel={() => { setShowActionDialog(false); setInterviewToAction(null); setActionType(''); }}
        loading={dialogLoading}
        danger={actionType === 'unpublish' || actionType === 'delete'}
      />
    </div>
  );
}
