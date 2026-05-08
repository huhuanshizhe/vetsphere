import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { AdminUserSiteCode } from '@/lib/user-directory';

export type VerificationIntegrityIssueCode =
  | 'missing_directory_user'
  | 'latest_status_not_approved'
  | 'historical_approved_superseded';

export type VerificationIntegrityFilter =
  | 'all'
  | 'healthy'
  | 'anomalies'
  | VerificationIntegrityIssueCode;

export interface AdminVerificationWorkbenchRecord {
  id: string;
  userId: string;
  siteCode: 'cn' | 'intl';
  status: string;
  verificationType: string;
  realName: string | null;
  organizationName: string | null;
  positionTitle: string | null;
  specialtyTags: string[];
  verificationNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectReason: string | null;
  approvedLevel: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  contact: string | null;
  email: string | null;
  mobile: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  identityType: string | null;
  identityGroup: string | null;
  hasDirectoryUser: boolean;
  isLatestVerification: boolean;
  latestVerificationId: string | null;
  latestVerificationStatus: string | null;
  latestVerificationType: string | null;
  integrityIssueCode: VerificationIntegrityIssueCode | null;
  integrityState: 'healthy' | 'anomaly';
}

export interface AdminVerificationWorkbenchStats {
  total: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  anomalies: number;
}

export interface AdminVerificationWorkbenchListFilters {
  siteCode: AdminUserSiteCode;
  status?: string | null;
  verificationType?: string | null;
  keyword?: string;
  integrity?: VerificationIntegrityFilter;
  page: number;
  pageSize: number;
}

export interface AdminVerificationWorkbenchListResult {
  items: AdminVerificationWorkbenchRecord[];
  total: number;
  page: number;
  pageSize: number;
  siteCode: AdminUserSiteCode;
  stats: AdminVerificationWorkbenchStats;
  source: 'admin_verification_workbench_view';
}

const WORKBENCH_VIEW = 'admin_verification_workbench_view';
const PENDING_REVIEW_STATUSES = ['submitted', 'under_review', 'pending_review'] as const;
const WORKBENCH_KEYWORD_FIELDS = [
  'real_name',
  'organization_name',
  'contact',
  'email',
  'display_name',
] as const;

function normalizeSiteCode(value: string | null | undefined): AdminUserSiteCode {
  return value === 'cn' || value === 'intl' ? value : 'global';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeIntegrityIssueCode(value: unknown): VerificationIntegrityIssueCode | null {
  if (
    value === 'missing_directory_user'
    || value === 'latest_status_not_approved'
    || value === 'historical_approved_superseded'
  ) {
    return value;
  }

  return null;
}

function applySiteFilter(query: any, siteCode: AdminUserSiteCode): any {
  if (siteCode !== 'global') {
    query = query.eq('site_code', siteCode);
  }
  return query;
}

function applyStatusFilter(query: any, status: string | null | undefined): any {
  const normalized = status?.trim();
  if (!normalized) return query;
  return query.eq('status', normalized);
}

function applyVerificationTypeFilter(query: any, verificationType: string | null | undefined): any {
  const normalized = verificationType?.trim();
  if (!normalized) return query;
  return query.eq('verification_type', normalized);
}

function applyKeywordFilter(query: any, keyword: string | undefined): any {
  const trimmed = keyword?.trim();
  if (!trimmed) return query;

  return query.or(
    WORKBENCH_KEYWORD_FIELDS.map((field) => `${field}.ilike.%${trimmed}%`).join(','),
  );
}

function applyIntegrityFilter(
  query: any,
  integrity: VerificationIntegrityFilter | null | undefined,
): any {
  if (!integrity || integrity === 'all') return query;
  if (integrity === 'healthy') return query.is('integrity_issue_code', null);
  if (integrity === 'anomalies') return query.not('integrity_issue_code', 'is', null);
  return query.eq('integrity_issue_code', integrity);
}

function buildWorkbenchQuery(
  filters: Omit<AdminVerificationWorkbenchListFilters, 'page' | 'pageSize'>,
  selectClause: string,
  options?: Record<string, unknown>,
) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from(WORKBENCH_VIEW).select(selectClause, options);
  query = applySiteFilter(query, filters.siteCode);
  query = applyStatusFilter(query, filters.status);
  query = applyVerificationTypeFilter(query, filters.verificationType);
  query = applyKeywordFilter(query, filters.keyword);
  query = applyIntegrityFilter(query, filters.integrity);
  return query;
}

