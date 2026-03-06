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

interface Course {
  id: string;
  title: string;
  slug: string;
}

interface Chapter {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  video_url?: string;
  duration_minutes: number;
  sort_order: number;
  is_free: boolean;
  is_preview: boolean;
  status: string;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function ChaptersPage() {
  const supabase = createClient();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, totalMinutes: 0 });
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [chapterToEdit, setChapterToEdit] = useState<Partial<Chapter> | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadChapters();
    } else {
      setChapters([]);
      setTotal(0);
    }
  }, [selectedCourse, filterStatus, page]);

  async function loadCourses() {
    const { data } = await supabase
      .from('courses')
      .select('id, title, slug')
      .is('deleted_at', null)
      .order('title');
    setCourses(data || []);
  }

  async function loadChapters() {
    setLoading(true);
    
    try {
      let query = supabase
        .from('course_chapters')
        .select('*', { count: 'exact' })
        .eq('course_id', selectedCourse)
        .is('deleted_at', null);
      
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1).order('sort_order');
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setChapters(data || []);
      setTotal(count || 0);
      await loadStats();
    } catch (error) {
      console.error('加载章节列表失败:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    if (!selectedCourse) return;
    
    const [totalRes, publishedRes, draftRes, durationRes] = await Promise.all([
      supabase.from('course_chapters').select('*', { count: 'exact', head: true }).eq('course_id', selectedCourse).is('deleted_at', null),
      supabase.from('course_chapters').select('*', { count: 'exact', head: true }).eq('course_id', selectedCourse).is('deleted_at', null).eq('status', 'published'),
      supabase.from('course_chapters').select('*', { count: 'exact', head: true }).eq('course_id', selectedCourse).is('deleted_at', null).eq('status', 'draft'),
      supabase.from('course_chapters').select('duration_minutes').eq('course_id', selectedCourse).is('deleted_at', null),
    ]);
    
    const totalMinutes = durationRes.data?.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) || 0;
    
    setStats({
      total: totalRes.count || 0,
      published: publishedRes.count || 0,
      draft: draftRes.count || 0,
      totalMinutes,
    });
  }

  async function handleSaveChapter() {
    if (!chapterToEdit || !selectedCourse) return;
    
    setDialogLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (chapterToEdit.id) {
        const { error } = await supabase
          .from('course_chapters')
          .update({
            title: chapterToEdit.title,
            description: chapterToEdit.description,
            video_url: chapterToEdit.video_url,
            duration_minutes: chapterToEdit.duration_minutes,
            sort_order: chapterToEdit.sort_order,
            is_free: chapterToEdit.is_free,
            is_preview: chapterToEdit.is_preview,
            status: chapterToEdit.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', chapterToEdit.id);
        
        if (error) throw error;
      } else {
        // 获取最大排序号
        const { data: maxOrder } = await supabase
          .from('course_chapters')
          .select('sort_order')
          .eq('course_id', selectedCourse)
          .order('sort_order', { ascending: false })
          .limit(1)
          .single();
        
        const { error } = await supabase
          .from('course_chapters')
          .insert({
            course_id: selectedCourse,
            title: chapterToEdit.title,
            description: chapterToEdit.description,
            video_url: chapterToEdit.video_url,
            duration_minutes: chapterToEdit.duration_minutes || 0,
            sort_order: (maxOrder?.sort_order || 0) + 1,
            is_free: chapterToEdit.is_free || false,
            is_preview: chapterToEdit.is_preview || false,
            status: chapterToEdit.status || 'draft',
          });
        
        if (error) throw error;
      }
      
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'course',
        action: chapterToEdit.id ? 'update' : 'create',
        target_type: 'course_chapter',
        target_id: chapterToEdit.id || chapterToEdit.title,
        target_name: chapterToEdit.title,
        changes_summary: `${chapterToEdit.id ? '更新' : '创建'}章节: ${chapterToEdit.title}`,
      });
      
      setShowEditDialog(false);
      setChapterToEdit(null);
      loadChapters();
      
      // 更新课程总时长
      await updateCourseDuration();
    } catch (error) {
      console.error('保存章节失败:', error);
      alert('保存失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  async function handleDeleteChapter() {
    if (!chapterToDelete) return;
    
    setDialogLoading(true);
    try {
      const { error } = await supabase
        .from('course_chapters')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', chapterToDelete.id);
      
      if (error) throw error;
      
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'course',
        action: 'delete',
        target_type: 'course_chapter',
        target_id: chapterToDelete.id,
        target_name: chapterToDelete.title,
        changes_summary: `删除章节: ${chapterToDelete.title}`,
      });
      
      setShowDeleteDialog(false);
      setChapterToDelete(null);
      loadChapters();
      await updateCourseDuration();
    } catch (error) {
      console.error('删除章节失败:', error);
      alert('删除失败，请重试');
    } finally {
      setDialogLoading(false);
    }
  }

  async function updateCourseDuration() {
    if (!selectedCourse) return;
    
    const { data } = await supabase
      .from('course_chapters')
      .select('duration_minutes')
      .eq('course_id', selectedCourse)
      .eq('status', 'published')
      .is('deleted_at', null);
    
    const totalMinutes = data?.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) || 0;
    
    await supabase
      .from('courses')
      .update({ duration_minutes: totalMinutes })
      .eq('id', selectedCourse);
  }

  async function handleMoveChapter(chapter: Chapter, direction: 'up' | 'down') {
    const currentIndex = chapters.findIndex(c => c.id === chapter.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === chapters.length - 1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetChapter = chapters[targetIndex];
    
    // 交换排序号
    await Promise.all([
      supabase.from('course_chapters').update({ sort_order: targetChapter.sort_order }).eq('id', chapter.id),
      supabase.from('course_chapters').update({ sort_order: chapter.sort_order }).eq('id', targetChapter.id),
    ]);
    
    loadChapters();
  }

  function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
    }
    return `${mins}分钟`;
  }

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">章节管理</h1>
          <p className="text-slate-500 mt-1">管理课程章节内容与排序</p>
        </div>
        {selectedCourse && (
          <Button onClick={() => {
            setChapterToEdit({
              title: '',
              description: '',
              video_url: '',
              duration_minutes: 0,
              is_free: false,
              is_preview: false,
              status: 'draft',
            });
            setShowEditDialog(true);
          }}>
            添加章节
          </Button>
        )}
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Select
              value={selectedCourse}
              onChange={(e) => { setSelectedCourse(e.target.value); setPage(1); }}
              options={[
                { value: '', label: '-- 请选择课程 --' },
                ...courses.map(c => ({ value: c.id, label: c.title })),
              ]}
            />
          </div>
          {selectedCourse && (
            <Select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              options={[
                { value: '', label: '全部状态' },
                { value: 'published', label: '已发布' },
                { value: 'draft', label: '草稿' },
              ]}
            />
          )}
        </div>
      </Card>

      {selectedCourse && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="总章节数" value={stats.total} />
            <StatCard label="已发布" value={stats.published} />
            <StatCard label="草稿" value={stats.draft} />
            <StatCard label="总时长" value={formatDuration(stats.totalMinutes)} />
          </div>

          <Card padding="none">
            {loading ? (
              <LoadingState />
            ) : chapters.length === 0 ? (
              <EmptyState title="暂无章节" description="请点击上方按钮添加章节" />
            ) : (
              <>
                <TableContainer>
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 w-16">序号</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">章节</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">时长</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">属性</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {chapters.map((chapter, index) => (
                        <tr key={chapter.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-500">
                            <div className="flex items-center gap-1">
                              <span>{chapter.sort_order}</span>
                              <div className="flex flex-col">
                                <button
                                  onClick={() => handleMoveChapter(chapter, 'up')}
                                  disabled={index === 0}
                                  className="text-slate-500 hover:text-slate-900 disabled:opacity-30"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleMoveChapter(chapter, 'down')}
                                  disabled={index === chapters.length - 1}
                                  className="text-slate-500 hover:text-slate-900 disabled:opacity-30"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-slate-900">{chapter.title}</div>
                              {chapter.description && (
                                <div className="text-slate-500 text-xs mt-1 line-clamp-1">{chapter.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-sm">
                            {chapter.duration_minutes ? formatDuration(chapter.duration_minutes) : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {chapter.is_free && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                  免费
                                </span>
                              )}
                              {chapter.is_preview && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                                  试看
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              chapter.status === 'published'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-500/20 text-slate-500'
                            }`}>
                              {statusLabels[chapter.status] || chapter.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="secondary" size="sm" onClick={() => { setChapterToEdit(chapter); setShowEditDialog(true); }}>
                                编辑
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setChapterToDelete(chapter); setShowDeleteDialog(true); }}>
                                删除
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
        </>
      )}

      {!selectedCourse && (
        <Card>
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-slate-600 mb-2">请先选择课程</h3>
            <p className="text-slate-500">选择一个课程后，可以管理该课程的章节内容</p>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="删除章节"
        message={`确定要删除章节 "${chapterToDelete?.title}" 吗？此操作不可恢复。`}
        confirmText="删除"
        onConfirm={handleDeleteChapter}
        onCancel={() => { setShowDeleteDialog(false); setChapterToDelete(null); }}
        loading={dialogLoading}
        danger
      />

      {showEditDialog && chapterToEdit && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {chapterToEdit.id ? '编辑章节' : '添加章节'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">章节标题 *</label>
                <Input
                  value={chapterToEdit.title || ''}
                  onChange={(e) => setChapterToEdit({ ...chapterToEdit, title: e.target.value })}
                  placeholder="输入章节标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">章节描述</label>
                <textarea
                  value={chapterToEdit.description || ''}
                  onChange={(e) => setChapterToEdit({ ...chapterToEdit, description: e.target.value })}
                  className="w-full h-24 bg-slate-900 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="输入章节描述"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">视频链接</label>
                <Input
                  value={chapterToEdit.video_url || ''}
                  onChange={(e) => setChapterToEdit({ ...chapterToEdit, video_url: e.target.value })}
                  placeholder="输入视频URL"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">时长(分钟)</label>
                  <Input
                    type="number"
                    value={chapterToEdit.duration_minutes || ''}
                    onChange={(e) => setChapterToEdit({ ...chapterToEdit, duration_minutes: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">状态</label>
                  <Select
                    value={chapterToEdit.status || 'draft'}
                    onChange={(e) => setChapterToEdit({ ...chapterToEdit, status: e.target.value })}
                    options={[
                      { value: 'draft', label: '草稿' },
                      { value: 'published', label: '已发布' },
                    ]}
                  />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chapterToEdit.is_free || false}
                    onChange={(e) => setChapterToEdit({ ...chapterToEdit, is_free: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-200 bg-slate-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">免费章节</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chapterToEdit.is_preview || false}
                    onChange={(e) => setChapterToEdit({ ...chapterToEdit, is_preview: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-200 bg-slate-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">允许试看</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowEditDialog(false); setChapterToEdit(null); }}>
                取消
              </Button>
              <Button onClick={handleSaveChapter} disabled={dialogLoading || !chapterToEdit.title}>
                {dialogLoading ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
