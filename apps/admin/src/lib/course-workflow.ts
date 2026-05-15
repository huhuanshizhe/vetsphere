import {
  type CoursePublishIssue,
  validateCoursePublishReadiness,
} from '@/lib/course-publish-validation';

export type CourseWorkflowStepId =
  | 'basic'
  | 'details'
  | 'instructor'
  | 'schedule'
  | 'services'
  | 'review';

export interface CourseWorkflowStepSummary {
  id: CourseWorkflowStepId;
  title: string;
  description: string;
  icon: string;
  issues: CoursePublishIssue[];
  isComplete: boolean;
  canAdvance: boolean;
}

interface CourseWorkflowStepDefinition {
  id: CourseWorkflowStepId;
  title: string;
  description: string;
  icon: string;
  blocksAdvance: boolean;
}

type AnyRecord = Record<string, any>;

const STEP_DEFINITIONS: CourseWorkflowStepDefinition[] = [
  {
    id: 'basic',
    title: '基础信息',
    description: '标题、专科、价格、容量',
    icon: '01',
    blocksAdvance: true,
  },
  {
    id: 'details',
    title: '课程详情',
    description: '描述、授课语言、封面素材',
    icon: '02',
    blocksAdvance: true,
  },
  {
    id: 'instructor',
    title: '讲师与资质',
    description: '讲师信息与证书',
    icon: '03',
    blocksAdvance: true,
  },
  {
    id: 'schedule',
    title: '时间地点',
    description: '日期、地点、日程',
    icon: '04',
    blocksAdvance: true,
  },
  {
    id: 'services',
    title: '服务安排',
    description: '住宿、交通、备注',
    icon: '05',
    blocksAdvance: false,
  },
  {
    id: 'review',
    title: '发布检查',
    description: '检查上架前缺失项与站点状态',
    icon: '06',
    blocksAdvance: false,
  },
];

function asRecord(value: unknown): AnyRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : null;
}

function readValue(source: AnyRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }

  return undefined;
}

function readString(source: AnyRecord, keys: string[]): string {
  const value = readValue(source, keys);
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(source: AnyRecord, keys: string[]): number | null {
  const value = readValue(source, keys);

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readStringArray(source: AnyRecord, keys: string[]): string[] {
  const value = readValue(source, keys);

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,，/\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function hasSellablePrice(course: AnyRecord): boolean {
  return ['price', 'price_cny', 'price_usd', 'price_jpy', 'price_thb'].some((key) => {
    const value = readNumber(course, [key]);
    return value !== null && value >= 0;
  });
}

function hasServiceArrangement(course: AnyRecord): boolean {
  const services = asRecord(course.services) ?? {};

  return ['accommodation', 'meals', 'transfer', 'visaLetter', 'directions', 'notes'].some(
    (key) => {
      const value = services[key];
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }

      return value !== undefined && value !== null;
    },
  );
}

function createIssue(field: string, message: string): CoursePublishIssue {
  return { field, message };
}

function validateBasicStep(course: AnyRecord): CoursePublishIssue[] {
  const issues: CoursePublishIssue[] = [];

  if (!readString(course, ['title'])) {
    issues.push(createIssue('title', '请填写课程标题'));
  }

  if (!readString(course, ['specialty'])) {
    issues.push(createIssue('specialty', '请填写课程专科分类'));
  }

  if (!readString(course, ['level'])) {
    issues.push(createIssue('level', '请填写课程难度等级'));
  }

  if (!readString(course, ['publishLanguage', 'publish_language'])) {
    issues.push(createIssue('publishLanguage', '请确认课程发布语言'));
  }

  const maxCapacity = readNumber(course, ['maxCapacity', 'max_enrollment']);
  if (maxCapacity === null || maxCapacity < 1) {
    issues.push(createIssue('maxCapacity', '请填写有效的课程容量'));
  }

  if (!hasSellablePrice(course)) {
    issues.push(createIssue('price', '请至少填写一个可售价格'));
  }

  return issues;
}

function validateDetailsStep(course: AnyRecord): CoursePublishIssue[] {
  const issues: CoursePublishIssue[] = [];

  if (!readString(course, ['description'])) {
    issues.push(createIssue('description', '请填写课程描述'));
  }

  if (readStringArray(course, ['teachingLanguages', 'teaching_languages']).length === 0) {
    issues.push(createIssue('teachingLanguages', '请至少选择一种授课语言'));
  }

  if (!readString(course, ['imageUrl', 'image_url', 'coverImageUrl', 'cover_image_url'])) {
    issues.push(createIssue('imageUrl', '请补充课程封面图'));
  }

  return issues;
}

function validateInstructorStep(course: AnyRecord): CoursePublishIssue[] {
  const issues: CoursePublishIssue[] = [];
  const instructor = asRecord(course.instructor) ?? {};

  if (!readString(instructor, ['name'])) {
    issues.push(createIssue('instructor.name', '请填写讲师姓名'));
  }

  if (!readString(instructor, ['title'])) {
    issues.push(createIssue('instructor.title', '请填写讲师职称'));
  }

  return issues;
}

function validateScheduleStep(course: AnyRecord): CoursePublishIssue[] {
  const issues: CoursePublishIssue[] = [];
  const location = asRecord(course.location) ?? {};
  const startDate = readString(course, ['startDate', 'start_date']);
  const endDate = readString(course, ['endDate', 'end_date']);

  if (!startDate) {
    issues.push(createIssue('startDate', '请填写开课日期'));
  }

  if (!endDate) {
    issues.push(createIssue('endDate', '请填写结课日期'));
  }

  if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
    issues.push(createIssue('endDate', '结课日期必须晚于开课日期'));
  }

  if (!readString(location, ['country'])) {
    issues.push(createIssue('location.country', '请填写国家或地区'));
  }

  if (!readString(location, ['city'])) {
    issues.push(createIssue('location.city', '请填写上课城市'));
  }

  if (!readString(location, ['venue'])) {
    issues.push(createIssue('location.venue', '请填写上课地点'));
  }

  return issues;
}

function validateServicesStep(course: AnyRecord): CoursePublishIssue[] {
  if (hasServiceArrangement(course)) {
    return [];
  }

  return [createIssue('services', '建议补充住宿、交通或其他服务安排说明')];
}

function getStepIssues(stepId: CourseWorkflowStepId, course: AnyRecord): CoursePublishIssue[] {
  switch (stepId) {
    case 'basic':
      return validateBasicStep(course);
    case 'details':
      return validateDetailsStep(course);
    case 'instructor':
      return validateInstructorStep(course);
    case 'schedule':
      return validateScheduleStep(course);
    case 'services':
      return validateServicesStep(course);
    case 'review':
      return validateCoursePublishReadiness(course).issues;
    default:
      return [];
  }
}

export function summarizeCourseWorkflow(course: AnyRecord): CourseWorkflowStepSummary[] {
  return STEP_DEFINITIONS.map((step) => {
    const issues = getStepIssues(step.id, course);
    const isComplete = issues.length === 0;

    return {
      ...step,
      issues,
      isComplete,
      canAdvance: isComplete || !step.blocksAdvance,
    };
  });
}