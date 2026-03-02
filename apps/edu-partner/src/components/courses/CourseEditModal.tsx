'use client';

import { useState, useCallback, useEffect } from 'react';
import { api } from '@vetsphere/shared/services/api';
import type { Course } from '@vetsphere/shared/types';
import { useCourseForm } from '@/hooks/useCourseForm';
import CourseFormFields from './CourseFormFields';
import MediaUploader from './MediaUploader';
import AgendaEditor from './AgendaEditor';

interface CourseEditModalProps {
  course: Course | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TABS = [
  { id: 'basic', label: '基本信息', icon: '📋' },
  { id: 'details', label: '课程详情', icon: '📝' },
  { id: 'instructor', label: '讲师信息', icon: '👨‍🏫' },
  { id: 'schedule', label: '课程安排', icon: '📅' },
];

export default function CourseEditModal({
  course,
  onClose,
  onSuccess,
}: CourseEditModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    formData,
    errors,
    updateField,
    updateNested,
    validateAll,
    loadCourse,
    isDirty,
  } = useCourseForm(course || undefined);

  // 加载课程数据
  useEffect(() => {
    if (course) {
      loadCourse(course);
    }
  }, [course, loadCourse]);

  // 保存更改（保持当前状态）
  const handleSave = useCallback(async () => {
    if (!course?.id) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      await api.manageCourse('update', {
        ...formData,
        id: course.id,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Save error:', err);
      setSubmitError('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [course?.id, formData, onSuccess, onClose]);

  // 提交审核（将状态改为 Pending）
  const handleSubmitForReview = useCallback(async () => {
    if (!course?.id) return;
    
    const result = validateAll();
    if (!result.isValid) {
      setSubmitError('请完善所有必填信息');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      await api.manageCourse('update', {
        ...formData,
        id: course.id,
        status: 'Pending',
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Submit error:', err);
      setSubmitError('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [course?.id, formData, validateAll, onSuccess, onClose]);

  // 关闭确认
  const handleClose = useCallback(() => {
    if (isDirty) {
      if (window.confirm('您有未保存的更改，确定要离开吗？')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  if (!course) return null;

  // 判断是否可编辑（只有 Draft 和 Rejected 状态可以编辑）
  const isEditable = course.status === 'Draft' || course.status === 'Rejected';
  // 判断是否可以提交审核
  const canSubmit = course.status === 'Draft' || course.status === 'Rejected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#1A1025] border border-purple-500/20 rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20">
          <div>
            <h2 className="text-lg font-bold text-white">编辑课程</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {course.title_zh || course.title}
              {!isEditable && (
                <span className="ml-2 text-amber-400">（当前状态不可编辑）</span>
              )}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-lg bg-purple-500/10 text-gray-400 hover:text-white hover:bg-purple-500/20 transition-colors flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-purple-500/20 px-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 被拒绝提示 */}
          {course.status === 'Rejected' && course.rejectionReason && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-sm font-medium text-red-400 mb-1">审核未通过</p>
              <p className="text-sm text-red-300">{course.rejectionReason}</p>
            </div>
          )}

          {/* Tab: 基本信息 */}
          {activeTab === 'basic' && (
            <CourseFormFields
              formData={formData}
              errors={errors}
              onUpdate={updateField}
              onUpdateNested={updateNested}
              fieldGroup="basic"
              disabled={!isEditable}
            />
          )}

          {/* Tab: 课程详情 */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <MediaUploader
                  type="image"
                  value={formData.imageUrl || null}
                  onChange={url => updateField('imageUrl', url || '')}
                  label="课程封面图"
                />
                <MediaUploader
                  type="video"
                  value={formData.previewVideoUrl || null}
                  onChange={url => updateField('previewVideoUrl', url || '')}
                  label="预览视频 (可选)"
                  maxSizeMB={100}
                />
              </div>
              <CourseFormFields
                formData={formData}
                errors={errors}
                onUpdate={updateField}
                onUpdateNested={updateNested}
                fieldGroup="details"
                disabled={!isEditable}
              />
            </div>
          )}

          {/* Tab: 讲师信息 */}
          {activeTab === 'instructor' && (
            <div className="space-y-6">
              <MediaUploader
                type="image"
                value={formData.instructor?.imageUrl || null}
                onChange={url => updateNested('instructor.imageUrl', url || '')}
                label="讲师头像"
                className="max-w-xs"
              />
              <CourseFormFields
                formData={formData}
                errors={errors}
                onUpdate={updateField}
                onUpdateNested={updateNested}
                fieldGroup="instructor"
                disabled={!isEditable}
              />
            </div>
          )}

          {/* Tab: 课程安排 */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <CourseFormFields
                formData={formData}
                errors={errors}
                onUpdate={updateField}
                onUpdateNested={updateNested}
                fieldGroup="schedule"
                disabled={!isEditable}
              />
              <div className="mt-8">
                <AgendaEditor
                  value={formData.agenda || []}
                  onChange={agenda => updateField('agenda', agenda)}
                  startDate={formData.startDate}
                  endDate={formData.endDate}
                  disabled={!isEditable}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-purple-500/20 bg-[#0F0A1F]">
          {submitError && (
            <p className="text-sm text-red-400">{submitError}</p>
          )}
          {!submitError && <div />}

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gray-500/20 text-gray-300 rounded-xl hover:bg-gray-500/30 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            
            {isEditable && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || !isDirty}
                  className="px-5 py-2.5 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? '保存中...' : '保存更改'}
                </button>
                
                {canSubmit && (
                  <button
                    onClick={handleSubmitForReview}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? '提交中...' : '提交审核'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
