'use client';

import React, { useState } from 'react';
import { Course, CourseStatus, Specialty } from '@vetsphere/shared/types';
import { api } from '@vetsphere/shared/services/api';
import DataTable, { Column } from './DataTable';

interface CourseAuditTabProps {
  courses: Course[];
  onRefresh: () => void;
}

const CourseAuditTab: React.FC<CourseAuditTabProps> = ({ courses, onRefresh }) => {
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editForm, setEditForm] = useState<Partial<Course>>({});
  const [saving, setSaving] = useState(false);
  const [editLang, setEditLang] = useState<'en' | 'zh' | 'th' | 'ja'>('zh');
  
  // AI 翻译状态
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateSuccess, setTranslateSuccess] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 获取发布语言
  const getPublishLang = () => ((editForm as any).publishLanguage || 'zh') as string;
  
  // 多语言字段读取
  // 新逻辑：翻译后所有语言都存储在后缀字段 (title_en, title_zh, title_th, title_ja)
  // 只有未翻译时，源语言才回退到 BASE 字段
  const getLocalizedValue = (baseField: string, obj: any = editForm) => {
    const publishLang = getPublishLang();
    
    // 1. 优先尝试读取当前语言的后缀字段
    const suffixValue = obj?.[`${baseField}_${editLang}`];
    if (suffixValue) return suffixValue;
    
    // 2. 如果是源语言且后缀字段为空，回退到 BASE 字段
    if (editLang === publishLang) {
      return obj?.[baseField] || '';
    }
    
    // 3. 后备: 从 instructor._translations 读取（数据库列不存在时的兼容）
    const translationsKey = `${baseField}_${editLang}`;
    const fallbackValue = obj?.instructor?._translations?.[translationsKey];
    return fallbackValue || '';
  };
  
  // 多语言字段写入
  const setLocalizedValue = (baseField: string, value: string, nestedPath?: string) => {
    const publishLang = getPublishLang();
    const field = editLang === publishLang ? baseField : `${baseField}_${editLang}`;
    
    if (nestedPath) {
      // 嵌套字段如 instructor.name
      const [parent] = nestedPath.split('.');
      setEditForm(prev => ({
        ...prev,
        [parent]: { ...(prev as any)[parent], [field]: value }
      }));
    } else {
      setEditForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleApprove = async (courseId: string) => {
    await api.manageCourse('update', { id: courseId, status: 'published' });
    onRefresh();
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setEditForm({ ...course });
    // 默认显示源语言标签
    setEditLang(((course as any).publishLanguage || 'zh') as 'en' | 'zh' | 'th' | 'ja');
  };

  // AI 翻译功能
  const handleTranslate = async (courseId: string) => {
    setTranslatingId(courseId);
    setTranslateError(null);
    setTranslateSuccess(null);
    
    try {
      const response = await fetch('/api/courses/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '翻译失败');
      }
      
      setTranslateSuccess(courseId);
      setTimeout(() => setTranslateSuccess(null), 3000);
      
      // 刷新课程列表
      onRefresh();
      
      // 如果正在编辑此课程，重新加载编辑表单数据
      if (editingCourse?.id === courseId) {
        // 获取更新后的课程数据
        const updatedCourses = await api.getCourses();
        const updatedCourse = updatedCourses.find((c: Course) => c.id === courseId);
        if (updatedCourse) {
          setEditForm({ ...updatedCourse });
        }
      }
    } catch (error) {
      setTranslateError(error instanceof Error ? error.message : '翻译服务异常');
      setTimeout(() => setTranslateError(null), 5000);
    } finally {
      setTranslatingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCourse) return;
    setSaving(true);
    try {
      await api.manageCourse('update', {
        id: editingCourse.id,
        // 基础信息 (publishLanguage 不可编辑，由发布者设定)
        title: editForm.title,
        title_zh: editForm.title_zh,
        title_th: editForm.title_th,
        title_ja: (editForm as Record<string, unknown>).title_ja as string,
        specialty: editForm.specialty,
        level: editForm.level,
        price: editForm.price,
        currency: editForm.currency,
        maxCapacity: editForm.maxCapacity,
        // 课程详情
        teachingLanguages: (editForm as any).teachingLanguages,
        description: editForm.description,
        description_zh: editForm.description_zh,
        description_th: editForm.description_th,
        description_ja: (editForm as Record<string, unknown>).description_ja as string,
        totalHours: editForm.totalHours,
        imageUrl: editForm.imageUrl,
        previewVideoUrl: (editForm as any).previewVideoUrl,
        // 讲师信息
        instructor: editForm.instructor,
        // 日程
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        enrollmentDeadline: editForm.enrollmentDeadline,
        agenda: editForm.agenda,
        // 地点
        location: editForm.location,
        // 行程服务
        services: (editForm as any).services,
        // 状态由 通过/拒绝 按钮控制，不在此处修改
      });
      // 显示成功提示，不关闭模态框
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      // 静默刷新课程列表
      onRefresh();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: CourseStatus) => {
    switch (status) {
      case 'published': return <span className="text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded text-xs font-bold">已上架</span>;
      case 'pending': return <span className="text-amber-400 bg-amber-900/30 px-2 py-1 rounded text-xs font-bold animate-pulse">待审核</span>;
      case 'offline': return <span className="text-slate-500 bg-slate-900/30 px-2 py-1 rounded text-xs font-bold">已下架</span>;
      default: return <span className="text-slate-500 bg-white px-2 py-1 rounded text-xs font-bold">草稿</span>;
    }
  };

  // 翻译状态徽章
  const translationBadge = (course: Course) => {
    if (course.translationsComplete) {
      return <span className="text-sky-400 bg-sky-900/30 px-2 py-1 rounded text-xs font-bold ml-2">已翻译</span>;
    }
    return <span className="text-orange-400 bg-orange-900/30 px-2 py-1 rounded text-xs font-bold ml-2">待翻译</span>;
  };

  const columns: Column<Course>[] = [
    {
      key: 'title',
      header: '课程名称',
      render: (_, row) => (
        <div>
          <div className="flex items-center">
            <p className="font-bold text-slate-900 text-sm">{row.title_zh || row.title}</p>
            {translationBadge(row)}
          </div>
          {row.title_zh && row.title && <p className="text-xs text-slate-500 mt-0.5">{row.title}</p>}
          <p className="text-xs text-slate-600 mt-0.5">发布语言: {row.publishLanguage || '未设置'}</p>
        </div>
      ),
    },
    { key: 'instructor.name', header: '讲师', render: (_, row) => <span className="text-slate-500">{row.instructor?.name || 'TBD'}</span>, hideOnMobile: true },
    { key: 'price', header: '价格', render: (v, row) => <span className="text-slate-900 font-bold">{row.currency === 'CNY' ? '¥' : '$'}{(v || 0).toLocaleString()}</span>, hideOnMobile: true },
    { key: 'status', header: '状态', render: (v) => statusBadge(v as CourseStatus) },
    {
      key: 'action',
      header: '操作',
      align: 'right',
      render: (_, row) => (
        <div className="flex justify-end gap-2 flex-wrap">
          {/* AI翻译按钮 */}
          <button 
            onClick={(e) => { e.stopPropagation(); handleTranslate(row.id); }} 
            disabled={translatingId === row.id}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all min-h-[32px] ${
              translatingId === row.id 
                ? 'bg-purple-500/50 text-purple-200 cursor-wait' 
                : translateSuccess === row.id
                ? 'bg-emerald-500 text-black'
                : 'bg-purple-600 text-white hover:bg-purple-500'
            }`}
          >
            {translatingId === row.id ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                翻译中
              </span>
            ) : translateSuccess === row.id ? '完成' : 'AI翻译'}
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="text-slate-500 hover:text-slate-900 text-xs font-bold border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all min-h-[32px]">
            编辑
          </button>
          {row.status === 'pending' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); handleApprove(row.id); }} className="bg-emerald-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-400 transition-all min-h-[32px]">
                通过
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const mobileCard = (course: Course) => (
    <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1">
            <p className="font-bold text-slate-900 text-sm truncate">{course.title_zh || course.title}</p>
            {translationBadge(course)}
          </div>
          <p className="text-xs text-slate-500">{course.instructor?.name || 'TBD'}</p>
        </div>
        {statusBadge(course.status as CourseStatus)}
      </div>
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
        <span className="text-sm text-slate-500 font-bold">{course.currency === 'CNY' ? '¥' : '$'}{(course.price || 0).toLocaleString()}</span>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => handleTranslate(course.id)} 
            disabled={translatingId === course.id}
            className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold min-h-[32px] disabled:opacity-50"
          >
            {translatingId === course.id ? '翻译中...' : 'AI翻译'}
          </button>
          <button onClick={() => handleEdit(course)} className="text-xs font-bold border border-white/10 px-3 py-1.5 rounded-lg text-slate-500 min-h-[32px]">编辑</button>
          {course.status === 'pending' && (
            <>
              <button onClick={() => handleApprove(course.id)} className="bg-emerald-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold min-h-[32px]">通过</button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h3 className="font-bold text-lg text-slate-900">平台课程全库</h3>
        <div className="text-slate-500 text-xs">共 {courses.length} 门课程</div>
      </div>

      {/* 翻译错误提示 */}
      {translateError && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
          翻译失败: {translateError}
        </div>
      )}

      <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        <DataTable columns={columns} data={courses} keyField="id" mobileCardRenderer={mobileCard} />
      </div>

      {/* Edit modal - 完整课程内容编辑 (与发布者表单完全匹配) */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-6 w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#0F172A] pb-4 border-b border-white/10 z-20">
              <h3 className="text-slate-900 font-black text-lg">编辑课程 - 完整内容预览</h3>
              <button onClick={() => setEditingCourse(null)} className="text-slate-500 hover:text-slate-900 text-xl">&times;</button>
            </div>

            {/* Language tabs - 4种语言 */}
            <div className="flex gap-2 mb-6 flex-wrap sticky top-16 bg-[#0F172A] py-2 z-10">
              {(['en', 'zh', 'th', 'ja'] as const).map(lang => {
                const publishLang = (editForm as any).publishLanguage || 'zh';
                const isSource = lang === publishLang;
                return (
                  <button
                    key={lang}
                    onClick={() => setEditLang(lang)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      editLang === lang ? 'bg-emerald-500 text-black' : 'bg-white/5 text-slate-500 hover:bg-white/10'
                    }`}
                  >
                    {lang === 'en' ? 'English' : lang === 'zh' ? '中文' : lang === 'th' ? 'ไทย' : '日本語'}
                    {isSource && <span className="ml-1 text-xs opacity-70">(源)</span>}
                  </button>
                );
              })}
            </div>

            <div className="space-y-8">
              {/* Section 1: 基本信息 */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/5">
                <h4 className="text-emerald-400 font-bold text-sm mb-4 flex items-center gap-2">
                  <span className="text-lg">📋</span> 基本信息
                </h4>
                <div className="space-y-4">
                  {/* 发布语言 - 只读显示 */}
                  <div className="flex items-center gap-3 p-3 bg-black/30 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-500">发布语言:</span>
                    <span className="text-sm text-slate-900 font-medium">
                      {(editForm as any).publishLanguage === 'zh' ? '中文' : 
                       (editForm as any).publishLanguage === 'en' ? 'English' :
                       (editForm as any).publishLanguage === 'ja' ? '日本語' : 
                       (editForm as any).publishLanguage === 'th' ? 'ภาษาไทย' : '中文'}
                    </span>
                    <span className="text-xs text-slate-600">(AI翻译将从此语言翻译到其他语言)</span>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      课程标题 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                    </label>
                    <input
                      type="text"
                      value={getLocalizedValue('title')}
                      onChange={(e) => setLocalizedValue('title', e.target.value)}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Specialty & Level */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">专科分类</label>
                      <input
                        type="text"
                        value={editForm.specialty || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, specialty: e.target.value as Specialty }))}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">难度级别</label>
                      <select
                        value={editForm.level || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, level: e.target.value as Course['level'] }))}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
                        onChange={(e) => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">货币</label>
                      <select
                        value={editForm.currency || 'CNY'}
                        onChange={(e) => setEditForm(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
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
                        onChange={(e) => setEditForm(prev => ({ ...prev, maxCapacity: Number(e.target.value) }))}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: 课程详情 */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/5">
                <h4 className="text-sky-400 font-bold text-sm mb-4 flex items-center gap-2">
                  <span className="text-lg">📖</span> 课程详情
                </h4>
                <div className="space-y-4">
                  {/* 授课语言 (多选) */}
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
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              isSelected ? 'bg-sky-500 border-sky-400 text-slate-900' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                            }`}
                          >
                            {isSelected && '✓ '}{lang.l}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      课程描述 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                    </label>
                    <textarea
                      value={getLocalizedValue('description')}
                      onChange={(e) => setLocalizedValue('description', e.target.value)}
                      className="w-full min-h-[100px] px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none"
                    />
                  </div>

                  {/* 总课时 */}
                  <div className="w-48">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">总课时 (小时)</label>
                    <input
                      type="number"
                      value={editForm.totalHours || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, totalHours: Number(e.target.value) || undefined }))}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* 媒体 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">课程封面图</label>
                      {editForm.imageUrl && (
                        <img src={editForm.imageUrl} alt="封面" className="w-full h-32 object-cover rounded-lg mb-2 border border-white/10" />
                      )}
                      <input
                        type="text"
                        value={editForm.imageUrl || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                        placeholder="图片 URL"
                        className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">预览视频</label>
                      <input
                        type="text"
                        value={(editForm as any).previewVideoUrl || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, previewVideoUrl: e.target.value }))}
                        placeholder="视频 URL"
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: 讲师信息 */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/5">
                <h4 className="text-purple-400 font-bold text-sm mb-4 flex items-center gap-2">
                  <span className="text-lg">👨‍🏫</span> 讲师信息
                </h4>
                <div className="space-y-4">
                  {/* 讲师头像 */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">讲师头像</label>
                    <div className="flex items-center gap-4">
                      {editForm.instructor?.imageUrl && (
                        <img src={editForm.instructor.imageUrl} alt="讲师" className="w-16 h-16 object-cover rounded-full border border-white/10" />
                      )}
                      <input
                        type="text"
                        value={editForm.instructor?.imageUrl || ''}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          instructor: { ...prev.instructor, imageUrl: e.target.value } as Course['instructor']
                        }))}
                        placeholder="头像 URL"
                        className="flex-1 px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                        讲师姓名 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                      </label>
                      <input
                        type="text"
                        value={getLocalizedValue('name', editForm.instructor)}
                        onChange={(e) => {
                          const publishLang = getPublishLang();
                          const field = editLang === publishLang ? 'name' : `name_${editLang}`;
                          setEditForm(prev => ({
                            ...prev,
                            instructor: { ...prev.instructor, [field]: e.target.value } as Course['instructor']
                          }));
                        }}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                        讲师职称 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                      </label>
                      <input
                        type="text"
                        value={getLocalizedValue('title', editForm.instructor)}
                        onChange={(e) => {
                          const publishLang = getPublishLang();
                          const field = editLang === publishLang ? 'title' : `title_${editLang}`;
                          setEditForm(prev => ({
                            ...prev,
                            instructor: { ...prev.instructor, [field]: e.target.value } as Course['instructor']
                          }));
                        }}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      讲师简介 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                    </label>
                    <textarea
                      value={getLocalizedValue('bio', editForm.instructor)}
                      onChange={(e) => {
                        const publishLang = getPublishLang();
                        const field = editLang === publishLang ? 'bio' : `bio_${editLang}`;
                        setEditForm(prev => ({
                          ...prev,
                          instructor: { ...prev.instructor, [field]: e.target.value } as Course['instructor']
                        }));
                      }}
                      className="w-full min-h-[80px] px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none"
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
                              setEditForm(prev => ({
                                ...prev,
                                instructor: { ...prev.instructor, credentials: newCreds } as Course['instructor']
                              }));
                            }}
                            className="flex-1 px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newCreds = ((editForm.instructor?.credentials || []) as string[]).filter((_, i) => i !== idx);
                              setEditForm(prev => ({
                                ...prev,
                                instructor: { ...prev.instructor, credentials: newCreds } as Course['instructor']
                              }));
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
                          setEditForm(prev => ({
                            ...prev,
                            instructor: { ...prev.instructor, credentials: newCreds } as Course['instructor']
                          }));
                        }}
                        className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 text-xs"
                      >
                        + 添加证书
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: 日程安排 */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/5">
                <h4 className="text-amber-400 font-bold text-sm mb-4 flex items-center gap-2">
                  <span className="text-lg">📅</span> 课程日期
                </h4>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">开课日期</label>
                    <input
                      type="date"
                      value={editForm.startDate || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">结课日期</label>
                    <input
                      type="date"
                      value={editForm.endDate || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">报名截止</label>
                    <input
                      type="date"
                      value={editForm.enrollmentDeadline || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, enrollmentDeadline: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Agenda days */}
                {editForm.agenda && editForm.agenda.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                      课程日程 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                    </label>
                    {editForm.agenda.map((day: { date?: string; items?: Array<{ time?: string; activity?: string }> }, dayIdx: number) => (
                      <div key={dayIdx} className="bg-black/30 rounded-lg p-3 border border-white/5">
                        <div className="text-xs text-amber-400 font-bold mb-2">Day {dayIdx + 1}: {day.date || ''}</div>
                        <div className="space-y-2">
                          {day.items?.map((item: { time?: string; activity?: string }, itemIdx: number) => {
                            const publishLang = getPublishLang();
                            // 优先读取后缀字段，回退到 BASE 字段（用于未翻译的情况）
                            const suffixActivity = (item as Record<string, unknown>)[`activity_${editLang}`] as string;
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
                                      (newAgenda[dayIdx].items![itemIdx] as Record<string, unknown>)[field] = e.target.value;
                                    }
                                    setEditForm(prev => ({ ...prev, agenda: newAgenda }));
                                  }}
                                  className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-xs text-slate-900 focus:border-emerald-500 outline-none"
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
              </div>

              {/* Section 5: 上课地点 */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/5">
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
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          location: { ...prev.location, country: e.target.value } as Course['location']
                        }))}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">省/州/地区</label>
                      <input
                        type="text"
                        value={(editForm.location as any)?.region || ''}
                        onChange={(e) => setEditForm(prev => ({
                          ...prev,
                          location: { ...prev.location, region: e.target.value } as Course['location']
                        }))}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                        城市 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                      </label>
                      <input
                        type="text"
                        value={getLocalizedValue('city', editForm.location)}
                        onChange={(e) => {
                          const publishLang = getPublishLang();
                          const field = editLang === publishLang ? 'city' : `city_${editLang}`;
                          setEditForm(prev => ({
                            ...prev,
                            location: { ...prev.location, [field]: e.target.value } as Course['location']
                          }));
                        }}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                        场地名称 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                      </label>
                      <input
                        type="text"
                        value={getLocalizedValue('venue', editForm.location)}
                        onChange={(e) => {
                          const publishLang = getPublishLang();
                          const field = editLang === publishLang ? 'venue' : `venue_${editLang}`;
                          setEditForm(prev => ({
                            ...prev,
                            location: { ...prev.location, [field]: e.target.value } as Course['location']
                          }));
                        }}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                        详细地址 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                      </label>
                      <input
                        type="text"
                        value={getLocalizedValue('address', editForm.location)}
                        onChange={(e) => {
                          const publishLang = getPublishLang();
                          const field = editLang === publishLang ? 'address' : `address_${editLang}`;
                          setEditForm(prev => ({
                            ...prev,
                            location: { ...prev.location, [field]: e.target.value } as Course['location']
                          }));
                        }}
                        className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 6: 行程服务安排 */}
              <div className="bg-black/30 rounded-xl p-5 border border-white/5">
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
                                onClick={() => setEditForm(prev => ({
                                  ...prev,
                                  services: { ...(prev as any).services, [service.key]: opt.v }
                                }))}
                                className={`px-2 py-1 rounded text-xs border transition-all ${
                                  value === opt.v ? opt.c : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
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
                      🗺️ 交通指南 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                    </label>
                    <textarea
                      value={getLocalizedValue('directions', (editForm as any).services)}
                      onChange={(e) => {
                        const publishLang = getPublishLang();
                        const field = editLang === publishLang ? 'directions' : `directions_${editLang}`;
                        setEditForm(prev => ({
                          ...prev,
                          services: { ...(prev as any).services, [field]: e.target.value }
                        }));
                      }}
                      placeholder="如何到达培训地点..."
                      className="w-full min-h-[60px] px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none"
                    />
                  </div>

                  {/* 其他备注 */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      📝 其他备注 ({editLang === getPublishLang() ? `${editLang} - 源` : editLang})
                    </label>
                    <textarea
                      value={getLocalizedValue('notes', (editForm as any).services)}
                      onChange={(e) => {
                        const publishLang = getPublishLang();
                        const field = editLang === publishLang ? 'notes' : `notes_${editLang}`;
                        setEditForm(prev => ({
                          ...prev,
                          services: { ...(prev as any).services, [field]: e.target.value }
                        }));
                      }}
                      placeholder="其他需要学员了解的信息..."
                      className="w-full min-h-[60px] px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-slate-900 focus:border-emerald-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 sticky bottom-0 bg-[#0F172A] pt-4 border-t border-white/10">
              <button onClick={() => setEditingCourse(null)} className="flex-1 py-3 border border-white/10 rounded-xl text-sm font-bold text-slate-500 hover:bg-white/5 transition-all">关闭</button>
              <button 
                onClick={() => handleTranslate(editingCourse.id)} 
                disabled={translatingId === editingCourse.id}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-500 disabled:opacity-50 transition-all"
              >
                {translatingId === editingCourse.id ? 'AI 翻译中...' : 'AI 补全所有语言'}
              </button>
              <button onClick={handleSaveEdit} disabled={saving} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                saveSuccess 
                  ? 'bg-green-500 text-white' 
                  : 'bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50'
              }`}>
                {saving ? '保存中...' : saveSuccess ? '已保存 ✓' : '保存修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseAuditTab;