async function countWorkbenchRows(
  filters: Omit<AdminVerificationWorkbenchListFilters, 'page' | 'pageSize'>,
  statusOverride?: string | readonly string[] | null,
  integrityOverride?: VerificationIntegrityFilter | null,
): Promise<number> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from(WORKBENCH_VIEW).select('verification_request_id', { count: 'exact', head: true });
  query = applySiteFilter(query, filters.siteCode);
  query = applyVerificationTypeFilter(query, filters.verificationType);
  query = applyKeywordFilter(query, filters.keyword);
  query = applyIntegrityFilter(query, integrityOverride ?? filters.integrity);

  if (Array.isArray(statusOverride)) {
    query = query.in('status', [...statusOverride]);
  } else if (typeof statusOverride === 'string') {
    query = query.eq('status', statusOverride);
  } else {
    query = applyStatusFilter(query, filters.status);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

function normalizeWorkbenchRow(row: Record<string, unknown>): AdminVerificationWorkbenchRecord {
  const integrityIssueCode = normalizeIntegrityIssueCode(row.integrity_issue_code);

  return {
    id: typeof row.verification_request_id === 'string' ? row.verification_request_id : '',
    userId: typeof row.user_id === 'string' ? row.user_id : '',
    siteCode: row.site_code === 'cn' ? 'cn' : 'intl',
    status: typeof row.status === 'string' ? row.status : '',
    verificationType: typeof row.verification_type === 'string' ? row.verification_type : '',
    realName: typeof row.real_name === 'string' ? row.real_name : null,
    organizationName: typeof row.organization_name === 'string' ? row.organization_name : null,
    positionTitle: typeof row.position_title === 'string' ? row.position_title : null,
    specialtyTags: normalizeStringArray(row.specialty_tags),
    verificationNote: typeof row.verification_note === 'string' ? row.verification_note : null,
    submittedAt: typeof row.submitted_at === 'string' ? row.submitted_at : null,
    reviewedAt: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
    reviewedBy: typeof row.reviewed_by === 'string' ? row.reviewed_by : null,
    rejectReason: typeof row.reject_reason === 'string' ? row.reject_reason : null,
    approvedLevel: typeof row.approved_level === 'string' ? row.approved_level : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
    contact: typeof row.contact === 'string' ? row.contact : null,
    email: typeof row.email === 'string' ? row.email : null,
    mobile: typeof row.mobile === 'string' ? row.mobile : null,
    displayName: typeof row.display_name === 'string' ? row.display_name : null,
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    identityType: typeof row.identity_type === 'string' ? row.identity_type : null,
    identityGroup: typeof row.identity_group === 'string' ? row.identity_group : null,
    hasDirectoryUser: Boolean(row.has_directory_user),
    isLatestVerification: Boolean(row.is_latest_verification),
    latestVerificationId:
      typeof row.latest_verification_request_id === 'string'
        ? row.latest_verification_request_id
        : null,
    latestVerificationStatus:
      typeof row.latest_verification_status === 'string' ? row.latest_verification_status : null,
    latestVerificationType:
      typeof row.latest_verification_type === 'string' ? row.latest_verification_type : null,
    integrityIssueCode,
    integrityState: integrityIssueCode ? 'anomaly' : 'healthy',
  };
}

export async function listAdminVerificationWorkbench(
  filters: AdminVerificationWorkbenchListFilters,
): Promise<AdminVerificationWorkbenchListResult> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  const baseFilters = {
    siteCode: filters.siteCode,
    verificationType: filters.verificationType,
    keyword: filters.keyword,
    status: undefined,
    integrity: 'all' as VerificationIntegrityFilter,
  };

  let query = buildWorkbenchQuery(filters, '*', { count: 'exact' });
  query = query
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const [totalCount, pendingReviewCount, approvedCount, rejectedCount, anomalyCount] = await Promise.all([
    countWorkbenchRows(baseFilters),
    countWorkbenchRows(baseFilters, PENDING_REVIEW_STATUSES),
    countWorkbenchRows(baseFilters, 'approved'),
    countWorkbenchRows(baseFilters, 'rejected'),
    countWorkbenchRows(baseFilters, undefined, 'anomalies'),
  ]);

  return {
    items: (data || []).map((row) => normalizeWorkbenchRow(row as unknown as Record<string, unknown>)),
    total: count || 0,
    page: filters.page,
    pageSize: filters.pageSize,
    siteCode: normalizeSiteCode(filters.siteCode),
    stats: {
      total: totalCount,
      pendingReview: pendingReviewCount,
      approved: approvedCount,
      rejected: rejectedCount,
      anomalies: anomalyCount,
    },
    source: 'admin_verification_workbench_view',
  };
}