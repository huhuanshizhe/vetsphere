'use client';

import { useState, useCallback } from 'react';
import type { Course } from '@vetsphere/shared/types';
import { validateStep as validate, type ValidationResult } from '@/lib/courseValidation';

export interface CourseFormData extends Partial<Course> {
  previewVideoUrl?: string;
  publishLanguage?: string;  // 发布语言
  teachingLanguages?: string[];  // 授课语言（多选）
  services?: {  // 行程服务安排
    accommodation?: 'yes' | 'no' | 'partial';
    meals?: 'yes' | 'no' | 'partial';
    transfer?: 'yes' | 'no' | 'partial';
    visaLetter?: 'yes' | 'no' | 'partial';
    directions?: string;
    notes?: string;
  };
}

const initialFormData: CourseFormData = {
  title: '',
  title_zh: '',
  title_th: '',
  specialty: undefined,
  level: undefined,
  price: 0,
  currency: 'CNY',
  maxCapacity: 30,
  description: '',
  description_zh: '',
  description_th: '',
  imageUrl: '',
  previewVideoUrl: '',
  publishLanguage: 'zh',  // 默认中文
  teachingLanguages: ['zh'],  // 默认中文授课
  totalHours: undefined,
  instructor: {
    name: '',
    imageUrl: '',
    title: '',
    credentials: [],
    bio: '',
  },
  location: {
    country: '',
    region: '',
    city: '',
    venue: '',
    address: '',
  },
  startDate: '',
  endDate: '',
  enrollmentDeadline: '',
  agenda: [],
  status: 'Draft',
  services: {
    accommodation: undefined,
    meals: undefined,
    transfer: undefined,
    visaLetter: undefined,
    directions: '',
    notes: '',
  },
};

export interface UseCourseFormReturn {
  formData: CourseFormData;
  errors: Record<string, string>;
  updateField: (field: string, value: unknown) => void;
  updateNested: (path: string, value: unknown) => void;
  validateStep: (step: number) => ValidationResult;
  validateAll: () => ValidationResult;
  reset: () => void;
  loadCourse: (course: Course) => void;
  isDirty: boolean;
}

export function useCourseForm(initialCourse?: Course): UseCourseFormReturn {
  const [formData, setFormData] = useState<CourseFormData>(
    initialCourse ? { ...initialFormData, ...initialCourse } : initialFormData
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // 更新顶层字段
  const updateField = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    // 清除该字段的错误
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // 更新嵌套字段 (如 instructor.name, location.city)
  const updateNested = useCallback((path: string, value: unknown) => {
    const keys = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current: Record<string, unknown> = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current[key] = { ...(current[key] as Record<string, unknown> || {}) };
        current = current[key] as Record<string, unknown>;
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    setIsDirty(true);
    // 清除该字段的错误
    setErrors(prev => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);

  // 验证指定步骤
  const validateStep = useCallback((step: number): ValidationResult => {
    const result = validate(step, formData);
    if (!result.isValid) {
      setErrors(prev => ({ ...prev, ...result.errors }));
    }
    return result;
  }, [formData]);

  // 验证所有步骤
  const validateAll = useCallback((): ValidationResult => {
    const result = validate(5, formData);
    setErrors(result.errors);
    return result;
  }, [formData]);

  // 重置表单
  const reset = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
    setIsDirty(false);
  }, []);

  // 加载已有课程数据
  const loadCourse = useCallback((course: Course) => {
    setFormData({ ...initialFormData, ...course });
    setErrors({});
    setIsDirty(false);
  }, []);

  return {
    formData,
    errors,
    updateField,
    updateNested,
    validateStep,
    validateAll,
    reset,
    loadCourse,
    isDirty,
  };
}
