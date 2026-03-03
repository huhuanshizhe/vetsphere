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
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface LearningProgress {
  id: string;
  user_id: string;
  course_id: string;
  chapter_id?: string;
  progress_percent: number;
  completed_chapters: number;
  total_chapters: number;
  last_study_at?: string;
  completed_at?: string;
  created_at: string;
  user?: { full_name: string; email: string; avatar_url?: string };
  course?: { title: string; cover_url?: string };
}

interface CourseReview {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  content: string;
  status: string;
  is_featured: boolean;
  helpful_count: number;
  created_at: string;
  user?: { full_name: string; avatar_url?: string };
  course?: { title: string };
}

const PAGE_SIZE = 20;

export default function LearningPage() {
  const supabase = createClient();
  
  const [activeTab, setActiveTab] = useState<'progress' | 'reviews'>('progress');
  const [progressList, setProgressList] = useState<LearningProgress[]>([]);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ 
    totalLearners: 0, 
    completedCount: 0, 
    avgProgress: 0,
    totalReviews: 0,
    avgRating: 0,
    pendingReviews: 0
  });
  const [filterCourse, setFilterCourse] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [courses, setCourses] = useState<{id: string; title: string}[]>([]);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (activeTab === 'progress') {
      loadProgress();
    } else {
      loadReviews();
    }
  }, [activeTab, filterCourse, filterStatus, searchKeyword, page]);

  async function loadCourses() {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .eq('status', 'published')
      .order('title');
    setCourses(data || []);
  }

  async function loadProgress() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('learning_progress')
        .select(`
          *,
          profiles:user_id (full_name, email, avatar_url),
          courses:course_id (title, cover_url)
        `, { count: 'exact' });
      
      if (filterCourse) {
        query = query.eq('course_id', filterCourse);
      }
      if (filterStatus === 'completed') {
        query = query.not('completed_at', 'is', null);
      } else if (filterStatus === 'in_progress') {
        query = query.is('completed_at', null).gt('progress_percent', 0);
      } else if (filterStatus === 'not_started') {
        query = query.eq('progress_percent', 0);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('last_study_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      const mappedData = (data || []).map((p: any) => ({
        ...p,
        user: p.profiles,
        course: p.courses,
      }));
      
      setProgressList(mappedData);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载学习进度失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('course_reviews')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url),
          courses:course_id (title)
        `, { count: 'exact' })
        .is('deleted_at', null);
      
      if (filterCourse) {
        query = query.eq('course_id', filterCourse);
      }
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
      
      const mappedData = (data || []).map((r: any) => ({
        ...r,
        user: r.profiles,
        course: r.courses,
      }));
      
      setReviews(mappedData);
      setTotal(count || 0);
    } catch (error) {
      console.error('加载评论列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const [totalRes, completedRes, progressRes, reviewsRes, pendingRes, ratingsRes] = await Promise.all([
      supabase.from('learning_progress').select('*', { count: 'exact', head: true }),
      supabase.from('learning_progress').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null),
      supabase.from('learning_progress').select('progress_percent'),
      supabase.from('course_reviews').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('course_reviews').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'pending'),
      supabase.from('course_reviews').select('rating').is('deleted_at', null),
    ]);
    
    let avgProgress = 0;
    if (progressRes.data && progressRes.data.length > 0) {
      const totalProgress = progressRes.data.reduce((sum, p) => sum + (p.progress_percent || 0), 0);
      avgProgress = Math.round(totalProgress / progressRes.data.length);
    }
    
    let avgRating = 0;
    if (ratingsRes.data && ratingsRes.data.length > 0) {
      const totalRating = ratingsRes.data.reduce((sum, r) => sum + (r.rating || 0), 0);
      avgRating = Math.round((totalRating / ratingsRes.data.length) * 10) / 10;
    }
    
    setStats({
      totalLearners: totalRes.count || 0,
      completedCount: completedRes.count || 0,
      avgProgress,
      totalReviews: reviewsRes.count || 0,
      avgRating,
      pendingReviews: pendingRes.count || 0,
    });
  }

  async function handleReviewAction(review: CourseReview, action: 'approve' | 'reject' | 'feature') {
    try {
      let updateData: any = {};
      
      if (action === 'approve') {
        updateData = { status: 'approved' };
      } else if (action === 'reject') {
        updateData = { status: 'rejected' };
      } else if (action === 'feature') {
        updateData = { is_featured: !review.is_featured };
      }
      
      const { error } = await supabase
        .from('course_reviews')
        .update(updateData)
        .eq('id', review.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'course',
        action: action,
        target_type: 'course_review',
        target_id: review.id,
        target_name: `评论 by ${review.user?.full_name}`,
        changes_summary: `${action}课程评论`,
      });
      
      loadReviews();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    }
  }

  const statusLabels: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">学习管理</h1>
        <p className="text-slate-400 mt-1">追踪学员学习进度与管理课程评论</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="学习人数" value={stats.totalLearners} />
        <StatCard label="完课人数" value={stats.completedCount} />
        <StatCard label="平均进度" value={`${stats.avgProgress}%`} />
        <StatCard label="总评论数" value={stats.totalReviews} />
        <StatCard label="平均评分" value={stats.avgRating.toFixed(1)} />
        <StatCard label="待审核" value={stats.pendingReviews} />
      </div>

      <div className="border-b border-slate-700">
        <nav className="flex gap-4">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'progress'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => { setActiveTab('progress'); setPage(1); setFilterStatus(''); }}
          >
            学习进度
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reviews'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => { setActiveTab('reviews'); setPage(1); setFilterStatus(''); }}
          >
            课程评论
          </button>
        </nav>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          {activeTab === 'reviews' && (
            <div className="flex-1">
              <Input
                placeholder="搜索评论内容..."
                value={searchKeyword}
                onChange={(e) => { setSearchKeyword(e.target.value); setPage(1); }}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
              />
            </div>
          )}
          <Select
            value={filterCourse}
            onChange={(e) => { setFilterCourse(e.target.value); setPage(1); }}
            options={[
              { value: '', label: '全部课程' },
              ...courses.map(c => ({ value: c.id, label: c.title })),
            ]}
          />
          <Select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            options={activeTab === 'progress' ? [
              { value: '', label: '全部状态' },
              { value: 'completed', label: '已完成' },
              { value: 'in_progress', label: '学习中' },
              { value: 'not_started', label: '未开始' },
            ] : [
              { value: '', label: '全部状态' },
              { value: 'pending', label: '待审核' },
              { value: 'approved', label: '已通过' },
              { value: 'rejected', label: '已拒绝' },
            ]}
          />
        </div>
      </Card>

      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : activeTab === 'progress' ? (
          progressList.length === 0 ? (
            <EmptyState title="暂无记录" description="当前筛选条件下没有找到学习进度记录" />
          ) : (
            <>
              <TableContainer>
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">学员</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">课程</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">进度</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">章节</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">最近学习</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {progressList.map((progress) => (
                      <tr key={progress.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                              {progress.user?.avatar_url ? (
                                <img src={progress.user.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg text-slate-400">{progress.user?.full_name?.[0] || '?'}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-white">{progress.user?.full_name || '未知'}</div>
                              <div className="text-slate-500 text-xs">{progress.user?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300 text-sm line-clamp-1">{progress.course?.title || '未知课程'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${progress.progress_percent}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-400">{progress.progress_percent}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {progress.completed_chapters}/{progress.total_chapters}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {progress.last_study_at
                            ? new Date(progress.last_study_at).toLocaleDateString('zh-CN')
                            : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            progress.completed_at
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : progress.progress_percent > 0
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {progress.completed_at ? '已完成' : progress.progress_percent > 0 ? '学习中' : '未开始'}
                          </span>
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
          )
        ) : reviews.length === 0 ? (
          <EmptyState title="暂无评论" description="当前筛选条件下没有找到课程评论" />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">用户</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">课程</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">评分</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">评论内容</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {reviews.map((review) => (
                    <tr key={review.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                            {review.user?.avatar_url ? (
                              <img src={review.user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm text-slate-400">{review.user?.full_name?.[0] || '?'}</span>
                            )}
                          </div>
                          <span className="text-slate-300 text-sm">{review.user?.full_name || '匿名'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300 text-sm line-clamp-1">{review.course?.title || '未知课程'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-4 h-4 ${star <= review.rating ? 'text-amber-400' : 'text-slate-600'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {review.is_featured && <span className="text-amber-400 text-xs">精选</span>}
                          <span className="text-slate-300 text-sm line-clamp-2 max-w-xs">{review.content}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          review.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : review.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {statusLabels[review.status] || review.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {review.status === 'pending' && (
                            <>
                              <Button size="sm" onClick={() => handleReviewAction(review, 'approve')}>
                                通过
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleReviewAction(review, 'reject')}>
                                拒绝
                              </Button>
                            </>
                          )}
                          {review.status === 'approved' && (
                            <Button variant="ghost" size="sm" onClick={() => handleReviewAction(review, 'feature')}>
                              {review.is_featured ? '取消精选' : '精选'}
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
              <div className="px-6 py-4 border-t border-slate-700/50">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
