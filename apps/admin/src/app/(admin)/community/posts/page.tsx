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

interface Post {
  id: string;
  title: string;
  post_type: string;
  category?: string;
  status: string;
  is_pinned: boolean;
  is_featured: boolean;
  view_count: number;
  like_count: number;
  comment_count: number;
  author_id?: string;
  author?: { full_name: string; avatar_url?: string };
  published_at?: string;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function PostsPage() {
  const supabase = createClient();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, pending: 0, hidden: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [postToAction, setPostToAction] = useState<Post | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [filterStatus, filterType, searchKeyword, page]);

  async function loadPosts() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('posts')
        .select(`
          id, title, post_type, category, status, is_pinned, is_featured,
          view_count, like_count, comment_count, author_id, published_at, created_at,
          profiles:author_id (full_name, avatar_url)
        `, { count: 'exact' })
        .is('deleted_at', null);
      
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      if (filterType) {
        query = query.eq('post_type', filterType);
      }
      if (searchKeyword) {
        query = query.ilike('title', `%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      const mappedPosts = (data || []).map((p: any) => ({
        ...p,
        author: p.profiles,
      }));
      
      setPosts(mappedPosts);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载帖子列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const [totalRes, publishedRes, pendingRes, hiddenRes] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'published'),
      supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending'),
      supabase.from('posts').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'hidden'),
    ]);
    
    setStats({
      total: totalRes.count || 0,
      published: publishedRes.count || 0,
      pending: pendingRes.count || 0,
      hidden: hiddenRes.count || 0,
    });
  }

  async function handleAction() {
    if (!postToAction || !actionType) return;
    
    setDialogLoading(true);
    try {
      let updateData: any = {};
      
      switch (actionType) {
        case 'publish':
          updateData = { status: 'published', published_at: new Date().toISOString() };
          break;
        case 'hide':
          updateData = { status: 'hidden' };
          break;
        case 'pin':
          updateData = { is_pinned: !postToAction.is_pinned };
          break;
        case 'feature':
          updateData = { is_featured: !postToAction.is_featured };
          break;
        case 'delete':
          updateData = { deleted_at: new Date().toISOString() };
          break;
      }
      
      const { error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postToAction.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'community',
        action: actionType,
        target_type: 'post',
        target_id: postToAction.id,
        target_name: postToAction.title,
        changes_summary: `${actionType}帖子: ${postToAction.title}`,
      });
      
      setShowActionDialog(false);
      setPostToAction(null);
      setActionType('');
      loadPosts();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  const typeLabels: Record<string, string> = {
    article: '文章',
    case: '病例',
    question: '问答',
    discussion: '讨论',
  };

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    published: '已发布',
    hidden: '已隐藏',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">社区帖子</h1>
          <p className="text-slate-500 mt-1">管理社区内容与帖子审核</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总帖子数" value={stats.total} />
        <StatCard label="已发布" value={stats.published} />
        <StatCard label="待审核" value={stats.pending} />
        <StatCard label="已隐藏" value={stats.hidden} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索帖子标题..."
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
              { value: 'draft', label: '草稿' },
            ]}
          />
          <Select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部类型' },
              { value: 'article', label: '文章' },
              { value: 'case', label: '病例' },
              { value: 'question', label: '问答' },
              { value: 'discussion', label: '讨论' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : posts.length === 0 ? (
          <EmptyState title="暂无帖子" description="当前筛选条件下没有找到帖子" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">帖子</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">作者</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">类型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">数据</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {post.is_pinned && <span className="text-amber-400 text-xs">置顶</span>}
                          {post.is_featured && <span className="text-emerald-400 text-xs">精选</span>}
                          <span className="font-medium text-slate-900 line-clamp-1">{post.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {post.author?.full_name || '匿名'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {typeLabels[post.post_type] || post.post_type}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span>浏览 {post.view_count}</span>
                          <span>点赞 {post.like_count}</span>
                          <span>评论 {post.comment_count}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {post.status === 'pending' && (
                            <Button size="sm" onClick={() => { setPostToAction(post); setActionType('publish'); setShowActionDialog(true); }}>
                              通过
                            </Button>
                          )}
                          {post.status === 'published' && (
                            <Button variant="ghost" size="sm" onClick={() => { setPostToAction(post); setActionType('hide'); setShowActionDialog(true); }}>
                              隐藏
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => { setPostToAction(post); setActionType('pin'); setShowActionDialog(true); }}>
                            {post.is_pinned ? '取消置顶' : '置顶'}
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
        title={actionType === 'publish' ? '发布帖子' : actionType === 'hide' ? '隐藏帖子' : actionType === 'pin' ? (postToAction?.is_pinned ? '取消置顶' : '置顶帖子') : '操作确认'}
        message={`确定要${actionType === 'publish' ? '发布' : actionType === 'hide' ? '隐藏' : actionType === 'pin' ? (postToAction?.is_pinned ? '取消置顶' : '置顶') : '操作'}帖子 "${postToAction?.title}" 吗？`}
        confirmText="确认"
        onConfirm={handleAction}
        onCancel={() => { setShowActionDialog(false); setPostToAction(null); setActionType(''); }}
        loading={dialogLoading}
        danger={actionType === 'hide'}
      />
    </div>
  );
}
