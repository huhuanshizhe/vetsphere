'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/admin';
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

interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  status: 'draft' | 'published' | 'offline';
  format: string;
  level?: string;
  duration_minutes?: number;
  price_cny?: number;
  original_price_cny?: number;
  cover_image_url?: string;
  is_featured: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
  instructor_names?: string[];
}

const PAGE_SIZE = 20;

export default function CoursesPage() {
  const supabase = createClient();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, featured: 0 });
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterFormat, setFilterFormat] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // 弹窗状态
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [courseToChange, setCourseToChange] = useState<Course | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [dialogLoading, setDialogLoading] = useState(false);
  
  const [showFeatureDialog, setShowFeatureDialog] = useState(false);
  const [courseToFeature, setCourseToFeature] = useState<Course | null>(null);

  useEffect(() => {
    loadCourses();
  }, [filterStatus, filterFormat, searchKeyword, page]);

  async function loadCourses() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('courses')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);
      
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      
      if (filterFormat) {
        query = query.eq('format', filterFormat);
      }
      
      if (searchKeyword) {
        query = query.or(`title.ilike.%${searchKeyword}%,slug.ilike.%${searchKeyword}%`);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('created_at', { ascending: false });
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setCourses(data || []);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载课程列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    const { count: totalCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);
    
    const { count: publishedCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'published');
    
    const { count: draftCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'draft');
    
    const { count: featuredCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('is_featured', true);
    
    setStats({
      total: totalCount || 0,
      published: publishedCount || 0,
      draft: draftCount || 0,
      featured: featuredCount || 0,
    });
  }

  // 变更状态
  async function handleChangeStatus() {
    if (!courseToChange || !newStatus) return;
    
    setDialogLoading(true);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'published') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.published_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', courseToChange.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'course',
        action: newStatus === 'published' ? 'publish' : 'offline',
        target_type: 'course',
        target_id: courseToChange.id,
        target_name: courseToChange.title,
        changes_summary: `${newStatus === 'published' ? '发布' : '下线'}课程: ${courseToChange.title}`,
      });
      
      setShowStatusDialog(false);
      setCourseToChange(null);
      setNewStatus('');
      loadCourses();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  // 切换推荐
  async function handleToggleFeature() {
    if (!courseToFeature) return;
    
    setDialogLoading(true);
    try {
      const newFeatured = !courseToFeature.is_featured;
      
      const { error } = await supabase
        .from('courses')
        .update({ is_featured: newFeatured })
        .eq('id', courseToFeature.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'course',
        action: newFeatured ? 'feature' : 'unfeature',
        target_type: 'course',
        target_id: courseToFeature.id,
        target_name: courseToFeature.title,
        changes_summary: `${newFeatured ? '设为推荐' : '取消推荐'}: ${courseToFeature.title}`,
      });
      
      setShowFeatureDialog(false);
      setCourseToFeature(null);
      loadCourses();
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  const formatLabels: Record<string, string> = {
    video: '视频课程',
    live: '直播课程',
    article: '图文课程',
    series: '系列课程',
  };

  const levelLabels: Record<string, string> = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">课程管理</h1>
          <p className="text-slate-400 mt-1">管理平台课程内容</p>
        </div>
        <Button onClick={() => window.location.href = '/courses/new'}>
          新建课程
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总课程数" value={stats.total} />
        <StatCard label="已发布" value={stats.published} />
        <StatCard label="草稿" value={stats.draft} />
        <StatCard label="推荐课程" value={stats.featured} />
      </div>

      {/* 筛选栏 */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="搜索课程标题..."
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
          <div className="w-full md:w-40">
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
          <div className="w-full md:w-40">
            <Select
              value={filterFormat}
              onChange={(e) => {
                setFilterFormat(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: '全部类型' },
                { value: 'video', label: '视频课程' },
                { value: 'live', label: '直播课程' },
                { value: 'article', label: '图文课程' },
                { value: 'series', label: '系列课程' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* 课程列表 */}
      <Card padding="none">
        {loading ? (
          <LoadingState />
        ) : courses.length === 0 ? (
          <EmptyState
            title="暂无课程"
            description="点击上方按钮创建第一个课程"
          />
        ) : (
          <>
            <TableContainer>
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">课程</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">类型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">难度</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">价格</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">推荐</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 rounded bg-slate-700 flex-shrink-0 overflow-hidden">
                            {course.cover_image_url ? (
                              <img src={course.cover_image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-white line-clamp-1">{course.title}</span>
                            <div className="text-xs text-slate-500">{course.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        {formatLabels[course.format] || course.format}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {course.level ? levelLabels[course.level] || course.level : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {course.price_cny !== null && course.price_cny !== undefined ? (
                          <div>
                            <span className="text-white font-medium">¥{course.price_cny}</span>
                            {course.original_price_cny && course.original_price_cny > course.price_cny && (
                              <span className="text-slate-500 text-xs line-through ml-2">
                                ¥{course.original_price_cny}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-400">免费</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={course.status} />
                      </td>
                      <td className="px-6 py-4">
                        {course.is_featured ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                            推荐
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => window.location.href = `/courses/${course.id}`}
                          >
                            编辑
                          </Button>
                          {course.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setCourseToChange(course);
                                setNewStatus('published');
                                setShowStatusDialog(true);
                              }}
                            >
                              发布
                            </Button>
                          )}
                          {course.status === 'published' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCourseToFeature(course);
                                  setShowFeatureDialog(true);
                                }}
                              >
                                {course.is_featured ? '取消推荐' : '推荐'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCourseToChange(course);
                                  setNewStatus('offline');
                                  setShowStatusDialog(true);
                                }}
                              >
                                下线
                              </Button>
                            </>
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

      {/* 状态变更确认弹窗 */}
      <ConfirmDialog
        open={showStatusDialog}
        title={newStatus === 'published' ? '发布课程' : '下线课程'}
        message={
          newStatus === 'published'
            ? `确定要发布课程 "${courseToChange?.title}" 吗？发布后用户即可访问。`
            : `确定要下线课程 "${courseToChange?.title}" 吗？下线后用户将无法访问。`
        }
        confirmText={newStatus === 'published' ? '确认发布' : '确认下线'}
        onConfirm={handleChangeStatus}
        onCancel={() => {
          setShowStatusDialog(false);
          setCourseToChange(null);
          setNewStatus('');
        }}
        loading={dialogLoading}
        danger={newStatus === 'offline'}
      />

      {/* 推荐确认弹窗 */}
      <ConfirmDialog
        open={showFeatureDialog}
        title={courseToFeature?.is_featured ? '取消推荐' : '设为推荐'}
        message={
          courseToFeature?.is_featured
            ? `确定要取消课程 "${courseToFeature?.title}" 的推荐状态吗？`
            : `确定要将课程 "${courseToFeature?.title}" 设为推荐吗？推荐课程将在首页展示。`
        }
        confirmText={courseToFeature?.is_featured ? '取消推荐' : '确认推荐'}
        onConfirm={handleToggleFeature}
        onCancel={() => {
          setShowFeatureDialog(false);
          setCourseToFeature(null);
        }}
        loading={dialogLoading}
      />
    </div>
  );
}
