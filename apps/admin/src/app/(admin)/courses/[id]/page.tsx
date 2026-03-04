'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Course, Specialty } from '@vetsphere/shared/types';
import { Card, Button, StatusBadge, LoadingState, ConfirmDialog } from '@/components/ui';

type Lang = 'en' | 'zh' | 'th' | 'ja';

export default function CourseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
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
  
  // 离开确认
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

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

  // AI翻译
  async function handleTranslate() {
    if (!course) return;
    setTranslating(true);
    setTranslateError(null);
    try {
      const res = await fetch('/api/courses/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: id }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || '翻译失败');
      }
      setTranslateSuccess(true);
      setTimeout(() => setTranslateSuccess(false), 3000);
      // 重新加载数据
      await loadCourse();
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : '翻译失败');
      setTimeout(() => setTranslateError(null), 5000);
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
            <h2 className="text-xl font-bold text-white mb-2">{error || '课程不存在'}</h2>
            <p className="text-slate-400 mb-6">无法加载课程数据</p>
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
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <div>
            <h1 className="text-xl font-bold text-white truncate max-w-md">
              {editForm.title_zh || editForm.title || '编辑课程'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={course.status as any} />
              {course.translationsComplete ? (
                <span className="text-sky-400 bg-sky-900/30 px-2 py-0.5 rounded text-xs font-bold">已翻译</span>
              ) : (
                <span className="text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded text-xs font-bold">待翻译</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* AI翻译按钮 */}
          <Button
            variant="secondary"
            onClick={handleTranslate}
            loading={translating}
            className={translateSuccess ? '!bg-emerald-500 !text-black' : '!bg-purple-600 hover:!bg-purple-500'}
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
        </div>
      </div>

      {/* 错误提示 */}
      {(saveError || translateError) && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
          {saveError || translateError}
        </div>
      )}

      {/* 语言切换标签 */}
      <div className="flex gap-2 flex-wrap sticky top-0 bg-[var(--admin-bg)] py-3 z-10">
        {(['en', 'zh', 'th', 'ja'] as const).map(lang => {
          const isSource = lang === publishLang;
          return (
            <button
              key={lang}
              onClick={() => setEditLang(lang)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                editLang === lang
                  ? 'bg-emerald-500 text-black'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
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
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
            <span className="text-xs text-slate-500">发布语言:</span>
            <span className="text-sm text-white font-medium">
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
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">难度级别</label>
              <select
                value={editForm.level || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, level: e.target.value as Course['level'] })); setIsDirty(true); }}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
              >
                <option value="Basic">基础 Basic</option>
                <option value="Intermediate">进阶 Intermediate</option>
                <option value="Advanced">高级 Advanced</option>
                <option value="Master">大师 Master</option>
              </select>
            </div>
          </div>

          {/* 价格、货币、容量 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">课程价格</label>
              <input
                type="number"
                value={editForm.price || 0}
                onChange={(e) => { setEditForm(prev => ({ ...prev, price: Number(e.target.value) })); setIsDirty(true); }}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">货币</label>
              <select
                value={editForm.currency || 'CNY'}
                onChange={(e) => { setEditForm(prev => ({ ...prev, currency: e.target.value })); setIsDirty(true); }}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
              >
                <option value="CNY">¥ 人民币</option>
                <option value="USD">$ 美元</option>
                <option value="JPY">¥ 日元</option>
                <option value="THB">฿ 泰铢</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">最大容量</label>
              <input
                type="number"
                value={editForm.maxCapacity || 30}
                onChange={(e) => { setEditForm(prev => ({ ...prev, maxCapacity: Number(e.target.value) })); setIsDirty(true); }}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>
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
                      isSelected ? 'bg-sky-500 border-sky-400 text-white' : 'bg-slate-700/50 border-slate-600/50 text-slate-400 hover:border-slate-500'
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
              className="w-full min-h-[100px] px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none resize-none"
            />
          </div>

          {/* 总课时 */}
          <div className="w-48">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">总课时 (小时)</label>
            <input
              type="number"
              value={editForm.totalHours || ''}
              onChange={(e) => { setEditForm(prev => ({ ...prev, totalHours: Number(e.target.value) || undefined })); setIsDirty(true); }}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>

          {/* 媒体 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">课程封面图</label>
              {editForm.imageUrl && (
                <img src={editForm.imageUrl} alt="封面" className="w-full h-32 object-cover rounded-lg mb-2 border border-slate-600/50" />
              )}
              <input
                type="text"
                value={editForm.imageUrl || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, imageUrl: e.target.value })); setIsDirty(true); }}
                placeholder="图片 URL"
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">预览视频</label>
              <input
                type="text"
                value={(editForm as any).previewVideoUrl || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, previewVideoUrl: e.target.value })); setIsDirty(true); }}
                placeholder="视频 URL"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
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
                <img src={editForm.instructor.imageUrl} alt="讲师" className="w-16 h-16 object-cover rounded-full border border-slate-600/50" />
              )}
              <input
                type="text"
                value={editForm.instructor?.imageUrl || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, instructor: { ...prev.instructor, imageUrl: e.target.value } as Course['instructor'] })); setIsDirty(true); }}
                placeholder="头像 URL"
                className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
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
              className="w-full min-h-[80px] px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none resize-none"
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
                    className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
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
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">结课日期</label>
            <input
              type="date"
              value={editForm.endDate || ''}
              onChange={(e) => { setEditForm(prev => ({ ...prev, endDate: e.target.value })); setIsDirty(true); }}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">报名截止</label>
            <input
              type="date"
              value={editForm.enrollmentDeadline || ''}
              onChange={(e) => { setEditForm(prev => ({ ...prev, enrollmentDeadline: e.target.value })); setIsDirty(true); }}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
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
              <div key={dayIdx} className="bg-slate-800/30 rounded-lg p-3 border border-slate-600/30">
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
                          className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-xs text-white focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">省/州/地区</label>
              <input
                type="text"
                value={(editForm.location as any)?.region || ''}
                onChange={(e) => { setEditForm(prev => ({ ...prev, location: { ...prev.location, region: e.target.value } as Course['location'] })); setIsDirty(true); }}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
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
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none"
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
                          value === opt.v ? opt.c : 'bg-slate-700/50 border-slate-600/50 text-slate-500 hover:border-slate-500'
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
              className="w-full min-h-[60px] px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none resize-none"
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
              className="w-full min-h-[60px] px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-sm text-white focus:border-emerald-500 outline-none resize-none"
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
    </div>
  );
}
