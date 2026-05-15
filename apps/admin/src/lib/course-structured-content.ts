export interface CourseChapterRowLike {
  id?: string | null;
  title?: string | null;
  duration_minutes?: number | null;
  status?: string | null;
  sort_order?: number | null;
  display_order?: number | null;
  is_preview?: boolean | null;
  is_free_preview?: boolean | null;
  is_free?: boolean | null;
}

export interface CourseChapterSummaryItem {
  id: string;
  title: string;
  status: string;
  durationMinutes: number;
  order: number;
  isPreview: boolean;
}

export interface CourseChapterSummary {
  total: number;
  published: number;
  draft: number;
  previewable: number;
  totalMinutes: number;
  latestChapters: CourseChapterSummaryItem[];
}

export interface CourseInstructorSummary {
  id: string;
  name: string;
  title: string;
  avatar_url: string | null;
  credentials: string[];
  bio: string;
}

export interface CourseInstructorRelationSummary {
  id: string;
  role: 'instructor' | 'assistant' | 'guest';
  display_order: number;
  instructor: CourseInstructorSummary;
}

const VALID_ROLES = new Set(['instructor', 'assistant', 'guest']);

function normalizeChapterStatus(value: unknown): string {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized || 'draft';
}

function normalizeChapterOrder(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeChapterDuration(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function summarizeCourseChapters(rows: CourseChapterRowLike[]): CourseChapterSummary {
  const normalizedRows = rows
    .map((row) => ({
      id: typeof row.id === 'string' ? row.id : '',
      title: typeof row.title === 'string' && row.title.trim() ? row.title.trim() : '未命名章节',
      status: normalizeChapterStatus(row.status),
      durationMinutes: normalizeChapterDuration(row.duration_minutes),
      order: normalizeChapterOrder(row.sort_order ?? row.display_order),
      isPreview: row.is_preview === true || row.is_free_preview === true || row.is_free === true,
    }))
    .sort((left, right) => left.order - right.order);

  return {
    total: normalizedRows.length,
    published: normalizedRows.filter((row) => row.status === 'published').length,
    draft: normalizedRows.filter((row) => row.status !== 'published').length,
    previewable: normalizedRows.filter((row) => row.isPreview).length,
    totalMinutes: normalizedRows.reduce((sum, row) => sum + row.durationMinutes, 0),
    latestChapters: normalizedRows.slice(0, 5),
  };
}

function normalizeInstructorSummary(row: Record<string, unknown>): CourseInstructorSummary | null {
  const id = typeof row.id === 'string' ? row.id.trim() : '';
  if (!id) {
    return null;
  }

  return {
    id,
    name: typeof row.name === 'string' ? row.name.trim() : '',
    title: typeof row.title === 'string' ? row.title.trim() : '',
    avatar_url: typeof row.avatar_url === 'string' && row.avatar_url.trim() ? row.avatar_url.trim() : null,
    credentials: Array.isArray(row.credentials)
      ? row.credentials.map((item) => String(item).trim()).filter(Boolean)
      : [],
    bio: typeof row.bio === 'string' ? row.bio.trim() : '',
  };
}

export function normalizeCourseInstructorRelations(
  rows: Array<Record<string, unknown>>,
): CourseInstructorRelationSummary[] {
  return rows
    .map((row, index) => {
      const instructor =
        row.instructor && typeof row.instructor === 'object'
          ? normalizeInstructorSummary(row.instructor as Record<string, unknown>)
          : null;

      if (!instructor) {
        return null;
      }

      const rawRole = typeof row.role === 'string' ? row.role.trim().toLowerCase() : '';
      const role = VALID_ROLES.has(rawRole) ? (rawRole as 'instructor' | 'assistant' | 'guest') : 'assistant';
      const displayOrder =
        typeof row.display_order === 'number' && Number.isFinite(row.display_order)
          ? row.display_order
          : index;

      return {
        id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : `${instructor.id}:${displayOrder}`,
        role,
        display_order: displayOrder,
        instructor,
      };
    })
    .filter((item): item is CourseInstructorRelationSummary => Boolean(item))
    .sort((left, right) => left.display_order - right.display_order);
}

export function buildCourseInstructorNames(
  relations: CourseInstructorRelationSummary[],
): string[] {
  return relations
    .map((relation) => relation.instructor.name)
    .filter(Boolean)
    .filter((name, index, all) => all.indexOf(name) === index);
}