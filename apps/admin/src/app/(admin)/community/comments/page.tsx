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

interface Comment {
  id: string;
  post_id: string;
  parent_id?: string;
  author_id: string;
  content: string;
  status: string;
  like_count: number;
  created_at: string;
  post?: { title: string };
  author?: { full_name: string; avatar_url?: string };
}

const PAGE_SIZE = 20;

export default function CommentsPage() {
  const supabase = createClient();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, pending: 0, hidden: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showActionDialog, setShowActionDialog] = useState(false);
  const [commentToAction, setCommentToAction] = useState<Comment | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadComments();
  }, [filterStatus, searchKeyword, page]);

  async function loadComments() {
    setLoading(true);
    try {
      let query = supabase
        .from('comments')
        .select(`
          id, post_id, parent_id, author_id, content, status, like_count, created_at,
          post:posts!post_id(title),
          profiles:author_id(full_name, avatar_url)
        `, { count: 'exact' })
        .is('deleted_at', null);

      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      if (searchKeyword) {
        query = query.ilike('content', `%${searchKeyword}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((c: any) => ({
        ...c,
        post: Array.isArray(c.post) ? c.post[0] : c.post,
        author: c.profiles,
      }));

      setComments(mapped);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载评论列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const [totalRes, publishedRes, pendingRes, hiddenRes] = await Promise.all([
      supabase.from('comments').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('comments').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'published'),
      supabase.from('comments').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending'),
      supabase.from('comments').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'hidden'),
    ]);
    setStats({
      total: totalRes.count || 0,
      published: publishedRes.count || 0,
      pending: pendingRes.count || 0,
      hidden: hiddenRes.count || 0,
    });
  }

  async function handleAction() {
    if (!commentToAction || !actionType) return;
    setDialogLoading(true);
    try {
      let updateData: any = {};
      switch (actionType) {
        case 'approve': updateData = { status: 'published' }; break;
        case 'hide': updateData = { status: 'hidden' }; break;
        case 'delete': updateData = { deleted_at: new Date().toISOString() }; break;
      }

      const { error } = await supabase.from('comments').update(updateData).eq('id', commentToAction.id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'community',
        action: actionType,
        target_type: 'comment',
        target_id: commentToAction.id,
        changes_summary: `${actionType}评论: ${commentToAction.content.slice(0, 50)}`,
      });

      setShowActionDialog(false);
      setCommentToAction(null);
      setActionType('');
      loadComments();
    } catch (error) {
      console.error('操作失败:', error);
    } finally {
      setDialogLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">评论管理</h1>
        <p className="text-slate-400 mt-1">管理社区帖子评论与审核</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总评论数" value={stats.total} />
        <StatCard label="已发布" value={stats.published} />
        <StatCard label="待审核" value={stats.pending} />
        <StatCard label="已隐藏" value={stats.hidden} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索评论内容..."
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
              { value: 'hidden', label: '已隐藏' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : comments.length === 0 ? (
          <EmptyState title="暂无评论" description="当前筛选条件下没有找到评论" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">内容</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">作者</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">所属帖子</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">点赞</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">时间</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {comments.map((comment) => (
                    <tr key={comment.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 max-w-[300px]">
                        <span className="text-white text-sm line-clamp-2">{comment.content}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm">{comment.author?.full_name || '匿名'}</td>
                      <td className="px-6 py-4 text-slate-400 text-sm max-w-[200px]">
                        <span className="line-clamp-1">{comment.post?.title || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">{comment.like_count}</td>
                      <td className="px-6 py-4"><StatusBadge status={comment.status} /></td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{new Date(comment.created_at).toLocaleString('zh-CN')}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {comment.status === 'pending' && (
                            <Button size="sm" onClick={() => { setCommentToAction(comment); setActionType('approve'); setShowActionDialog(true); }}>通过</Button>
                          )}
                          {comment.status === 'published' && (
                            <Button variant="ghost" size="sm" onClick={() => { setCommentToAction(comment); setActionType('hide'); setShowActionDialog(true); }}>隐藏</Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => { setCommentToAction(comment); setActionType('delete'); setShowActionDialog(true); }}>删除</Button>
                        </div>
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

      <ConfirmDialog
        open={showActionDialog}
        title={actionType === 'approve' ? '通过评论' : actionType === 'hide' ? '隐藏评论' : '删除评论'}
        message={`确定要${actionType === 'approve' ? '通过' : actionType === 'hide' ? '隐藏' : '删除'}这条评论吗？`}
        confirmText="确认"
        onConfirm={handleAction}
        onCancel={() => { setShowActionDialog(false); setCommentToAction(null); setActionType(''); }}
        loading={dialogLoading}
        danger={actionType === 'hide' || actionType === 'delete'}
      />
    </div>
  );
}
