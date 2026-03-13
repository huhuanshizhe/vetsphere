'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/admin';
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
  StatCard,
  TableContainer,
  Pagination,
} from '@/components/ui';

interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  status: 'draft' | 'pending' | 'published' | 'offline';
  end_date?: string;
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
  site_views?: SiteView[];
}

interface SiteView {
  id: string;
  course_id: string;
  site_code: string;
  is_enabled: boolean;
  publish_status: 'draft' | 'published' | 'offline';
  title_override?: string;
  slug_override?: string;
  summary_override?: string;
  display_order: number;
  is_featured: boolean;
  published_at?: string;
  course?: Course;
}

type ViewTab = 'base' | 'site';

const PAGE_SIZE = 20;

export default function CoursesPage() {
  const supabase = createClient();
  const { currentSite } = useSite();
  const searchParams = useSearchParams();
  
  const [viewTab, setViewTab] = useState<ViewTab>('base');
  const [courses, setCourses] = useState<Course[]>([]);
  const [siteViews, setSiteViews] = useState<SiteView[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, published: 0, offline: 0 });
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || '');
  const [filterFormat, setFilterFormat] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // 弹窗状态
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [courseToChange, setCourseToChange] = useState<Course | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  
  const [showFeatureDialog, setShowFeatureDialog] = useState(false);
  const [courseToFeature, setCourseToFeature] = useState<Course | null>(null);
  
  // Site view 操作
  const [initLoading, setInitLoading] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState<string | null>(null);

  // 标准化状态值（兼容数据库 PascalCase）
  function normalizeStatus(status: string): string {
    return status?.toLowerCase() || '';
  }

  useEffect(() => {
    if (viewTab === 'base') {
      loadCourses();
      loadStats();
    } else {
      loadSiteViews();
    }
  }, [filterStatus, filterFormat, searchKeyword, page, viewTab, currentSite]);

  async function loadSiteViews() {
    setLoading(true);
    try {
      let query = supabase
        .from('course_site_views')
        .select(`*, course:courses(id, title, slug, status, format, level, cover_image_url, instructor_names)`)
        .eq('site_code', currentSite)
        .order('display_order', { ascending: true });

      if (filterStatus) {
        query = query.eq('publish_status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSiteViews(data || []);
    } catch (error) {
      console.error('加载站点视图失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInitSiteView(courseId: string) {
    setInitLoading(courseId);
    try {
      const { error } = await supabase
        .from('course_site_views')
        .upsert({
          course_id: courseId,
          site_code: currentSite,
          is_enabled: true,
          publish_status: 'draft',
        }, { onConflict: 'course_id,site_code' });

      if (error) throw error;
      loadCourses();
    } catch (error) {
      console.error('初始化站点视图失败:', error);
    } finally {
      setInitLoading(null);
    }
  }

  async function handleSiteViewPublish(siteViewId: string, action: 'published' | 'offline') {
    setPublishLoading(siteViewId);
    try {
      const updateData: any = { publish_status: action };
      if (action === 'published') updateData.published_at = new Date().toISOString();

      const { error } = await supabase
        .from('course_site_views')
        .update(updateData)
        .eq('id', siteViewId);

      if (error) throw error;
      loadSiteViews();
    } catch (error) {
      console.error('操作失败:', error);
    } finally {
      setPublishLoading(null);
    }
  }

  async function loadCourses() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('courses')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);
      
      if (filterStatus) {
        query = query.in('status', [filterStatus, filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)]);
      } else {
        // 默认不显示草稿（draft 仅 edu-partner 内部使用）— 兼容数据库 PascalCase
        query = query.in('status', ['pending', 'Pending', 'published', 'Published', 'offline', 'Offline']);
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
      
      // 标准化状态值为小写
      const normalized = (data || []).map(c => ({ ...c, status: c.status?.toLowerCase() || c.status }));
      setCourses(normalized);
      setTotal(count || 0);
      
      // Attach site view status for each course
      const ids = (data || []).map(c => c.id);
      if (ids.length > 0) {
        const { data: views } = await supabase
          .from('course_site_views')
          .select('course_id, site_code, publish_status, is_enabled')
          .in('course_id', ids);
        
        if (views) {
          const viewMap: Record<string, any[]> = {};
          views.forEach(v => {
            if (!viewMap[v.course_id]) viewMap[v.course_id] = [];
            viewMap[v.course_id].push(v);
          });
          setCourses(prev => prev.map(c => ({ ...c, site_views: viewMap[c.id] || [] })));
        }
      }
    } catch (error) {
      console.error('加载课程列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const allVisible = ['pending', 'Pending', 'published', 'Published', 'offline', 'Offline'];
      const [
        { count: totalCount },
        { count: pendingCount },
        { count: publishedCount },
        { count: offlineCount },
      ] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }).is('deleted_at', null).in('status', allVisible),
        supabase.from('courses').select('*', { count: 'exact', head: true }).is('deleted_at', null).in('status', ['pending', 'Pending']),
        supabase.from('courses').select('*', { count: 'exact', head: true }).is('deleted_at', null).in('status', ['published', 'Published']),
        supabase.from('courses').select('*', { count: 'exact', head: true }).is('deleted_at', null).in('status', ['offline', 'Offline']),
      ]);

      setStats({
        total: totalCount || 0,
        pending: pendingCount || 0,
        published: publishedCount || 0,
        offline: offlineCount || 0,
      });
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  }

  // 下架课程
  async function handleOffline() {
    if (!courseToChange) return;

    setDialogLoading(true);
    try {
      // 1. 删除该课程所有站点视图（使用API绕过RLS）
      const siteCodes = ['cn', 'intl'];
      for (const siteCode of siteCodes) {
        await fetch(`/api/v1/admin/courses/${courseToChange.id}/site-view?site_code=${siteCode}`, {
          method: 'DELETE',
        });
      }

      // 2. 更新课程状态为 offline
      const { error } = await supabase
        .from('courses')
        .update({
          status: 'offline',
          offline_reason: 'manual',
          offline_at: new Date().toISOString(),
        })
        .eq('id', courseToChange.id);

      if (error) throw error;
      
      // 3. 记录审计日志
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'course',
        action: 'offline',
        target_type: 'course',
        target_id: courseToChange.id,
        target_name: courseToChange.title,
        changes_summary: `手动下架课程: ${courseToChange.title}`,
      });
      
      setShowStatusDialog(false);
      setCourseToChange(null);
      loadCourses();
    } catch (error) {
      console.error('下架失败:', error);
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
    offline: '线下课程',
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
          <h1 className="text-2xl font-bold text-slate-900">课程管理</h1>
          <p className="text-slate-500 mt-1">管理平台课程内容</p>
        </div>
        <Button onClick={() => window.location.href = '/courses/new'}>
          新建课程
        </Button>
      </div>

      {/* 视图切换 Tab */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setViewTab('base'); setPage(1); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewTab === 'base'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Base 资源库
        </button>
        <button
          onClick={() => { setViewTab('site'); setPage(1); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewTab === 'site'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          {currentSite === 'cn' ? '🇨🇳 CN' : '🌐 INTL'} 站点视图
        </button>
      </div>

      {viewTab === 'base' ? (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="总课程数" value={stats.total} />
            <StatCard label="待审核" value={stats.pending} />
            <StatCard label="已上架" value={stats.published} />
            <StatCard label="已下架" value={stats.offline} />
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
                { value: 'pending', label: '待审核' },
                { value: 'published', label: '已上架' },
                { value: 'offline', label: '已下架' },
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
                { value: 'offline', label: '线下课程' },
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
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">课程</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">类型</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">难度</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">价格</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">站点视图</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {courses.map((course) => (
                    <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 rounded bg-slate-100 flex-shrink-0 overflow-hidden">
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
                            <a
                              href={`/courses/${course.id}`}
                              className="font-medium text-slate-900 line-clamp-1 hover:text-emerald-600 transition-colors cursor-pointer"
                            >
                              {course.title}
                            </a>
                            <div className="text-xs text-slate-500">{course.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">
                        {formatLabels[course.format] || course.format}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {course.level ? levelLabels[course.level] || course.level : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {course.price_cny !== null && course.price_cny !== undefined ? (
                          <div>
                            <span className="text-slate-900 font-medium">¥{course.price_cny}</span>
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
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            course.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            course.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {course.status === 'pending' ? '待审核' :
                             course.status === 'published' ? '已上架' : '已下架'}
                          </span>
                          {course.status === 'published' && course.end_date && (() => {
                            const daysLeft = Math.ceil((new Date(course.end_date).getTime() - Date.now()) / 86400000);
                            if (daysLeft < 0) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">已过期</span>;
                            if (daysLeft <= 7) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">即将到期</span>;
                            return null;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5">
                          {(course.site_views || []).map(sv => (
                            <span key={sv.site_code} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              sv.publish_status === 'published' ? 'bg-emerald-500/20 text-emerald-400' :
                              sv.publish_status === 'offline' ? 'bg-red-500/20 text-red-400' :
                              'bg-slate-500/20 text-slate-500'
                            }`}>
                              {sv.site_code.toUpperCase()}
                            </span>
                          ))}
                          {(!course.site_views || course.site_views.length === 0) && (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {course.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => window.location.href = `/courses/${course.id}`}
                            >
                              审核
                            </Button>
                          )}
                          {course.status === 'published' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCourseToChange(course);
                                setShowStatusDialog(true);
                              }}
                            >
                              下架
                            </Button>
                          )}
                          {course.status === 'offline' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => window.location.href = `/courses/${course.id}`}
                            >
                              编辑
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
        </>
      ) : (
        /* Site View Tab */
        <>
          <Card>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="搜索课程..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
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
                  onChange={(e) => setFilterStatus(e.target.value)}
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

          <Card padding="none">
            {loading ? (
              <LoadingState />
            ) : siteViews.length === 0 ? (
              <EmptyState
                icon="🌐"
                title={`暂无 ${currentSite.toUpperCase()} 站点视图`}
                description="请先在 Base 资源库中为课程初始化站点视图"
              />
            ) : (
              <TableContainer>
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">课程</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">覆盖标题</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">排序</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">推荐</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {siteViews.map((sv) => (
                      <tr key={sv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-medium text-slate-900 line-clamp-1">{sv.course?.title || sv.course_id}</span>
                            <div className="text-xs text-slate-500">{sv.course?.slug}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-sm">
                          {sv.title_override || <span className="text-slate-600">继承 Base</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{sv.display_order}</td>
                        <td className="px-6 py-4">
                          {sv.is_featured ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">推荐</span>
                          ) : (
                            <span className="text-slate-500 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            sv.publish_status === 'published' ? 'bg-emerald-500/20 text-emerald-400' :
                            sv.publish_status === 'offline' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-500/20 text-slate-500'
                          }`}>
                            {sv.publish_status === 'published' ? '已发布' : sv.publish_status === 'offline' ? '已下线' : '草稿'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sv.publish_status !== 'published' && (
                              <Button
                                size="sm"
                                loading={publishLoading === sv.id}
                                onClick={() => handleSiteViewPublish(sv.id, 'published')}
                              >
                                发布
                              </Button>
                            )}
                            {sv.publish_status === 'published' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={publishLoading === sv.id}
                                onClick={() => handleSiteViewPublish(sv.id, 'offline')}
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
            )}
          </Card>
        </>
      )}

      {/* 下架确认弹窗 */}
      <ConfirmDialog
        open={showStatusDialog}
        title="下架课程"
        message={`确定要下架课程「${courseToChange?.title}」吗？下架后该课程将从所有站点移除，用户无法访问。`}
        confirmText="确认下架"
        onConfirm={handleOffline}
        onCancel={() => {
          setShowStatusDialog(false);
          setCourseToChange(null);
        }}
        loading={dialogLoading}
        danger
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
