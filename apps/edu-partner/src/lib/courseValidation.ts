import type { Course } from '@vetsphere/shared/types';
import type { CourseFormData } from '@/hooks/useCourseForm';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Step 1: 基本信息验证
export function validateBasicInfo(data: Partial<CourseFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.publishLanguage) {
    errors.publishLanguage = '请选择发布语言';
  }

  if (!data.title?.trim()) {
    errors.title = '请输入课程标题';
  }

  if (!data.specialty) {
    errors.specialty = '请选择课程专科分类';
  }

  if (!data.level) {
    errors.level = '请选择课程难度等级';
  }

  if (data.price === undefined || data.price === null || data.price < 0) {
    errors.price = '请输入有效的课程价格';
  }

  if (!data.maxCapacity || data.maxCapacity < 1) {
    errors.maxCapacity = '请输入有效的课程容量（至少1人）';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Step 2: 课程详情验证
export function validateDetails(data: Partial<CourseFormData>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.teachingLanguages || data.teachingLanguages.length === 0) {
    errors.teachingLanguages = '请至少选择一种授课语言';
  }

  if (!data.description?.trim()) {
    errors.description = '请输入课程描述';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Step 3: 讲师信息验证
export function validateInstructor(data: Partial<Course>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.instructor?.name?.trim()) {
    errors['instructor.name'] = '请输入讲师姓名';
  }

  if (!data.instructor?.title?.trim()) {
    errors['instructor.title'] = '请输入讲师职称';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// Step 4: 课程安排验证
export function validateSchedule(data: Partial<Course>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.startDate) {
    errors.startDate = '请选择开课日期';
  }

  if (!data.endDate) {
    errors.endDate = '请选择结课日期';
  }

  if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
    errors.endDate = '结课日期必须晚于开课日期';
  }

  const location = data.location as { country?: string; region?: string; city?: string; venue?: string } | undefined;

  if (!location?.country) {
    errors['location.country'] = '请选择国家/地区';
  }

  if (!location?.city?.trim()) {
    errors['location.city'] = '请输入上课城市';
  }

  if (!location?.venue?.trim()) {
    errors['location.venue'] = '请输入上课地点';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// 完整验证
export function validateComplete(data: Partial<CourseFormData>): ValidationResult {
  const step1 = validateBasicInfo(data);
  const step2 = validateDetails(data);
  const step3 = validateInstructor(data);
  const step4 = validateSchedule(data);

  const allErrors = {
    ...step1.errors,
    ...step2.errors,
    ...step3.errors,
    ...step4.errors,
  };

  return {
    isValid: Object.keys(allErrors).length === 0,
    errors: allErrors,
  };
}

// 按步骤验证
export function validateStep(step: number, data: Partial<CourseFormData>): ValidationResult {
  switch (step) {
    case 1:
      return validateBasicInfo(data);
    case 2:
      return validateDetails(data);
    case 3:
      return validateInstructor(data);
    case 4:
      return validateSchedule(data);
    case 5:
      return validateComplete(data);
    default:
      return { isValid: true, errors: {} };
  }
}
