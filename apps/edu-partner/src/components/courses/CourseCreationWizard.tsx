'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@vetsphere/shared/context/AuthContext';
import { api } from '@vetsphere/shared/services/api';
import { useCourseForm, type CourseFormData } from '@/hooks/useCourseForm';
import CourseFormFields from './CourseFormFields';
import MediaUploader from './MediaUploader';
import AgendaEditor from './AgendaEditor';
import CoursePreview from './CoursePreview';

interface CourseCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = [
  { id: 'info', title: '课程信息', icon: '📋' },
  { id: 'schedule', title: '课程安排', icon: '📅' },
  { id: 'preview', title: '预览确认', icon: '✅' },
];

export default function CourseCreationWizard({
  isOpen,
  onClose,
  onSuccess,
}: CourseCreationWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    formData,
    errors,
    updateField,
    updateNested,
    validateStep,
    reset,
    isDirty,
  } = useCourseForm();

  // 下一步 - 3步验证映射
  // Step 0 (课程信息): 验证 basic(1) + details(2) + instructor(3)
  // Step 1 (课程安排): 验证 schedule(4)
  // Step 2 (预览确认): 完整验证(5)
  const handleNext = useCallback(() => {
    let isValid = true;
    
    if (currentStep === 0) {
      // 验证基本信息、课程详情和讲师信息
      const basicResult = validateStep(1);
      const detailsResult = validateStep(2);
      const instructorResult = validateStep(3);
      isValid = basicResult.isValid && detailsResult.isValid && instructorResult.isValid;
    } else if (currentStep === 1) {
      // 验证课程安排
      const scheduleResult = validateStep(4);
      isValid = scheduleResult.isValid;
    }
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  }, [currentStep, validateStep]);

  // 上一步
  const handlePrev = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  // 保存草稿
  const handleSaveDraft = useCallback(async () => {
    if (!user?.id) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const courseData: CourseFormData = {
        ...formData,
        status: 'Draft',
      };
      
      await api.manageCourse('create', courseData);
      reset();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Save draft error:', err);
      setSubmitError('保存草稿失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, user?.id, reset, onSuccess, onClose]);

  // 提交审核
  const handleSubmitForReview = useCallback(async () => {
    if (!user?.id) return;
    
    // 完整验证
    const result = validateStep(5);
    if (!result.isValid) {
      setSubmitError('请完善所有必填信息');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const courseData: CourseFormData = {
        ...formData,
        status: 'Pending',
      };
      
      await api.manageCourse('create', courseData);
      reset();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Submit error:', err);
      setSubmitError('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, user?.id, validateStep, reset, onSuccess, onClose]);

  // 关闭确认
  const handleClose = useCallback(() => {
    if (isDirty) {
      if (window.confirm('您有未保存的更改，确定要离开吗？')) {
        reset();
        setCurrentStep(0);
        onClose();
      }
    } else {
      reset();
      setCurrentStep(0);
      onClose();
    }
  }, [isDirty, reset, onClose]);

  if (!isOpen) return null;

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F0A1F]">
      {/* Header */}
      <header className="h-16 border-b border-purple-500/20 flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-lg bg-purple-500/10 text-gray-400 hover:text-white hover:bg-purple-500/20 transition-colors flex items-center justify-center"
          >
            ✕
          </button>
          <h1 className="text-lg font-bold text-white">创建新课程</h1>
        </div>
        
        {/* Progress */}
        <div className="hidden md:flex items-center gap-2">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => idx < currentStep && setCurrentStep(idx)}
                disabled={idx > currentStep}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                  idx === currentStep
                    ? 'bg-purple-600 text-white'
                    : idx < currentStep
                    ? 'bg-purple-500/20 text-purple-400 cursor-pointer hover:bg-purple-500/30'
                    : 'bg-gray-500/10 text-gray-500'
                }`}
              >
                <span>{step.icon}</span>
                <span className="hidden lg:inline">{step.title}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${idx < currentStep ? 'bg-purple-500' : 'bg-gray-600'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="w-10" /> {/* Spacer for alignment */}
      </header>

      {/* Mobile Progress */}
      <div className="md:hidden px-6 py-3 border-b border-purple-500/20">
        <div className="flex items-center justify-between text-sm">
          <span className="text-purple-400">{STEPS[currentStep].icon} {STEPS[currentStep].title}</span>
          <span className="text-gray-500">步骤 {currentStep + 1} / {STEPS.length}</span>
        </div>
        <div className="mt-2 h-1 bg-purple-500/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <main className="h-[calc(100vh-64px-80px)] md:h-[calc(100vh-64px-72px)] overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Step 1: 课程信息 (合并基本信息+课程详情+讲师信息) */}
          {currentStep === 0 && (
            <div className="space-y-8">
              {/* 基本信息部分 */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold">1</div>
                  <h2 className="text-lg font-bold text-white">基本信息</h2>
                </div>
                <CourseFormFields
                  formData={formData}
                  errors={errors}
                  onUpdate={updateField}
                  onUpdateNested={updateNested}
                  fieldGroup="basic"
                />
              </section>

              {/* 分隔线 */}
              <div className="border-t border-purple-500/20" />

              {/* 课程详情部分 */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold">2</div>
                  <h2 className="text-lg font-bold text-white">课程详情</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <MediaUploader
                    type="image"
                    variant="cover"
                    value={formData.imageUrl || null}
                    onChange={url => updateField('imageUrl', url || '')}
                    label="课程封面图"
                  />
                  <MediaUploader
                    type="video"
                    variant="preview"
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
                />
              </section>

              {/* 分隔线 */}
              <div className="border-t border-purple-500/20" />

              {/* 讲师信息部分 */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold">3</div>
                  <h2 className="text-lg font-bold text-white">讲师信息</h2>
                </div>
                
                <MediaUploader
                  type="image"
                  variant="instructor"
                  value={formData.instructor?.imageUrl || null}
                  onChange={url => updateNested('instructor.imageUrl', url || '')}
                  label="讲师头像"
                />
                
                <div className="mt-6">
                  <CourseFormFields
                    formData={formData}
                    errors={errors}
                    onUpdate={updateField}
                    onUpdateNested={updateNested}
                    fieldGroup="instructor"
                  />
                </div>
              </section>
            </div>
          )}

          {/* Step 2: 课程安排 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-white mb-2">课程安排</h2>
                <p className="text-gray-400 text-sm">设置上课时间、地点和详细日程</p>
              </div>
              
              <CourseFormFields
                formData={formData}
                errors={errors}
                onUpdate={updateField}
                onUpdateNested={updateNested}
                fieldGroup="schedule"
              />
              
              <div className="mt-8">
                <AgendaEditor
                  value={formData.agenda || []}
                  onChange={agenda => updateField('agenda', agenda)}
                  startDate={formData.startDate}
                  endDate={formData.endDate}
                />
              </div>
            </div>
          )}

          {/* Step 3: 预览确认 */}
          {currentStep === 2 && (
            <CoursePreview formData={formData} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-20 md:h-[72px] border-t border-purple-500/20 flex items-center px-6 justify-between bg-[#0F0A1F]">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0 || isSubmitting}
          className="px-6 py-2.5 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          上一步
        </button>

        {submitError && (
          <p className="text-sm text-red-400">{submitError}</p>
        )}

        <div className="flex items-center gap-3">
          {isLastStep ? (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gray-500/20 text-gray-300 rounded-xl hover:bg-gray-500/30 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存草稿'}
              </button>
              <button
                onClick={handleSubmitForReview}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '提交中...' : '提交审核'}
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              下一步
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
