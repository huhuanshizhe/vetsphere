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

interface CourseReview {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  content?: string;
  status: string;
  is_anonymous: boolean;
  created_at: string;
  course?: { title: string };
  user?: { full_name: string; email: string };
}

const PAGE_SIZE = 20;

export default function CourseReviewsPage() {
  const supabase = createClient();

  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, pending: 0, avgRating: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRating, setFilterRating] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showActionDialog, setShowActionDialog] = useState(false);
  const [reviewToAction, setReviewToAction] = useState<CourseReview | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [filterStatus, filterRating, searchKeyword, page]);

  async function loadReviews() {
    setLoading(true);
    try {
      let query = supabase
        .from('course_reviews')
        .select(`
          id, course_id, user_id, rating, content, status, is_anonymous, created_at,
          courses:course_id(title),
          profiles:user_id(full_name, email)
        `, { count: 'exact' })
        .is('deleted_at', null);

      if (filterStatus) query = query.eq('status', filterStatus);
      if (filterRating) query = query.eq('rating', parseInt(filterRating));
      if (searchKeyword) query = query.ilike('content', `%${searchKeyword}%`);

      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });

      const { data, count, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((r: any) => ({
        ...r,
        course: Array.isArray(r.courses) ? r.courses[0] : r.courses,
        user: r.profiles,
      }));

      setReviews(mapped);
      setTotal(count || 0);

      // Stats
      const [totalRes, publishedRes, pendingRes, ratingRes] = await Promise.all([
        supabase.from('course_reviews').select('*', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('course_reviews').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'published'),
        supabase.from('course_reviews').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending'),
        supabase.from('course_reviews').select('rating').is('deleted_at', null).eq('status', 'published'),
      ]);

      const ratings = ratingRes.data || [];
      const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;

      setStats({
        total: totalRes.count || 0,
        published: publishedRes.count || 0,
        pending: pendingRes.count || 0,
        avgRating: Math.round(avgRating * 10) / 10,
      });
    } catch (error) {
      console.error('加载评价列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction() {
    if (!reviewToAction || !actionType) return;
    setDialogLoading(true);
    try {
      let updateData: any = {};
      switch (actionType) {
        case 'approve': updateData = { status: 'published' }; break;
        case 'hide': updateData = { status: 'hidden' }; break;
        case 'delete': updateData = { deleted_at: new Date().toISOString() }; break;
      }

      const { error } = await supabase.from('course_reviews').update(updateData).eq('id', reviewToAction.id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'course',
        action: actionType,
        target_type: 'course_review',
        target_id: reviewToAction.id,
        changes_summary: `${actionType}课程评价`,
      });

      setShowActionDialog(false);
      setReviewToAction(null);
      setActionType('');
      loadReviews();
    } catch (error) {
      console.error('操作失败:', error);
    } finally {
      setDialogLoading(false);
    }
  }

  function renderStars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-amber-400' : 'text-slate-600'}>★</span>
    ));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">课程评价</h1>
        <p className="text-slate-400 mt-1">管理课程评价与评分</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总评价数" value={stats.total} />
        <StatCard label="已发布" value={stats.published} />
        <StatCard label="待审核" value={stats.pending} />
        <StatCard label="平均评分" value={stats.avgRating} />
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索评价内容..."
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
          <Select
            value={filterRating}
            onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部评分' },
              { value: '5', label: '5 星' },
              { value: '4', label: '4 星' },
              { value: '3', label: '3 星' },
              { value: '2', label: '2 星' },
              { value: '1', label: '1 星' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : reviews.length === 0 ? (
          <EmptyState title="暂无评价" description="当前筛选条件下没有找到评价" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">课程</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">用户</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">评分</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">内容</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">时间</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {reviews.map((review) => (
                    <tr key={review.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-white text-sm max-w-[180px]">
                        <span className="line-clamp-1">{review.course?.title || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        {review.is_anonymous ? '匿名用户' : (review.user?.full_name || '-')}
                      </td>
                      <td className="px-6 py-4 text-sm">{renderStars(review.rating)}</td>
                      <td className="px-6 py-4 text-slate-400 text-sm max-w-[250px]">
                        <span className="line-clamp-2">{review.content || '-'}</span>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={review.status} /></td>
                      <td className="px-6 py-4 text-slate-500 text-xs">{new Date(review.created_at).toLocaleDateString('zh-CN')}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {review.status === 'pending' && (
                            <Button size="sm" onClick={() => { setReviewToAction(review); setActionType('approve'); setShowActionDialog(true); }}>通过</Button>
                          )}
                          {review.status === 'published' && (
                            <Button variant="ghost" size="sm" onClick={() => { setReviewToAction(review); setActionType('hide'); setShowActionDialog(true); }}>隐藏</Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => { setReviewToAction(review); setActionType('delete'); setShowActionDialog(true); }}>删除</Button>
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
        title={actionType === 'approve' ? '通过评价' : actionType === 'hide' ? '隐藏评价' : '删除评价'}
        message={`确定要${actionType === 'approve' ? '通过' : actionType === 'hide' ? '隐藏' : '删除'}这条评价吗？`}
        confirmText="确认"
        onConfirm={handleAction}
        onCancel={() => { setShowActionDialog(false); setReviewToAction(null); setActionType(''); }}
        loading={dialogLoading}
        danger={actionType === 'hide' || actionType === 'delete'}
      />
    </div>
  );
}
