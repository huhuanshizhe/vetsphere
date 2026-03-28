'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Course, Specialty } from '@vetsphere/shared/types';
import { Card, Button, LoadingState, ConfirmDialog, ToastContainer, useToast } from '@/components/ui';

type Lang = 'en' | 'zh' | 'th' | 'ja';

export default function CourseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  
  // 数据状态
  const [course, setCourse] = useState<Course | null>(null);
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

  // Toast 通知
  const { toasts, removeToast, success, error: toastError } = useToast();

  // 只读模式：已上架课程只能查看不能编辑
  const isReadOnly = course?.status === 'published';

  // 加载课程数据
  useEffect(() => {
    loadCourse();
  }, [id]);

  async function loadCourse() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/courses/${id}?view=base`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('课程不存在');
        throw new Error('加载失败');
      }
      const json = await res.json();
      const data = json.data;
      // 标准化状态值为小写
      if (data.status) data.status = data.status.toLowerCase();
      setCourse(data);
      setEditForm({ ...data });
      // 默认显示源语言
      setEditLang((data.publishLanguage || 'zh') as Lang);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  // 多语言读写逻辑
  const getPublishLang = () => ((editForm as any).publishLanguage || 'zh') as string;
  
  const getLocalizedValue = (baseField: string, obj: any = editForm): string => {
    const publishLang = getPublishLang();
    const suffixValue = obj?.[`${baseField}_${editLang}`];
    if (suffixValue) return suffixValue;
    if (editLang === publishLang) return obj?.[baseField] || '';
    return '';
  };
  
  const setLocalizedValue = (baseField: string, value: string, nestedPath?: string) => {
    const publishLang = getPublishLang();
    const field = editLang === publishLang ? baseField : `${baseField}_${editLang}`;
    
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
      const res = await fetch(`/api/v1/admin/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('保存失败');
      setSaveSuccess(true);
      setIsDirty(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败');
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
      const saveRes = await fetch(`/api/v1/admin/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!saveRes.ok) throw new Error('保存失败');
      
      // 2. 更新课程状态为 published
      const { error: updateError } = await supabase
        .from('courses')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          offline_reason: null,
          offline_at: null,
        })
        .eq('id', id);
      if (updateError) throw updateError;
      
      // 3. 为每个选中站点创建 course_site_views（使用API绕过RLS）
      const siteViewErrors: string[] = [];
      for (const site of selectedSites) {
        const res = await fetch(`/api/v1/admin/courses/${id}/site-view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            site_code: site,
            publish_status: 'published',
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error(`创建 ${site} 站点视图失败:`, err);
          siteViewErrors.push(`${site}: ${err.error || res.statusText}`);
        }
      }
      if (siteViewErrors.length > 0) {
        throw new Error(`站点视图创建失败: ${siteViewErrors.join(', ')}`);
      }
      
      // 4. 记录审计日志
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: user?.id,
        module: 'course',
        action: 'publish',
        target_type: 'course',
        target_id: id,
        target_name: course.title,
        changes_summary: `上架课程: ${course.title}，站点: ${selectedSites.join(', ').toUpperCase()}`,
      });
      
      setShowPublishDialog(false);
      setIsDirty(false);
      // 重新加载以刷新状态
      await loadCourse();
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
      await loadCourse();

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
            disabled={isReadOnly}
            className={translateSuccess ? '!bg-emerald-500 !text-white' : '!bg-purple-600 hover:!bg-purple-500 !text-white'}
          >
            {translating ? 'AI翻译中...' : translateSuccess ? '翻译完成 ✓' : 'AI补全翻译'}
          </Button>
          {/* 保存按钮 - 只读模式下隐藏 */}
          {!isReadOnly && (
            <Button
              onClick={handleSave}
              loading={saving}
              className={saveSuccess ? '!bg-green-500' : ''}
            >
              {saving ? '保存中...' : saveSuccess ? '已保存 ✓' : '保存修改'}
            </Button>
          )}
          {/* 保存并上架按钮 - 仅在待审核或已下架时显示 */}
          {(course.status === 'pending' || course.status === 'offline') && (
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

      {/* 只读模式提示 */}
      {isReadOnly && (
        <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>此课程已上架，当前为只读模式。如需修改，请先下架课程。</span>
        </div>
      )}

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

      {/* Section 1: 基本信息 */}
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
              onChange={(e) => setLocalizedValue('title', e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">难度级别</label>
              <select
                value={editForm.level || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, level: e.target.value as Course['level'] })); setIsDirty(true); }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">美元 (USD)</label>
              <input
                type="number"
                value={editForm.price_usd || ''}
                onChange={(e) => { const n = Number(e.target.value); const val = !isNaN(n) && e.target.value !== '' ? n : undefined; setEditForm(prev => ({ ...prev, price_usd: val })); setIsDirty(true); }}
                placeholder="$"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">日元 (JPY)</label>
              <input
                type="number"
                value={editForm.price_jpy || ''}
                onChange={(e) => { const n = Number(e.target.value); const val = !isNaN(n) && e.target.value !== '' ? n : undefined; setEditForm(prev => ({ ...prev, price_jpy: val })); setIsDirty(true); }}
                placeholder="¥"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">泰铢 (THB)</label>
              <input
                type="number"
                value={editForm.price_thb || ''}
                onChange={(e) => { const n = Number(e.target.value); const val = !isNaN(n) && e.target.value !== '' ? n : undefined; setEditForm(prev => ({ ...prev, price_thb: val })); setIsDirty(true); }}
                placeholder="฿"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Section 2: 课程详情 */}
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
              className="w-full min-h-[100px] px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          {/* 总课时 */}
          <div className="w-48">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">总课时 (小时)</label>
            <input
              type="number"
              value={editForm.totalHours || ''}
              onChange={(e) => { setEditForm(prev => ({ ...prev, totalHours: Number(e.target.value) || undefined })); setIsDirty(true); }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-xs text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">预览视频</label>
              <input
                type="text"
                value={(editForm as any).previewVideoUrl || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, previewVideoUrl: e.target.value })); setIsDirty(true); }}
                placeholder="视频 URL"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Section 3: 讲师信息 */}
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
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
              className="w-full min-h-[80px] px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none"
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
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
        </div>
      </Card>

      {/* Section 4: 课程日期 */}
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
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">结课日期</label>
            <input
              type="date"
              value={editForm.endDate || ''}
              onChange={(e) => { setEditForm(prev => ({ ...prev, endDate: e.target.value })); setIsDirty(true); }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">报名截止</label>
            <input
              type="date"
              value={editForm.enrollmentDeadline || ''}
              onChange={(e) => { setEditForm(prev => ({ ...prev, enrollmentDeadline: e.target.value })); setIsDirty(true); }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200/50 rounded-lg text-xs text-slate-900 focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">省/州/地区</label>
              <input
                type="text"
                value={(editForm.location as any)?.region || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, location: { ...prev.location, region: e.target.value } as Course['location'] })); setIsDirty(true); }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Section 6: 行程服务安排 */}
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
              className="w-full min-h-[60px] px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none"
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
              className="w-full min-h-[60px] px-4 py-3 bg-slate-50 border border-slate-200/50 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none"
            />
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
