'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, getErrorMessage } from '@/lib/api-client';
import CourseProductRelationsEditor from '@/components/CourseProductRelationsEditor';
import {
  COURSE_SITE_OPTIONS,
  createDefaultCourseSiteViewDraft,
  mapCourseSiteViewToDraft,
  type CourseSiteViewDraft,
} from '@/lib/course-site-view';
import {
  type CourseChapterSummary,
  type CourseInstructorRelationSummary,
  type CourseInstructorSummary,
} from '@/lib/course-structured-content';
import {
  summarizeCourseWorkflow,
  type CourseWorkflowStepId,
} from '@/lib/course-workflow';
import { Course, CourseStatus, Specialty } from '@vetsphere/shared/types';
import { Card, Button, LoadingState, ConfirmDialog, ToastContainer, useToast } from '@/components/ui';

type Lang = 'en' | 'zh' | 'th' | 'ja';
type CourseWithSiteViews = Course & {
  site_views?: Array<Record<string, any>>;
  chapter_summary?: CourseChapterSummary;
  course_instructors?: CourseInstructorRelationSummary[];
};
type InstructorOption = CourseInstructorSummary & { specialty?: string; is_active?: boolean };

const COURSE_STATUSES: CourseStatus[] = ['draft', 'pending', 'published', 'offline'];
const COURSE_INSTRUCTOR_ROLE_OPTIONS = [
  { value: 'instructor', label: '主讲 / Lecturer' },
  { value: 'assistant', label: '助教 / Assistant' },
  { value: 'guest', label: '特邀 / Guest' },
] as const;

function normalizeCourseStatus(status: string): CourseStatus {
  const normalized = status.toLowerCase();
  return COURSE_STATUSES.includes(normalized as CourseStatus)
    ? (normalized as CourseStatus)
    : 'draft';
}

function normalizeRelationOrder(relations: CourseInstructorRelationSummary[]) {
  return relations.map((relation, index) => ({
    ...relation,
    display_order: index,
  }));
}

function getInstructorRoleLabel(role: string) {
  return COURSE_INSTRUCTOR_ROLE_OPTIONS.find((option) => option.value === role)?.label || '授课团队';
}

