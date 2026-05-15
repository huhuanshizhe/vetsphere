export interface CoursePublishIssue {
  field: string;
  message: string;
}

export interface CoursePublishValidationResult {
  canPublish: boolean;
  issues: CoursePublishIssue[];
}

type AnyRecord = Record<string, any>;

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

function hasSellablePrice(source: AnyRecord): boolean {
  return ['price', 'price_cny', 'price_usd', 'price_jpy', 'price_thb'].some((key) => {
    const value = readNumber(source, [key]);
    return value !== null && value >= 0;
  });
}

function pushIssue(issues: CoursePublishIssue[], field: string, message: string) {
  issues.push({ field, message });
}

export function validateCoursePublishReadiness(
  course: AnyRecord,
): CoursePublishValidationResult {
  const issues: CoursePublishIssue[] = [];
  const instructor = asRecord(course.instructor) ?? {};
  const location = asRecord(course.location) ?? {};

  if (!readString(course, ['title'])) {
    pushIssue(issues, 'title', '缺少课程标题');
  }

  if (!readString(course, ['description'])) {
    pushIssue(issues, 'description', '缺少课程描述');
  }

  if (!readString(course, ['specialty'])) {
    pushIssue(issues, 'specialty', '缺少课程专科分类');
  }

  if (!readString(course, ['level'])) {
    pushIssue(issues, 'level', '缺少课程难度等级');
  }

  if (!readString(course, ['format'])) {
    pushIssue(issues, 'format', '缺少授课形式');
  }

  if (!readString(course, ['publishLanguage', 'publish_language'])) {
    pushIssue(issues, 'publishLanguage', '缺少发布语言');
  }

  if (readStringArray(course, ['teachingLanguages', 'teaching_languages']).length === 0) {
    pushIssue(issues, 'teachingLanguages', '至少需要一种授课语言');
  }

  if (!readString(course, ['coverImageUrl', 'cover_image_url', 'imageUrl', 'image_url'])) {
    pushIssue(issues, 'coverImageUrl', '缺少课程封面图');
  }

  const instructorName =
    readString(instructor, ['name']) ||
    readStringArray(course, ['instructorNames', 'instructor_names'])[0] ||
    '';
  if (!instructorName) {
    pushIssue(issues, 'instructor.name', '缺少讲师姓名');
  }

  const startDate = readString(course, ['startDate', 'start_date']);
  const endDate = readString(course, ['endDate', 'end_date']);

  if (!startDate) {
    pushIssue(issues, 'startDate', '缺少开课日期');
  }

  if (!endDate) {
    pushIssue(issues, 'endDate', '缺少结课日期');
  }

  if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
    pushIssue(issues, 'endDate', '结课日期必须晚于开课日期');
  }

  if (!readString(location, ['city'])) {
    pushIssue(issues, 'location.city', '缺少上课城市');
  }

  if (!readString(location, ['venue'])) {
    pushIssue(issues, 'location.venue', '缺少上课地点');
  }

  if (!hasSellablePrice(course)) {
    pushIssue(issues, 'price', '缺少课程售价');
  }

  return {
    canPublish: issues.length === 0,
    issues,
  };
}

export function formatCoursePublishIssues(issues: CoursePublishIssue[]): string {
  return issues.map((issue) => issue.message).join('；');
}