function formatMinutes(minutes: number) {
  if (!minutes) {
    return '0 分钟';
  }

  if (minutes < 60) {
    return `${minutes} 分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours} 小时 ${remainder} 分钟` : `${hours} 小时`;
}

export default function CourseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 数据状态
  const [course, setCourse] = useState<CourseWithSiteViews | null>(null);
  const [editForm, setEditForm] = useState<Partial<Course>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 编辑状态
  const [editLang, setEditLang] = useState<Lang>('zh');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // AI翻译状态
  const [translating, setTranslating] = useState(false);
  const [translateSuccess, setTranslateSuccess] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  // 翻译进度状态
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [translateStep, setTranslateStep] = useState(0);
  const [translateProgress, setTranslateProgress] = useState(0);

  // 离开确认
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // 上架弹窗状态
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedSites, setSelectedSites] = useState<string[]>(['cn']);
  const [publishing, setPublishing] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<CourseWorkflowStepId>('basic');
  const [selectedSiteCode, setSelectedSiteCode] = useState('cn');
  const [siteViewDrafts, setSiteViewDrafts] = useState<Record<string, CourseSiteViewDraft>>({});
  const [siteViewSaving, setSiteViewSaving] = useState(false);
  const [siteViewSaveSuccess, setSiteViewSaveSuccess] = useState(false);
  const [siteViewError, setSiteViewError] = useState<string | null>(null);
  const [availableInstructors, setAvailableInstructors] = useState<InstructorOption[]>([]);
  const [courseInstructorRelations, setCourseInstructorRelations] = useState<CourseInstructorRelationSummary[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState('');
  const [instructorsLoading, setInstructorsLoading] = useState(false);
  const [hasLoadedInstructors, setHasLoadedInstructors] = useState(false);
  const [instructorsError, setInstructorsError] = useState<string | null>(null);
  const [relationSaving, setRelationSaving] = useState(false);
  const [relationSaveSuccess, setRelationSaveSuccess] = useState(false);
  const [relationError, setRelationError] = useState<string | null>(null);

  // Toast 通知
  const { toasts, removeToast, success, error: toastError } = useToast();

  // 只读模式：已上架课程只能查看不能编辑
  const isReadOnly = false;

  // 加载课程数据
  useEffect(() => {
    loadCourse();
  }, [id]);

  const entrySource = searchParams.get('entry');
  const entrySiteCode = searchParams.get('site');
  const entryPublishStatus = searchParams.get('publish');
  const entryWarningsCount = Number.parseInt(searchParams.get('warnings') || '0', 10) || 0;

  useEffect(() => {
    if (entrySource === 'poster-import') {
      setCurrentStepId('review');
      if (entrySiteCode && COURSE_SITE_OPTIONS.some((site) => site.code === entrySiteCode)) {
        setSelectedSiteCode(entrySiteCode);
      }
      return;
    }

    if (entrySource === 'manual-create') {
      setCurrentStepId('basic');
    }
  }, [entrySiteCode, entrySource]);

  useEffect(() => {
    if (!course) return;

    const nextDrafts = COURSE_SITE_OPTIONS.reduce<Record<string, CourseSiteViewDraft>>((acc, site) => {
      const siteView = course.site_views?.find((item) => item.site_code === site.code);
      acc[site.code] = mapCourseSiteViewToDraft(siteView, site.code);
      return acc;
    }, {});

    setSiteViewDrafts(nextDrafts);
    setSelectedSiteCode((prev) =>
      COURSE_SITE_OPTIONS.some((site) => site.code === prev) ? prev : COURSE_SITE_OPTIONS[0].code,
    );
  }, [course]);

  useEffect(() => {
    if (currentStepId !== 'instructor' || availableInstructors.length > 0 || instructorsLoading || hasLoadedInstructors) {
      return;
    }

    void loadAvailableInstructors();
  }, [availableInstructors.length, currentStepId, hasLoadedInstructors, instructorsLoading]);

  useEffect(() => {
    setCourseInstructorRelations(course?.course_instructors || []);
  }, [course?.course_instructors]);

  useEffect(() => {
    if (!selectedInstructorId && availableInstructors.length > 0) {
      setSelectedInstructorId(availableInstructors[0].id);
    }
  }, [availableInstructors, selectedInstructorId]);

  async function loadCourse(options: { background?: boolean } = {}) {
    const { background = false } = options;

    if (!background) {
      setLoading(true);
      setError(null);
      setSiteViewError(null);
      setSiteViewSaveSuccess(false);
    }

    try {
      const json = await apiFetch<{ data: CourseWithSiteViews }>('/api/v1/admin/courses/' + id + '?view=base');
      const data = {
        ...json.data,
        status: normalizeCourseStatus(json.data.status),
      };
      setCourse(data);
      setEditForm({ ...data });
      // 默认显示源语言
      setEditLang((data.publishLanguage || 'zh') as Lang);
    } catch (err) {
      if (!background) {
        setError(getErrorMessage(err) || '加载失败');
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }

  async function loadAvailableInstructors() {
    setInstructorsLoading(true);
    setInstructorsError(null);
    setHasLoadedInstructors(true);
    try {
      const response = await apiFetch<{ data: InstructorOption[] }>('/api/v1/admin/instructors');
      setAvailableInstructors(response.data || []);
    } catch (err) {
      setInstructorsError(getErrorMessage(err) || '加载讲师列表失败');
    } finally {
      setInstructorsLoading(false);
    }
  }

  // 多语言读写逻辑
  const getPublishLang = () => ((editForm as any).publishLanguage || 'zh') as string;
  
  const getLocalizedValue = (baseField: string, obj: any = editForm): string => {
    const publishLang = getPublishLang();
    
    // 优先检查带语言后缀的字段（包括源语言）
    const suffixKey = `${baseField}_${editLang}`;
    if (obj && suffixKey in obj) {
      const suffixValue = obj[suffixKey];
      if (suffixValue !== undefined && suffixValue !== null) {
        return String(suffixValue);
      }
    }
    
    // 如果是源语言且没有后缀字段，检查不带后缀的字段
    if (editLang === publishLang) {
      const baseValue = obj?.[baseField];
      if (baseValue !== undefined && baseValue !== null) {
        return String(baseValue);
      }
    }
    
    return '';
  };
  
  const setLocalizedValue = (baseField: string, value: string, nestedPath?: string) => {
    const publishLang = getPublishLang();
    
    // 如果带后缀的字段存在，优先使用带后缀的字段（包括源语言）
    const suffixKey = `${baseField}_${editLang}`;
    const useSuffix = editForm && suffixKey in editForm;
    const field = useSuffix ? suffixKey : (editLang === publishLang ? baseField : `${baseField}_${editLang}`);
    
    if (nestedPath) {
      const [parent] = nestedPath.split('.');
      setEditForm(prev => ({
        ...prev,
        [parent]: { ...(prev as any)[parent], [field]: value }
      }));
    } else {
      setEditForm(prev => ({ ...prev, [field]: value }));
    }
    setIsDirty(true);
  };

  // 保存
  async function handleSave() {
    if (!course) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch(`/api/v1/admin/courses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      setSaveSuccess(true);
      setIsDirty(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(getErrorMessage(err) || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  // 保存并上架
  async function handleSaveAndPublish() {
    if (!course || selectedSites.length === 0) return;
    setPublishing(true);
    setSaveError(null);
    try {
      // 1. 先保存编辑内容
      await apiFetch(`/api/v1/admin/courses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });

      // 2. 交给服务端统一校验并发布
      await apiFetch(`/api/v1/admin/courses/${id}/publish`, {
        method: 'POST',
        body: JSON.stringify({
          siteCodes: selectedSites,
        }),
      });
      
      setShowPublishDialog(false);
      setIsDirty(false);
      // 重新加载以刷新状态
      await loadCourse({ background: true });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '上架失败');
    } finally {
      setPublishing(false);
    }
  }

  // AI翻译
  async function handleTranslate() {
    if (!course) return;

    // 显示翻译进度弹框
    setShowTranslateModal(true);
    setTranslating(true);
    setTranslateError(null);
    setTranslateStep(1);
    setTranslateProgress(0);

    // 模拟进度更新
    const progressInterval = setInterval(() => {
      setTranslateProgress(prev => {
        if (prev >= 85) return prev;
        return prev + Math.random() * 5;
      });
    }, 500);

    try {
      // 步骤 1：分析内容
      await new Promise(r => setTimeout(r, 800));
      setTranslateStep(2);
      setTranslateProgress(20);

      // 调用翻译 API
      const res = await fetch('/api/courses/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: id }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '翻译失败');
      }

      // 步骤 5：保存结果
      setTranslateStep(5);
      setTranslateProgress(95);
      await new Promise(r => setTimeout(r, 500));

      // 完成
      clearInterval(progressInterval);
      setTranslateProgress(100);
      setTranslateSuccess(true);
      await loadCourse({ background: true });

      // 短暂显示完成状态后关闭弹框
      setTimeout(() => {
        setShowTranslateModal(false);
        success('AI 翻译完成，已自动补全英文、泰文、日文内容');
      }, 1000);

    } catch (err) {
      clearInterval(progressInterval);
      setTranslateError(err instanceof Error ? err.message : '翻译失败');
      toastError(err instanceof Error ? err.message : '翻译失败');
      setTimeout(() => {
        setShowTranslateModal(false);
      }, 2000);
    } finally {
      setTranslating(false);
    }
  }

  // 返回列表
  function handleBack() {
    if (isDirty) {
      setShowLeaveDialog(true);
    } else {
      router.push('/courses');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingState />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">{error || '课程不存在'}</h2>
            <p className="text-slate-500 mb-6">无法加载课程数据</p>
            <Button onClick={() => router.push('/courses')}>返回课程列表</Button>
          </div>
        </Card>
      </div>
    );
  }

  const publishLang = getPublishLang();
  const workflowSummary = summarizeCourseWorkflow(editForm as Record<string, any>);
  const currentStepIndex = Math.max(
    workflowSummary.findIndex((step) => step.id === currentStepId),
    0,
  );
  const currentWorkflowStep = workflowSummary[currentStepIndex];
  const completedStepCount = workflowSummary.filter((step) => step.isComplete).length;
  const siteViews = Array.isArray(course.site_views) ? course.site_views : [];
  const selectedSiteOption =
    COURSE_SITE_OPTIONS.find((site) => site.code === selectedSiteCode) || COURSE_SITE_OPTIONS[0];
  const selectedSiteDraft =
    siteViewDrafts[selectedSiteCode] || createDefaultCourseSiteViewDraft(selectedSiteCode);
  const selectedSiteView = siteViews.find((item) => item.site_code === selectedSiteCode);
  const chapterSummary = course.chapter_summary || {
    total: 0,
    published: 0,
    draft: 0,
    previewable: 0,
    totalMinutes: 0,
    latestChapters: [],
  };
  const chapterCompletionPercent = chapterSummary.total
    ? Math.round((chapterSummary.published / chapterSummary.total) * 100)
    : 0;
  const leadTeamInstructor =
    courseInstructorRelations.find((relation) => relation.role === 'instructor')?.instructor ||
    courseInstructorRelations[0]?.instructor ||
    null;

  function switchStep(stepId: CourseWorkflowStepId) {
    setCurrentStepId(stepId);
    setSaveError(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handlePreviousStep() {
    const previousStep = workflowSummary[currentStepIndex - 1];
    if (previousStep) {
      switchStep(previousStep.id);
    }
  }

  function handleNextStep() {
    if (!currentWorkflowStep?.canAdvance) {
      setSaveError(
        `请先完善“${currentWorkflowStep.title}”：${currentWorkflowStep.issues[0]?.message || '仍有未完成项'}`,
      );
      return;
    }

    const nextStep = workflowSummary[currentStepIndex + 1];
    if (nextStep) {
      switchStep(nextStep.id);
    }
  }

  function updateSiteViewDraft(field: keyof CourseSiteViewDraft, value: string | number | boolean) {
    setSiteViewDrafts((prev) => ({
      ...prev,
      [selectedSiteCode]: {
        ...(prev[selectedSiteCode] || createDefaultCourseSiteViewDraft(selectedSiteCode)),
        site_code: selectedSiteCode,
        [field]: value,
      },
    }));
    setSiteViewError(null);
    setSiteViewSaveSuccess(false);
  }

  async function handleSaveSiteView() {
    const draft = siteViewDrafts[selectedSiteCode] || createDefaultCourseSiteViewDraft(selectedSiteCode);

    setSiteViewSaving(true);
    setSiteViewError(null);
    try {
      const saved = await apiFetch<Record<string, any>>(
        `/api/v1/admin/courses/${id}/site-view?site_code=${selectedSiteCode}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...draft,
            site_code: selectedSiteCode,
          }),
        },
      );

      setCourse((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          site_views: [
            ...(prev.site_views || []).filter((item) => item.site_code !== selectedSiteCode),
            saved,
          ],
        };
      });
      setSiteViewDrafts((prev) => ({
        ...prev,
        [selectedSiteCode]: mapCourseSiteViewToDraft(saved, selectedSiteCode),
      }));
      setSiteViewSaveSuccess(true);
      setTimeout(() => setSiteViewSaveSuccess(false), 2000);
      success(`${selectedSiteCode.toUpperCase()} 站点视图已保存`);
    } catch (err) {
      setSiteViewError(getErrorMessage(err) || '保存站点运营设置失败');
    } finally {
      setSiteViewSaving(false);
    }
  }

  function addInstructorRelation() {
    if (!selectedInstructorId) {
      setRelationError('请先选择一位讲师');
      return;
    }

    if (courseInstructorRelations.some((relation) => relation.instructor.id === selectedInstructorId)) {
      setRelationError('该讲师已经在授课团队中');
      return;
    }

    const selectedInstructor = availableInstructors.find((instructor) => instructor.id === selectedInstructorId);
    if (!selectedInstructor) {
      setRelationError('当前讲师不存在，请刷新后重试');
      return;
    }

    const nextRole = courseInstructorRelations.some((relation) => relation.role === 'instructor')
      ? 'assistant'
      : 'instructor';

    setCourseInstructorRelations((prev) =>
      normalizeRelationOrder([
        ...prev,
        {
          id: `draft:${selectedInstructor.id}`,
          role: nextRole,
          display_order: prev.length,
          instructor: {
            id: selectedInstructor.id,
            name: selectedInstructor.name,
            title: selectedInstructor.title,
            avatar_url: selectedInstructor.avatar_url,
            credentials: selectedInstructor.credentials || [],
            bio: selectedInstructor.bio,
          },
        },
      ]),
    );
    setRelationError(null);
    setRelationSaveSuccess(false);
  }

  function updateInstructorRelationRole(relationId: string, nextRole: 'instructor' | 'assistant' | 'guest') {
    setCourseInstructorRelations((prev) =>
      prev.map((relation) =>
        relation.id === relationId
          ? {
              ...relation,
              role: nextRole,
            }
          : relation,
      ),
    );
    setRelationError(null);
    setRelationSaveSuccess(false);
  }

  function moveInstructorRelation(relationId: string, direction: -1 | 1) {
    setCourseInstructorRelations((prev) => {
      const index = prev.findIndex((relation) => relation.id === relationId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }

      const nextRelations = [...prev];
      const [currentRelation] = nextRelations.splice(index, 1);
      nextRelations.splice(nextIndex, 0, currentRelation);
      return normalizeRelationOrder(nextRelations);
    });
    setRelationSaveSuccess(false);
  }

  function removeInstructorRelation(relationId: string) {
    setCourseInstructorRelations((prev) =>
      normalizeRelationOrder(prev.filter((relation) => relation.id !== relationId)),
    );
    setRelationError(null);
    setRelationSaveSuccess(false);
  }

  async function handleSaveInstructorRelations() {
    setRelationSaving(true);
    setRelationError(null);
    try {
      const response = await apiFetch<{
        relations: CourseInstructorRelationSummary[];
        leadInstructor: CourseInstructorSummary | null;
      }>(`/api/v1/admin/courses/${id}/instructors`, {
        method: 'PUT',
        body: JSON.stringify({
          relations: courseInstructorRelations.map((relation) => ({
            instructor_id: relation.instructor.id,
            role: relation.role,
            display_order: relation.display_order,
          })),
        }),
      });

      setCourseInstructorRelations(response.relations || []);
      setCourse((prev) => (
        prev
          ? {
              ...prev,
              course_instructors: response.relations || [],
            }
          : prev
      ));
      if (response.leadInstructor && !editForm.instructor?.name) {
        setEditForm((prev) => ({
          ...prev,
          instructor: {
            ...prev.instructor,
            name: response.leadInstructor?.name || '',
            title: prev.instructor?.title || response.leadInstructor?.title || '',
            imageUrl: prev.instructor?.imageUrl || response.leadInstructor?.avatar_url || '',
            credentials:
              Array.isArray(prev.instructor?.credentials) && prev.instructor.credentials.length > 0
                ? prev.instructor.credentials
                : response.leadInstructor?.credentials || [],
            bio: prev.instructor?.bio || response.leadInstructor?.bio || '',
          } as Course['instructor'],
        }));
      }

      setRelationSaveSuccess(true);
      success('授课团队已保存');
      setTimeout(() => setRelationSaveSuccess(false), 2000);
    } catch (err) {
      setRelationError(getErrorMessage(err) || '保存授课团队失败');
    } finally {
      setRelationSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 truncate max-w-md">
              {editForm.title_zh || editForm.title || '编辑课程'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                course.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                course.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                course.status === 'offline' ? 'bg-slate-100 text-slate-600' :
                'bg-slate-100 text-slate-500'
              }`}>
                {course.status === 'pending' ? '待审核' :
                 course.status === 'published' ? '已上架' :
                 course.status === 'offline' ? '已下架' : course.status}
              </span>
              {course.translationsComplete ? (
                <span className="text-sky-700 bg-sky-100 px-2 py-0.5 rounded text-xs font-bold">已翻译</span>
              ) : (
                <span className="text-orange-700 bg-orange-100 px-2 py-0.5 rounded text-xs font-bold">待翻译</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* AI翻译按钮 - 只读模式下禁用 */}
          <Button
            variant="secondary"
            onClick={handleTranslate}
            loading={translating}
            className={translateSuccess ? '!bg-emerald-500 !text-white' : '!bg-purple-600 hover:!bg-purple-500 !text-white'}
          >
            {translating ? 'AI翻译中...' : translateSuccess ? '翻译完成 ✓' : 'AI补全翻译'}
          </Button>
          {/* 保存按钮 */}
          <Button
            onClick={handleSave}
            loading={saving}
            className={saveSuccess ? '!bg-green-500' : ''}
          >
            {saving ? '保存中...' : saveSuccess ? '已保存 ✓' : '保存修改'}
          </Button>
          {/* 保存并上架按钮 - 收束到发布检查步骤 */}
          {(course.status === 'pending' || course.status === 'offline') && currentStepId === 'review' && (
            <Button
              onClick={() => setShowPublishDialog(true)}
              className="!bg-emerald-600 hover:!bg-emerald-500 !text-white"
            >
              保存并上架
            </Button>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {(saveError || translateError) && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
          {saveError || translateError}
        </div>
      )}

      {entrySource ? (
        <Card>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-900">
                {entrySource === 'poster-import' ? '已从海报导入进入编辑工作流' : '已创建空白草稿，进入编辑工作流'}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {entrySource === 'poster-import'
                  ? entryWarningsCount > 0
                    ? `当前课程状态：${entryPublishStatus === 'published' ? '已上架' : '草稿'}。系统检测到 ${entryWarningsCount} 条导入提醒，建议先查看发布检查和站点运营设置。`
                    : `当前课程状态：${entryPublishStatus === 'published' ? '已上架' : '草稿'}。请沿步骤核对基础信息、时间地点和站点运营配置。`
                  : '当前课程是空白草稿，建议从“基础信息”开始补齐标题、价格、语言与容量。'}
              </div>
              {entrySiteCode ? (
                <div className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  默认关注站点：{entrySiteCode.toUpperCase()}
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => switchStep(entrySource === 'poster-import' ? 'review' : 'basic')}
              >
                {entrySource === 'poster-import' ? '查看发布检查' : '开始填写基础信息'}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {/* 只读模式提示 */}

      {/* 语言切换标签 */}
      <div className="flex gap-2 flex-wrap sticky top-0 bg-[var(--admin-bg)] py-3 z-10">
        {(['en', 'zh', 'th', 'ja'] as const).map(lang => {
          const isSource = lang === publishLang;
          return (
            <button
              key={lang}
              onClick={() => {
                setEditLang(lang);
                // 切换语言时自动更新货币
                const langToCurrency: Record<string, string> = {
                  'zh': 'CNY',
                  'en': 'USD',
                  'th': 'THB',
                  'ja': 'JPY',
                };
                setEditForm(prev => ({ ...prev, currency: langToCurrency[lang] }));
                setIsDirty(true);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                editLang === lang
                  ? 'bg-emerald-500 text-black'
                  : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {lang === 'en' ? 'English' : lang === 'zh' ? '中文' : lang === 'th' ? 'ไทย' : '日本語'}
              {isSource && <span className="ml-1 text-xs opacity-70">(源)</span>}
            </button>
          );
        })}
      </div>

      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">课程编辑工作流</h3>
            <p className="text-sm text-slate-500 mt-1">
              已完成 {completedStepCount} / {workflowSummary.length} 个步骤，先把内容补齐，再做发布检查。
            </p>
          </div>
          <div className="w-full lg:w-72 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(completedStepCount / workflowSummary.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {workflowSummary.map((step, index) => {
            const isActive = step.id === currentStepId;
            const badgeClass = step.isComplete
              ? 'bg-emerald-100 text-emerald-700'
              : step.canAdvance
                ? 'bg-amber-100 text-amber-700'
                : 'bg-rose-100 text-rose-700';

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => switchStep(step.id)}
                className={`text-left rounded-2xl border px-4 py-4 transition-all ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-slate-900 text-white text-xs font-bold">
                    {step.icon}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeClass}`}>
                    {step.isComplete ? '已完成' : step.canAdvance ? '可跳过' : '待完善'}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {index + 1}. {step.title}
                </div>
                <div className="text-xs text-slate-500 mt-1">{step.description}</div>
                {!step.isComplete && step.issues.length > 0 && (
                  <div className="text-xs text-rose-600 mt-3 line-clamp-2">{step.issues[0].message}</div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Section 1: 基本信息 */}
      {currentStepId === 'basic' && (
      <Card>
        <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
          <span className="text-lg">📋</span> 基本信息
        </h4>
        <div className="space-y-4">
          {/* 发布语言 - 只读 */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <span className="text-xs text-slate-500">发布语言:</span>
            <span className="text-sm text-slate-900 font-medium">
              {publishLang === 'zh' ? '中文' : publishLang === 'en' ? 'English' : publishLang === 'ja' ? '日本語' : 'ภาษาไทย'}
            </span>
            <span className="text-xs text-slate-600">(AI翻译将从此语言翻译到其他语言)</span>
          </div>

          {/* 课程标题 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              课程标题 ({editLang === publishLang ? `${editLang} - 源` : editLang})
            </label>
            <input
              type="text"
              value={getLocalizedValue('title')}
              onChange={(e) => {
                const newValue = e.target.value;
                console.log('[Title Input]', {
                  event: 'onChange',
                  value: newValue,
                  editLang,
                  publishLang,
                  currentValue: getLocalizedValue('title'),
                  fieldKey: `title_${editLang}`,
                  fieldValue: (editForm as any)[`title_${editLang}`],
                  baseFieldValue: (editForm as any).title
                });
                setLocalizedValue('title', newValue);
              }}
              onFocus={() => {
                console.log('[Title Input]', {
                  event: 'onFocus',
                  editLang,
                  publishLang,
                  currentValue: getLocalizedValue('title'),
                  formKeys: Object.keys(editForm)
                });
              }}
              className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              placeholder={`请输入${editLang === 'zh' ? '中文' : editLang === 'en' ? '英文' : editLang === 'ja' ? '日文' : '泰文'}标题`}
            />
          </div>

          {/* 专科 & 难度 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">专科分类</label>
              <input
                type="text"
                value={editForm.specialty || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, specialty: e.target.value as Specialty })); setIsDirty(true); }}
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">难度级别</label>
              <select
                value={editForm.level || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, level: e.target.value as Course['level'] })); setIsDirty(true); }}
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              >
                <option value="Basic">基础 Basic</option>
                <option value="Intermediate">进阶 Intermediate</option>
                <option value="Advanced">高级 Advanced</option>
                <option value="Master">大师 Master</option>
              </select>
            </div>
          </div>

          {/* 多货币价格 */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">人民币 (CNY)</label>
              <input
                type="number"
                value={editForm.price_cny || ''}
                onChange={(e) => { const n = Number(e.target.value); const val = !isNaN(n) && e.target.value !== '' ? n : undefined; setEditForm(prev => ({ ...prev, price_cny: val })); setIsDirty(true); }}
                placeholder="¥"
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">美元 (USD)</label>
              <input
                type="number"
                value={editForm.price_usd || ''}
                onChange={(e) => { const n = Number(e.target.value); const val = !isNaN(n) && e.target.value !== '' ? n : undefined; setEditForm(prev => ({ ...prev, price_usd: val })); setIsDirty(true); }}
                placeholder="$"
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">日元 (JPY)</label>
              <input
                type="number"
                value={editForm.price_jpy || ''}
                onChange={(e) => { const n = Number(e.target.value); const val = !isNaN(n) && e.target.value !== '' ? n : undefined; setEditForm(prev => ({ ...prev, price_jpy: val })); setIsDirty(true); }}
                placeholder="¥"
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">泰铢 (THB)</label>
              <input
                type="number"
                value={editForm.price_thb || ''}
                onChange={(e) => { const n = Number(e.target.value); const val = !isNaN(n) && e.target.value !== '' ? n : undefined; setEditForm(prev => ({ ...prev, price_thb: val })); setIsDirty(true); }}
                placeholder="฿"
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
          </div>

          {/* 最大容量 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">最大容量</label>
            <input
              type="number"
              value={editForm.maxCapacity || 30}
              onChange={(e) => { setEditForm(prev => ({ ...prev, maxCapacity: Number(e.target.value) })); setIsDirty(true); }}
              className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
            />
          </div>
        </div>
      </Card>
      )}

      {/* Section 2: 课程详情 */}
      {currentStepId === 'details' && (
      <Card>
        <h4 className="text-sky-400 font-bold text-sm mb-4 flex items-center gap-2">
          <span className="text-lg">📖</span> 课程详情
        </h4>
        <div className="space-y-4">
          {/* 授课语言 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">授课语言</label>
            <div className="flex flex-wrap gap-2">
              {[{ v: 'zh', l: '中文' }, { v: 'en', l: 'English' }, { v: 'ja', l: '日本語' }, { v: 'th', l: 'ภาษาไทย' }].map(lang => {
                const teachingLangs = ((editForm as any).teachingLanguages || []) as string[];
                const isSelected = teachingLangs.includes(lang.v);
                return (
                  <button
                    key={lang.v}
                    type="button"
                    onClick={() => {
                      const newLangs = isSelected
                        ? teachingLangs.filter(l => l !== lang.v)
                        : [...teachingLangs, lang.v];
                      setEditForm(prev => ({ ...prev, teachingLanguages: newLangs }));
                      setIsDirty(true);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      isSelected ? 'bg-sky-500 border-sky-400 text-slate-900' : 'bg-slate-100/50 border-slate-200/50 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    {isSelected && '✓ '}{lang.l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              课程描述 ({editLang === publishLang ? `${editLang} - 源` : editLang})
            </label>
            <textarea
              value={getLocalizedValue('description')}
              onChange={(e) => setLocalizedValue('description', e.target.value)}
              className="w-full min-h-[100px] px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none cursor-text"
            />
          </div>

          {/* 总课时 */}
          <div className="w-48">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">总课时 (小时)</label>
            <input
              type="number"
              value={editForm.totalHours || ''}
              onChange={(e) => { setEditForm(prev => ({ ...prev, totalHours: Number(e.target.value) || undefined })); setIsDirty(true); }}
              className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
            />
          </div>

          {/* 媒体 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">课程封面图</label>
              {editForm.imageUrl && (
                <img src={editForm.imageUrl} alt="封面" className="w-full h-32 object-cover rounded-lg mb-2 border border-slate-200/50" />
              )}
              <input
                type="text"
                value={editForm.imageUrl || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, imageUrl: e.target.value })); setIsDirty(true); }}
                placeholder="图片 URL"
                className="w-full px-4 py-2 bg-white border border-slate-200/50 rounded-xl text-xs text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">预览视频</label>
              <input
                type="text"
                value={(editForm as any).previewVideoUrl || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, previewVideoUrl: e.target.value })); setIsDirty(true); }}
                placeholder="视频 URL"
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
          </div>
        </div>
      </Card>
      )}

      {/* Section 3: 讲师信息 */}
      {currentStepId === 'instructor' && (
      <Card>
        <h4 className="text-purple-400 font-bold text-sm mb-4 flex items-center gap-2">
          <span className="text-lg">👨‍🏫</span> 讲师信息
        </h4>
        <div className="space-y-4">
          {/* 讲师头像 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">讲师头像</label>
            <div className="flex items-center gap-4">
              {editForm.instructor?.imageUrl && (
                <img src={editForm.instructor.imageUrl} alt="讲师" className="w-16 h-16 object-cover rounded-full border border-slate-200/50" />
              )}
              <input
                type="text"
                value={editForm.instructor?.imageUrl || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, instructor: { ...prev.instructor, imageUrl: e.target.value } as Course['instructor'] })); setIsDirty(true); }}
                placeholder="头像 URL"
                className="flex-1 px-4 py-2 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                讲师姓名 ({editLang === publishLang ? `${editLang} - 源` : editLang})
              </label>
              <input
                type="text"
                value={getLocalizedValue('name', editForm.instructor)}
                onChange={(e) => {
                  const field = editLang === publishLang ? 'name' : `name_${editLang}`;
                  setEditForm(prev => ({ ...prev, instructor: { ...prev.instructor, [field]: e.target.value } as Course['instructor'] }));
                  setIsDirty(true);
                }}
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                讲师职称 ({editLang === publishLang ? `${editLang} - 源` : editLang})
              </label>
              <input
                type="text"
                value={getLocalizedValue('title', editForm.instructor)}
                onChange={(e) => {
                  const field = editLang === publishLang ? 'title' : `title_${editLang}`;
                  setEditForm(prev => ({ ...prev, instructor: { ...prev.instructor, [field]: e.target.value } as Course['instructor'] }));
                  setIsDirty(true);
                }}
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              讲师简介 ({editLang === publishLang ? `${editLang} - 源` : editLang})
            </label>
            <textarea
              value={getLocalizedValue('bio', editForm.instructor)}
              onChange={(e) => {
                const field = editLang === publishLang ? 'bio' : `bio_${editLang}`;
                setEditForm(prev => ({ ...prev, instructor: { ...prev.instructor, [field]: e.target.value } as Course['instructor'] }));
                setIsDirty(true);
              }}
              className="w-full min-h-[80px] px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none cursor-text"
            />
          </div>

          {/* 资格证书 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">资格证书</label>
            <div className="space-y-2">
              {((editForm.instructor?.credentials || []) as string[]).map((cred, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={cred}
                    onChange={(e) => {
                      const newCreds = [...((editForm.instructor?.credentials || []) as string[])];
                      newCreds[idx] = e.target.value;
                      setEditForm(prev => ({ ...prev, instructor: { ...prev.instructor, credentials: newCreds } as Course['instructor'] }));
                      setIsDirty(true);
                    }}
                    className="flex-1 px-4 py-2 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newCreds = ((editForm.instructor?.credentials || []) as string[]).filter((_, i) => i !== idx);
                      setEditForm(prev => ({ ...prev, instructor: { ...prev.instructor, credentials: newCreds } as Course['instructor'] }));
                      setIsDirty(true);
                    }}
                    className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-xs"
                  >
                    删除
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newCreds = [...((editForm.instructor?.credentials || []) as string[]), ''];
                  setEditForm(prev => ({ ...prev, instructor: { ...prev.instructor, credentials: newCreds } as Course['instructor'] }));
                  setIsDirty(true);
                }}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 text-xs"
              >
                + 添加证书
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-slate-900">授课团队</div>
                <div className="text-xs text-slate-500 mt-1">
                  这里直接维护 course_instructors，可配置多位主讲、助教与 guest，并按顺序同步到前台课程展示。
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="secondary" onClick={() => router.push('/instructors')}>
                  打开讲师库
                </Button>
                <Button onClick={handleSaveInstructorRelations} disabled={relationSaving}>
                  {relationSaving ? '保存中...' : '保存授课团队'}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">添加讲师到授课团队</label>
                  <select
                    value={selectedInstructorId}
                    onChange={(e) => setSelectedInstructorId(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                  >
                    <option value="">请选择讲师</option>
                    {availableInstructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.name}{instructor.title ? ` / ${instructor.title}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="secondary" onClick={() => void loadAvailableInstructors()} disabled={instructorsLoading}>
                  {instructorsLoading ? '刷新中...' : '刷新讲师库'}
                </Button>
                <Button type="button" onClick={addInstructorRelation} disabled={!selectedInstructorId || instructorsLoading}>
                  添加到团队
                </Button>
              </div>

              {instructorsError && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {instructorsError}
                </div>
              )}
            </div>

            {courseInstructorRelations.length > 0 ? (
              <div className="space-y-3">
                {courseInstructorRelations.map((relation, index) => (
                  <div key={relation.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {relation.instructor.avatar_url ? (
                          <img
                            src={relation.instructor.avatar_url}
                            alt={relation.instructor.name}
                            className="h-12 w-12 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                            {relation.instructor.name.slice(0, 2) || '讲师'}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-slate-900">{relation.instructor.name || '未命名讲师'}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {relation.instructor.title || '未填写职称'}
                            {relation.instructor.credentials.length > 0
                              ? ` / ${relation.instructor.credentials.slice(0, 2).join(' · ')}`
                              : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={relation.role}
                          onChange={(e) => updateInstructorRelationRole(relation.id, e.target.value as 'instructor' | 'assistant' | 'guest')}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                        >
                          {COURSE_INSTRUCTOR_ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <Button type="button" variant="secondary" onClick={() => moveInstructorRelation(relation.id, -1)} disabled={index === 0}>
                          上移
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => moveInstructorRelation(relation.id, 1)}
                          disabled={index === courseInstructorRelations.length - 1}
                        >
                          下移
                        </Button>
                        <button
                          type="button"
                          onClick={() => removeInstructorRelation(relation.id)}
                          className="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-sm font-semibold hover:bg-rose-100"
                        >
                          移除
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        顺序 #{index + 1}
                      </span>
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">
                        {getInstructorRoleLabel(relation.role)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                还没有关联授课团队。至少补一位主讲，后续再加助教或 guest。
              </div>
            )}

            {(relationError || relationSaveSuccess) && (
              <div className={`rounded-xl px-4 py-3 text-sm ${relationError ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {relationError || '授课团队已同步到课程关系表'}
              </div>
            )}
          </div>
        </div>
      </Card>
      )}

      {/* Section 4: 课程日期 */}
      {currentStepId === 'schedule' && (
      <>
      <Card>
        <h4 className="text-amber-400 font-bold text-sm mb-4 flex items-center gap-2">
          <span className="text-lg">📅</span> 课程日期
        </h4>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">开课日期</label>
            <input
              type="date"
              value={editForm.startDate || ''}
              onChange={(e) => { setEditForm(prev => ({ ...prev, startDate: e.target.value })); setIsDirty(true); }}
              className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">结课日期</label>
            <input
              type="date"
              value={editForm.endDate || ''}
              onChange={(e) => { setEditForm(prev => ({ ...prev, endDate: e.target.value })); setIsDirty(true); }}
              className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">报名截止</label>
            <input
              type="date"
              value={editForm.enrollmentDeadline || ''}
              onChange={(e) => { setEditForm(prev => ({ ...prev, enrollmentDeadline: e.target.value })); setIsDirty(true); }}
              className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
            />
          </div>
        </div>

        {/* 课程日程 */}
        {editForm.agenda && editForm.agenda.length > 0 && (
          <div className="space-y-3 mt-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
              课程日程 ({editLang === publishLang ? `${editLang} - 源` : editLang})
            </label>
            {editForm.agenda.map((day: any, dayIdx: number) => (
              <div key={dayIdx} className="bg-white/30 rounded-lg p-3 border border-slate-200/30">
                <div className="text-xs text-amber-400 font-bold mb-2">Day {dayIdx + 1}: {day.date || ''}</div>
                <div className="space-y-2">
                  {day.items?.map((item: any, itemIdx: number) => {
                    const suffixActivity = item[`activity_${editLang}`];
                    const activityValue = suffixActivity || (editLang === publishLang ? (item.activity || '') : '');
                    return (
                      <div key={itemIdx} className="flex gap-2 items-center">
                        <span className="text-xs text-slate-500 w-16">{item.time}</span>
                        <input
                          type="text"
                          value={activityValue}
                          onChange={(e) => {
                            const field = editLang === publishLang ? 'activity' : `activity_${editLang}`;
                            const newAgenda = [...(editForm.agenda || [])];
                            if (newAgenda[dayIdx]?.items?.[itemIdx]) {
                              (newAgenda[dayIdx].items![itemIdx] as Record<string, any>)[field] = e.target.value;
                            }
                            setEditForm(prev => ({ ...prev, agenda: newAgenda }));
                            setIsDirty(true);
                          }}
                          className="flex-1 px-3 py-2 bg-white border border-slate-200/50 rounded-lg text-xs text-slate-900 focus:border-emerald-500 outline-none cursor-text"
                          placeholder={`活动内容 (${editLang})`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Section 5: 上课地点 */}
      <Card>
        <h4 className="text-rose-400 font-bold text-sm mb-4 flex items-center gap-2">
          <span className="text-lg">📍</span> 上课地点
        </h4>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">国家/地区</label>
              <input
                type="text"
                value={(editForm.location as any)?.country || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, location: { ...prev.location, country: e.target.value } as Course['location'] })); setIsDirty(true); }}
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">省/州/地区</label>
              <input
                type="text"
                value={(editForm.location as any)?.region || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, location: { ...prev.location, region: e.target.value } as Course['location'] })); setIsDirty(true); }}
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                城市 ({editLang === publishLang ? `${editLang} - 源` : editLang})
              </label>
              <input
                type="text"
                value={getLocalizedValue('city', editForm.location)}
                onChange={(e) => {
                  const field = editLang === publishLang ? 'city' : `city_${editLang}`;
                  setEditForm(prev => ({ ...prev, location: { ...prev.location, [field]: e.target.value } as Course['location'] }));
                  setIsDirty(true);
                }}
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                场地名称 ({editLang === publishLang ? `${editLang} - 源` : editLang})
              </label>
              <input
                type="text"
                value={getLocalizedValue('venue', editForm.location)}
                onChange={(e) => {
                  const field = editLang === publishLang ? 'venue' : `venue_${editLang}`;
                  setEditForm(prev => ({ ...prev, location: { ...prev.location, [field]: e.target.value } as Course['location'] }));
                  setIsDirty(true);
                }}
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                详细地址 ({editLang === publishLang ? `${editLang} - 源` : editLang})
              </label>
              <input
                type="text"
                value={getLocalizedValue('address', editForm.location)}
                onChange={(e) => {
                  const field = editLang === publishLang ? 'address' : `address_${editLang}`;
                  setEditForm(prev => ({ ...prev, location: { ...prev.location, [field]: e.target.value } as Course['location'] }));
                  setIsDirty(true);
                }}
                className="w-full px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none cursor-text"
              />
            </div>
          </div>
        </div>
      </Card>
      </>
      )}

      {/* Section 6: 行程服务安排 */}
      {currentStepId === 'services' && (
      <Card>
        <h4 className="text-cyan-400 font-bold text-sm mb-4 flex items-center gap-2">
          <span className="text-lg">✈️</span> 行程服务安排
        </h4>
        <div className="space-y-4">
          {/* 服务选项 */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'accommodation', label: '🏨 住宿安排' },
              { key: 'meals', label: '🍽️ 餐饮安排' },
              { key: 'transfer', label: '🚗 接送服务' },
              { key: 'visaLetter', label: '📄 签证邀请函' },
            ].map(service => {
              const services = (editForm as any).services || {};
              const value = services[service.key];
              return (
                <div key={service.key}>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">{service.label}</label>
                  <div className="flex gap-2">
                    {[
                      { v: 'yes', l: '提供', c: 'bg-green-500/20 border-green-500/50 text-green-400' },
                      { v: 'no', l: '不提供', c: 'bg-gray-500/20 border-gray-500/50 text-gray-400' },
                      { v: 'partial', l: '部分', c: 'bg-amber-500/20 border-amber-500/50 text-amber-400' },
                    ].map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => { setEditForm(prev => ({ ...prev, services: { ...(prev as any).services, [service.key]: opt.v } })); setIsDirty(true); }}
                        className={`px-2 py-1 rounded text-xs border transition-all ${
                          value === opt.v ? opt.c : 'bg-slate-100/50 border-slate-200/50 text-slate-500 hover:border-slate-500'
                        }`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 交通指南 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              🗺️ 交通指南 ({editLang === publishLang ? `${editLang} - 源` : editLang})
            </label>
            <textarea
              value={getLocalizedValue('directions', (editForm as any).services)}
              onChange={(e) => {
                const field = editLang === publishLang ? 'directions' : `directions_${editLang}`;
                setEditForm(prev => ({ ...prev, services: { ...(prev as any).services, [field]: e.target.value } }));
                setIsDirty(true);
              }}
              placeholder="如何到达培训地点..."
              className="w-full min-h-[60px] px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none cursor-text"
            />
          </div>

          {/* 其他备注 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              📝 其他备注 ({editLang === publishLang ? `${editLang} - 源` : editLang})
            </label>
            <textarea
              value={getLocalizedValue('notes', (editForm as any).services)}
              onChange={(e) => {
                const field = editLang === publishLang ? 'notes' : `notes_${editLang}`;
                setEditForm(prev => ({ ...prev, services: { ...(prev as any).services, [field]: e.target.value } }));
                setIsDirty(true);
              }}
              placeholder="其他需要学员了解的信息..."
              className="w-full min-h-[60px] px-4 py-3 bg-white border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none cursor-text"
            />
          </div>
        </div>
      </Card>
      )}

      {currentStepId === 'review' && (
        <Card>
          <h4 className="text-emerald-500 font-bold text-sm mb-4 flex items-center gap-2">
            <span className="text-lg">✅</span> 发布检查
          </h4>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">发布准备度</div>
              <div className={`text-sm font-bold ${currentWorkflowStep?.isComplete ? 'text-emerald-600' : 'text-rose-600'}`}>
                {currentWorkflowStep?.isComplete ? '当前内容已满足上架门槛' : `仍有 ${currentWorkflowStep?.issues.length || 0} 项待完善`}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">翻译状态</div>
              <div className={`text-sm font-bold ${course.translationsComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
                {course.translationsComplete ? '多语言内容已补齐' : '仍建议先完成 AI 补全翻译'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">站点状态</div>
              <div className="text-sm font-bold text-slate-900">
                {siteViews.length > 0 ? `已生成 ${siteViews.length} 个站点视图` : '尚未生成站点视图'}
              </div>
            </div>
          </div>

          {currentWorkflowStep?.issues.length ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 mb-6">
              <div className="text-sm font-bold text-rose-700 mb-3">上架前需要补齐以下内容</div>
              <ul className="space-y-2 text-sm text-rose-700">
                {currentWorkflowStep.issues.map((issue) => (
                  <li key={`${issue.field}-${issue.message}`} className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-6 text-sm text-emerald-700 font-medium">
              当前必填内容已经齐备，可以继续保存并上架。
            </div>
          )}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div>
                <div className="text-sm font-bold text-slate-900">结构化课程内容</div>
                <div className="text-xs text-slate-500 mt-1">
                  课程章节仍由独立后台维护，但这里直接展示 live 章节统计、完成度和最近章节，发布前不用再跳出去二次核对。
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/courses/chapters?course=${id}&returnTo=${encodeURIComponent(`/courses/${id}`)}`)}
                >
                  管理课程章节
                </Button>
                <Button variant="secondary" onClick={() => switchStep('instructor')}>
                  回到讲师与资质
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4 mb-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">章节总数</div>
                <div className="text-2xl font-bold text-slate-900">{chapterSummary.total}</div>
                <div className="text-xs text-slate-500 mt-2">总时长 {formatMinutes(chapterSummary.totalMinutes)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">已发布章节</div>
                <div className="text-2xl font-bold text-emerald-600">{chapterSummary.published}</div>
                <div className="text-xs text-slate-500 mt-2">草稿 {chapterSummary.draft} 节</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">可预览章节</div>
                <div className="text-sm font-semibold text-slate-900">
                  {chapterSummary.previewable > 0 ? `${chapterSummary.previewable} 节已开放预览` : '暂未设置预览章节'}
                </div>
                <div className="text-xs text-slate-500 mt-2">适合在发布前检查试听内容是否配置好。</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">授课团队</div>
                <div className="text-sm font-semibold text-slate-900">
                  {courseInstructorRelations.length > 0 ? `${courseInstructorRelations.length} 位已关联` : '尚未关联团队'}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {leadTeamInstructor?.name || editForm.instructor?.name || '当前还没有主讲人'}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500">章节完成度</div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">
                      {chapterSummary.total === 0
                        ? '尚未创建结构化章节'
                        : chapterSummary.published === chapterSummary.total
                          ? '全部章节已发布'
                          : `还有 ${chapterSummary.draft} 节待发布`}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{chapterCompletionPercent}%</div>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${chapterCompletionPercent >= 100 ? 'bg-emerald-500' : chapterCompletionPercent > 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
                    style={{ width: `${chapterCompletionPercent}%` }}
                  />
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {chapterSummary.total === 0
                    ? '建议先至少建立 1 个章节，否则前台没有结构化学习内容可展示。'
                    : '章节后台支持视频、时长、预览和发布状态，这里直接给你发布前视角。'}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">最近章节</div>
                {chapterSummary.latestChapters.length > 0 ? (
                  <div className="space-y-3">
                    {chapterSummary.latestChapters.map((chapter) => (
                      <div key={chapter.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">{chapter.title}</div>
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${chapter.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {chapter.status === 'published' ? '已发布' : '草稿'}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          第 {chapter.order + 1} 节 / {formatMinutes(chapter.durationMinutes)}
                          {chapter.isPreview ? ' / 可预览' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500">
                    还没有章节内容，点击“管理课程章节”即可开始补齐。
                  </div>
                )}
              </div>
            </div>
          </div>

          <CourseProductRelationsEditor
            courseId={id}
            agendaDays={Array.isArray(editForm.agenda) ? editForm.agenda : []}
          />

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">当前站点视图</div>
            {siteViews.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {siteViews.map((siteView) => {
                  const siteCode = String(siteView.site_code || '').toUpperCase();
                  const publishStatus = String(siteView.publish_status || 'draft');
                  const statusClass =
                    publishStatus === 'published'
                      ? 'bg-emerald-100 text-emerald-700'
                      : publishStatus === 'offline'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-700';

                  return (
                    <div key={`${siteCode}-${publishStatus}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="text-sm font-bold text-slate-900">{siteCode || '未命名站点'}</div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                          {publishStatus === 'published' ? '已发布' : publishStatus === 'offline' ? '已下架' : '草稿'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {siteView.is_enabled === false ? '站点视图当前禁用' : '站点视图已启用'}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                当前课程还没有站点视图；点击“保存并上架”后会按所选站点自动创建。
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
              <div>
                <div className="text-sm font-bold text-slate-900">站点运营设置</div>
                <div className="text-xs text-slate-500 mt-1">
                  在这里维护各站点自己的标题覆盖、Hero 文案、CTA、SEO 与发布状态，让课程真正按站点运营。
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {COURSE_SITE_OPTIONS.map((site) => {
                  const draft = siteViewDrafts[site.code] || createDefaultCourseSiteViewDraft(site.code);
                  const hasSavedView = siteViews.some((item) => item.site_code === site.code);
                  const isActive = selectedSiteCode === site.code;
                  const statusClass =
                    draft.publish_status === 'published'
                      ? 'bg-emerald-100 text-emerald-700'
                      : draft.publish_status === 'offline'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-700';

                  return (
                    <button
                      key={site.code}
                      type="button"
                      onClick={() => setSelectedSiteCode(site.code)}
                      className={`rounded-2xl border px-4 py-3 text-left min-w-[180px] transition-all ${
                        isActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-sm font-bold text-slate-900">{site.label}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                          {draft.publish_status === 'published'
                            ? '已发布'
                            : draft.publish_status === 'offline'
                              ? '已下架'
                              : hasSavedView
                                ? '草稿'
                                : '未初始化'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{site.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                <div>
                  <div className="text-sm font-bold text-slate-900">{selectedSiteOption.label} 视图</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {selectedSiteView ? '当前已存在站点视图，可直接编辑覆盖字段。' : '当前还没有站点视图，首次保存会自动初始化。'}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedSiteDraft.is_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                    {selectedSiteDraft.is_enabled ? '已启用' : '已禁用'}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                    默认币种 {selectedSiteOption.defaultCurrency}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">发布状态</label>
                  <select
                    value={selectedSiteDraft.publish_status}
                    onChange={(e) => updateSiteViewDraft('publish_status', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                  >
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                    <option value="offline">已下架</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">定价模式</label>
                  <select
                    value={selectedSiteDraft.pricing_mode}
                    onChange={(e) => updateSiteViewDraft('pricing_mode', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                  >
                    <option value="inherit">继承 Base</option>
                    <option value="free">站点免费</option>
                    <option value="custom">站点自定义</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">币种</label>
                  <select
                    value={selectedSiteDraft.currency_code}
                    onChange={(e) => updateSiteViewDraft('currency_code', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                  >
                    {['CNY', 'USD', 'JPY', 'THB'].map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">展示排序</label>
                  <input
                    type="number"
                    value={selectedSiteDraft.display_order}
                    onChange={(e) => updateSiteViewDraft('display_order', Number(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => updateSiteViewDraft('is_enabled', !selectedSiteDraft.is_enabled)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${selectedSiteDraft.is_enabled ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                >
                  {selectedSiteDraft.is_enabled ? '站点视图已启用' : '站点视图已禁用'}
                </button>
                <button
                  type="button"
                  onClick={() => updateSiteViewDraft('is_featured', !selectedSiteDraft.is_featured)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${selectedSiteDraft.is_featured ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                >
                  {selectedSiteDraft.is_featured ? '已设为推荐' : '设为推荐课程'}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">站点标题覆盖</label>
                  <input
                    type="text"
                    value={selectedSiteDraft.title_override}
                    onChange={(e) => updateSiteViewDraft('title_override', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                    placeholder="为空则继承 Base 标题"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">站点 slug 覆盖</label>
                  <input
                    type="text"
                    value={selectedSiteDraft.slug_override}
                    onChange={(e) => updateSiteViewDraft('slug_override', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                    placeholder="如 intl-course-slug"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Hero 标题</label>
                  <input
                    type="text"
                    value={selectedSiteDraft.hero_title_override}
                    onChange={(e) => updateSiteViewDraft('hero_title_override', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                    placeholder="站点 Hero 主标题覆盖"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">SEO 标题</label>
                  <input
                    type="text"
                    value={selectedSiteDraft.seo_title}
                    onChange={(e) => updateSiteViewDraft('seo_title', e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none"
                    placeholder="站点 SEO Title"
                  />
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">站点摘要</label>
                  <textarea
                    value={selectedSiteDraft.summary_override}
                    onChange={(e) => updateSiteViewDraft('summary_override', e.target.value)}
                    className="w-full min-h-[90px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none resize-none"
                    placeholder="课程列表或详情页摘要覆盖"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">Hero 副标题</label>
                  <textarea
                    value={selectedSiteDraft.hero_subtitle_override}
                    onChange={(e) => updateSiteViewDraft('hero_subtitle_override', e.target.value)}
                    className="w-full min-h-[90px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none resize-none"
                    placeholder="站点 Hero 副标题覆盖"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">SEO 描述</label>
                  <textarea
                    value={selectedSiteDraft.seo_description}
                    onChange={(e) => updateSiteViewDraft('seo_description', e.target.value)}
                    className="w-full min-h-[90px] px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none resize-none"
                    placeholder="站点 SEO Description"
                  />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">CTA 配置 JSON</label>
                  <textarea
                    value={selectedSiteDraft.cta_config_json}
                    onChange={(e) => updateSiteViewDraft('cta_config_json', e.target.value)}
                    className="w-full min-h-[160px] px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-200 outline-none resize-y font-mono"
                    spellCheck={false}
                    placeholder={'{\n  "primary_action": "buy",\n  "primary_label": "立即报名"\n}'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">展示配置 JSON</label>
                  <textarea
                    value={selectedSiteDraft.display_config_json}
                    onChange={(e) => updateSiteViewDraft('display_config_json', e.target.value)}
                    className="w-full min-h-[160px] px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-sky-200 outline-none resize-y font-mono"
                    spellCheck={false}
                    placeholder={'{\n  "hero_variant": "split",\n  "show_reviews": true\n}'}
                  />
                </div>
              </div>

              {siteViewError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {siteViewError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5">
                <div className="text-xs text-slate-500">
                  {siteViewSaveSuccess ? '站点运营设置已保存。' : '保存后，当前站点的标题、CTA、SEO 与发布状态会立即写入站点视图。'}
                </div>
                <Button
                  onClick={handleSaveSiteView}
                  loading={siteViewSaving}
                  className={siteViewSaveSuccess ? '!bg-green-500 !text-white' : ''}
                >
                  {siteViewSaving ? '保存站点视图...' : siteViewSaveSuccess ? '站点设置已保存 ✓' : `保存 ${selectedSiteOption.label} 设置`}
                </Button>
              </div>
            </div>
          </div>

          {(course.status === 'pending' || course.status === 'offline') && (
            <div className="flex justify-end mt-6">
              <Button
                onClick={() => setShowPublishDialog(true)}
                className="!bg-emerald-600 hover:!bg-emerald-500 !text-white"
              >
                保存并上架
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-900">当前步骤：{currentWorkflowStep?.title}</div>
            <div className="text-xs text-slate-500 mt-1">{currentWorkflowStep?.description}</div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handlePreviousStep} disabled={currentStepIndex === 0}>
              上一步
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={currentStepIndex >= workflowSummary.length - 1}
            >
              下一步
            </Button>
          </div>
        </div>
      </Card>

      {/* 离开确认对话框 */}
      <ConfirmDialog
        open={showLeaveDialog}
        title="确认离开"
        message="您有未保存的更改，确定要离开吗？所有未保存的更改将丢失。"
        confirmText="确认离开"
        onConfirm={() => router.push('/courses')}
        onCancel={() => setShowLeaveDialog(false)}
        danger
      />

      {/* 上架站点选择弹窗 */}
      {showPublishDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">保存并上架课程</h3>
            <p className="text-sm text-slate-500 mb-5">
              请选择要上架的站点，课程内容将保存并发布到所选站点。
            </p>
            
            <div className="space-y-3 mb-6">
              {[
                { code: 'cn', label: '中国站 (CN)', desc: '面向中国大陆用户' },
                { code: 'intl', label: '国际站 (INTL)', desc: '面向海外用户' },
              ].map(site => (
                <label
                  key={site.code}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedSites.includes(site.code)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSites.includes(site.code)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSites(prev => [...prev, site.code]);
                      } else {
                        setSelectedSites(prev => prev.filter(s => s !== site.code));
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{site.label}</div>
                    <div className="text-xs text-slate-500">{site.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {saveError && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {saveError}
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowPublishDialog(false); setSaveError(null); }}
                disabled={publishing}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveAndPublish}
                disabled={publishing || selectedSites.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? '上架中...' : `确认上架 (${selectedSites.length} 个站点)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 通知容器 */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* AI 翻译进度弹框 */}
      {showTranslateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="text-center">
              {/* 动态图标 */}
              <div className="w-16 h-16 mx-auto mb-4 relative">
                {translateProgress >= 100 ? (
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : translateError ? (
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                )}
              </div>

              {/* 标题 */}
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {translateError ? '翻译失败' : translateProgress >= 100 ? '翻译完成' : 'AI 智能翻译中'}
              </h3>

              {/* 当前步骤 */}
              {!translateError && translateProgress < 100 && (
                <div className="mb-4">
                  <p className="text-sm text-slate-600 mb-3">
                    {translateStep === 1 && '正在分析课程内容...'}
                    {translateStep === 2 && '正在翻译到 English...'}
                    {translateStep >= 3 && translateStep < 5 && '正在翻译多语言内容...'}
                    {translateStep === 5 && '正在保存翻译结果...'}
                  </p>

                  {/* 进度条 */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${translateProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500">{Math.round(translateProgress)}%</p>
                </div>
              )}

              {/* 完成状态 */}
              {translateProgress >= 100 && !translateError && (
                <div className="text-left bg-emerald-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-emerald-700 font-medium mb-2">已完成翻译：</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">✓ English</span>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">✓ ภาษาไทย</span>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">✓ 日本語</span>
                  </div>
                </div>
              )}

              {/* 错误状态 */}
              {translateError && (
                <div className="text-left bg-red-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-600">{translateError}</p>
                </div>
              )}

              {/* 翻译说明 */}
              {translateProgress < 100 && !translateError && (
                <p className="text-xs text-slate-400">
                  正在使用通义千问 AI 进行多语言翻译，请稍候...
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
