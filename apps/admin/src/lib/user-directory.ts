import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type AdminUserSiteCode = 'cn' | 'intl' | 'global';

export interface AdminUserRecord {
  id: string;
  userId: string;
  siteCode: 'cn' | 'intl';
  sourceSite: 'cn' | 'intl';
  originSite: 'cn' | 'intl' | null;
  contact: string | null;
  email: string | null;
  displayName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  identityType: string | null;
  identityGroup: string | null;
  verificationStatus: string | null;
  verificationType: string | null;
  accountStatus: string | null;
  registeredAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
  isAdmin: boolean;
  createdVia: string | null;
  isShadowProfile: boolean;
}

export interface AdminUserStats {
  total: number;
  verified: number;
  pending: number;
}

export interface AdminUserListResult {
  items: AdminUserRecord[];
  total: number;
  page: number;
  pageSize: number;
  siteCode: AdminUserSiteCode;
  stats: AdminUserStats;
  source: 'admin_user_directory_view' | 'unified_users_view';
}

export interface AdminUserDetailResult {
  item: AdminUserRecord | null;
  source: 'admin_user_directory_view' | 'unified_users_view' | 'legacy';
}

interface AdminUserQueryFilters {
  siteCode: AdminUserSiteCode;
  keyword?: string;
  verificationStatus?: string | null;
  createdAfter?: string;
}

export interface AdminUserCountFilters extends AdminUserQueryFilters {}

export interface AdminUserListFilters extends AdminUserQueryFilters {
  page: number;
  pageSize: number;
}

const DIRECTORY_VIEW = 'admin_user_directory_view';
const LEGACY_VIEW = 'unified_users_view';
const PENDING_STATUSES = ['submitted', 'under_review'] as const;

function normalizeSiteCode(value: string | null | undefined): AdminUserSiteCode {
  return value === 'cn' || value === 'intl' ? value : 'global';
}

function normalizeVerificationStatus(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.trim() || null;
}

function normalizeDirectoryRow(row: Record<string, unknown>): AdminUserRecord {
  const rawId = row.user_id ?? row.id;
  const id = typeof rawId === 'string' ? rawId : '';
  const siteCode = row.site_code === 'cn' || row.source_site === 'cn' ? 'cn' : 'intl';

  return {
    id,
    userId: id,
    siteCode,
    sourceSite: siteCode,
    originSite: row.origin_site === 'cn' || row.origin_site === 'intl' ? row.origin_site : null,
    contact: typeof row.contact === 'string' ? row.contact : null,
    email: typeof row.email === 'string' ? row.email : null,
    displayName: typeof row.display_name === 'string' ? row.display_name : null,
    fullName:
      typeof row.full_name === 'string'
        ? row.full_name
        : typeof row.display_name === 'string'
          ? row.display_name
          : null,
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    identityType: typeof row.identity_type === 'string' ? row.identity_type : null,
    identityGroup: typeof row.identity_group === 'string' ? row.identity_group : null,
    verificationStatus: typeof row.verification_status === 'string' ? row.verification_status : null,
    verificationType: typeof row.verification_type === 'string' ? row.verification_type : null,
    accountStatus: typeof row.account_status === 'string' ? row.account_status : null,
    registeredAt: typeof row.registered_at === 'string' ? row.registered_at : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
    lastLoginAt: typeof row.last_login_at === 'string' ? row.last_login_at : null,
    isAdmin: Boolean(row.is_admin),
    createdVia: typeof row.created_via === 'string' ? row.created_via : null,
    isShadowProfile: Boolean(row.is_shadow_profile),
  };
}

function applySiteFilter(query: any, filters: AdminUserQueryFilters, siteField: string): any {
  if (filters.siteCode !== 'global') {
    query = query.eq(siteField, filters.siteCode);
  }
  return query;
}

function applyKeywordFilter(query: any, keyword: string | undefined): any {
  const trimmed = keyword?.trim();
  if (!trimmed) return query;

  return query.or(
    `contact.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%,full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`,
  );
}

function applyCreatedAfterFilter(query: any, createdAfter: string | undefined): any {
  if (!createdAfter) return query;
  return query.gte('created_at', createdAfter);
}

function applyVerificationFilter(
  query: any,
  verificationStatus: string | null | undefined,
): any {
  const normalized = normalizeVerificationStatus(verificationStatus);
  if (!normalized) return query;
  if (normalized === 'none') return query.is('verification_status', null);
  return query.eq('verification_status', normalized);
}

function buildViewQuery(
  viewName: string,
  siteField: string,
  filters: AdminUserQueryFilters,
  selectClause: string,
  options?: Record<string, unknown>,
) {
  const supabase = getSupabaseAdmin();
  let query = supabase.from(viewName).select(selectClause, options);
  query = applySiteFilter(query, filters, siteField);
  query = applyKeywordFilter(query, filters.keyword);
  query = applyCreatedAfterFilter(query, filters.createdAfter);
  query = applyVerificationFilter(query, filters.verificationStatus);
  return query;
}

async function countFromView(
  viewName: string,
  siteField: string,
  filters: AdminUserQueryFilters,
  verificationOverride?: string | readonly string[] | null,
): Promise<number> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from(viewName).select('user_id', { count: 'exact', head: true });
  query = applySiteFilter(query, filters, siteField);
  query = applyKeywordFilter(query, filters.keyword);
  query = applyCreatedAfterFilter(query, filters.createdAfter);

  if (verificationOverride === null) {
    query = query.is('verification_status', null);
  } else if (Array.isArray(verificationOverride)) {
    query = query.in('verification_status', [...verificationOverride]);
  } else if (typeof verificationOverride === 'string') {
    query = applyVerificationFilter(query, verificationOverride);
  } else {
    query = applyVerificationFilter(query, filters.verificationStatus);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function fetchViewStats(
  viewName: string,
  siteField: string,
  filters: AdminUserQueryFilters,
): Promise<AdminUserStats> {
  const activeVerificationFilter = normalizeVerificationStatus(filters.verificationStatus);
  const total = await countFromView(viewName, siteField, filters);

  let verified = 0;
  if (!activeVerificationFilter || activeVerificationFilter === 'approved') {
    verified = await countFromView(viewName, siteField, filters, 'approved');
  }

  let pending = 0;
  if (!activeVerificationFilter) {
    pending = await countFromView(viewName, siteField, filters, PENDING_STATUSES);
  } else if (PENDING_STATUSES.includes(activeVerificationFilter as (typeof PENDING_STATUSES)[number])) {
    pending = await countFromView(viewName, siteField, filters, activeVerificationFilter);
  }

  return { total, verified, pending };
}

async function fetchFromView(
  viewName: string,
  siteField: string,
  source: AdminUserListResult['source'],
  filters: AdminUserListFilters,
): Promise<AdminUserListResult> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  const query = buildViewQuery(viewName, siteField, filters, '*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const stats = await fetchViewStats(viewName, siteField, filters);

  return {
    items: (data || []).map((row) => normalizeDirectoryRow(row as unknown as Record<string, unknown>)),
    total: count || 0,
    page: filters.page,
    pageSize: filters.pageSize,
    siteCode: normalizeSiteCode(filters.siteCode),
    stats,
    source,
  };
}

async function countFromPreferredView(
  filters: AdminUserQueryFilters,
  verificationOverride?: string | readonly string[] | null,
): Promise<number> {
  try {
    return await countFromView(DIRECTORY_VIEW, 'site_code', filters, verificationOverride);
  } catch (directoryError) {
    console.warn('[user-directory] admin_user_directory_view count unavailable, fallback to unified_users_view:', directoryError);
    return countFromView(LEGACY_VIEW, 'source_site', filters, verificationOverride);
  }
}

async function enrichCnUserRecord(item: AdminUserRecord): Promise<AdminUserRecord> {
  const supabase = getSupabaseAdmin();
  const [profileRes, identityRes] = await Promise.all([
    supabase
      .from('cn_user_profiles')
      .select('display_name, real_name, avatar_file_id, updated_at')
      .eq('user_id', item.userId)
      .eq('site_code', 'cn')
      .maybeSingle(),
    supabase
      .from('cn_user_identity_profiles')
      .select('identity_type, identity_group')
      .eq('user_id', item.userId)
      .eq('site_code', 'cn')
      .maybeSingle(),
  ]);

  const profile = profileRes.data;
  const identity = identityRes.data;

  return {
    ...item,
    displayName:
      profile?.real_name || profile?.display_name || item.displayName || item.fullName || null,
    fullName: profile?.real_name || profile?.display_name || item.fullName || item.displayName || null,
    avatarUrl: profile?.avatar_file_id || item.avatarUrl,
    identityType: identity?.identity_type || item.identityType,
    identityGroup: identity?.identity_group || item.identityGroup,
    updatedAt: profile?.updated_at || item.updatedAt,
  };
}

async function fetchUserDetailFromView(
  viewName: string,
  siteField: string,
  source: AdminUserDetailResult['source'],
  userId: string,
  siteCode?: AdminUserSiteCode,
): Promise<AdminUserDetailResult> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from(viewName).select('*').eq('user_id', userId);

  if (siteCode && siteCode !== 'global') {
    query = query.eq(siteField, siteCode);
  }

  query = query.order('created_at', { ascending: false }).limit(1);

  const { data, error } = await query;
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return { item: null, source };
  }

  let item = normalizeDirectoryRow(row as Record<string, unknown>);
  if (item.sourceSite === 'cn') {
    item = await enrichCnUserRecord(item);
  }

  return { item, source };
}

async function fetchLegacyUserDetail(
  userId: string,
  siteCode?: AdminUserSiteCode,
): Promise<AdminUserDetailResult> {
  const supabase = getSupabaseAdmin();

  if (!siteCode || siteCode === 'cn' || siteCode === 'global') {
    const { data: cnUser } = await supabase
      .from('cn_users')
      .select('id, mobile, status, registered_at, last_login_at, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (cnUser) {
      const [profileRes, identityRes, vrRes] = await Promise.all([
        supabase
          .from('cn_user_profiles')
          .select('display_name, real_name, avatar_file_id, updated_at')
          .eq('user_id', userId)
          .eq('site_code', 'cn')
          .maybeSingle(),
        supabase
          .from('cn_user_identity_profiles')
          .select('identity_type, identity_group')
          .eq('user_id', userId)
          .eq('site_code', 'cn')
          .maybeSingle(),
        supabase
          .from('cn_verification_requests')
          .select('status, verification_type')
          .eq('user_id', userId)
          .eq('site_code', 'cn')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const profile = profileRes.data;
      const identity = identityRes.data;
      const verification = vrRes.data;

      return {
        item: {
          id: cnUser.id,
          userId: cnUser.id,
          siteCode: 'cn',
          sourceSite: 'cn',
          originSite: 'cn',
          contact: cnUser.mobile,
          email: null,
          displayName: profile?.real_name || profile?.display_name || null,
          fullName: profile?.real_name || profile?.display_name || null,
          avatarUrl: profile?.avatar_file_id || null,
          identityType: identity?.identity_type || null,
          identityGroup: identity?.identity_group || null,
          verificationStatus: verification?.status || null,
          verificationType: verification?.verification_type || null,
          accountStatus: cnUser.status,
          registeredAt: cnUser.registered_at,
          createdAt: cnUser.created_at,
          updatedAt: profile?.updated_at || null,
          lastLoginAt: cnUser.last_login_at,
          isAdmin: false,
          createdVia: null,
          isShadowProfile: false,
        },
        source: 'legacy',
      };
    }
  }

  if (!siteCode || siteCode === 'intl' || siteCode === 'global') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, is_admin, created_at, updated_at, last_login_at, deleted_at')
      .eq('id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (profile && !profile.is_admin) {
      const { data: cnUser } = await supabase
        .from('cn_users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!cnUser) {
        const { data: verification } = await supabase
          .from('cn_verification_requests')
          .select('status, verification_type')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          item: {
            id: profile.id,
            userId: profile.id,
            siteCode: 'intl',
            sourceSite: 'intl',
            originSite: 'intl',
            contact: profile.email,
            email: profile.email,
            displayName: profile.full_name || null,
            fullName: profile.full_name || null,
            avatarUrl: profile.avatar_url || null,
            identityType: null,
            identityGroup: null,
            verificationStatus: verification?.status || null,
            verificationType: verification?.verification_type || null,
            accountStatus: profile.deleted_at ? 'deleted' : 'active',
            registeredAt: profile.created_at,
            createdAt: profile.created_at,
            updatedAt: profile.updated_at || null,
            lastLoginAt: profile.last_login_at || null,
            isAdmin: false,
            createdVia: null,
            isShadowProfile: false,
          },
          source: 'legacy',
        };
      }
    }
  }

  return { item: null, source: 'legacy' };
}

export async function listAdminUsers(filters: AdminUserListFilters): Promise<AdminUserListResult> {
  try {
    return await fetchFromView(DIRECTORY_VIEW, 'site_code', 'admin_user_directory_view', filters);
  } catch (directoryError) {
    console.warn('[user-directory] admin_user_directory_view unavailable, fallback to unified_users_view:', directoryError);
    return fetchFromView(LEGACY_VIEW, 'source_site', 'unified_users_view', filters);
  }
}

export async function getAdminUserById(
  userId: string,
  siteCode?: AdminUserSiteCode,
): Promise<AdminUserDetailResult> {
  try {
    return await fetchUserDetailFromView(
      DIRECTORY_VIEW,
      'site_code',
      'admin_user_directory_view',
      userId,
      siteCode,
    );
  } catch (directoryError) {
    console.warn('[user-directory] admin_user_directory_view detail unavailable, fallback to unified_users_view:', directoryError);
  }

  try {
    const legacyViewResult = await fetchUserDetailFromView(
      LEGACY_VIEW,
      'source_site',
      'unified_users_view',
      userId,
      siteCode,
    );

    if (legacyViewResult.item) {
      if (legacyViewResult.item.sourceSite === 'cn') {
        legacyViewResult.item = await enrichCnUserRecord(legacyViewResult.item);
      }
      return legacyViewResult;
    }
  } catch (legacyViewError) {
    console.warn('[user-directory] unified_users_view detail unavailable, fallback to legacy tables:', legacyViewError);
  }

  return fetchLegacyUserDetail(userId, siteCode);
}

export async function countAdminUsers(filters: AdminUserCountFilters): Promise<number> {
  return countFromPreferredView(filters);
}

export async function getAdminUserKpis(
  siteCode: AdminUserSiteCode,
  todayStart: string,
): Promise<{ totalUsers: number; todayUsers: number; approvedUsers: number; pendingUsers: number }> {
  const baseFilters: AdminUserQueryFilters = { siteCode };

  const [totalUsers, todayUsers, approvedUsers, pendingUsers] = await Promise.all([
    countFromPreferredView(baseFilters),
    countFromPreferredView({ ...baseFilters, createdAfter: todayStart }),
    countFromPreferredView({ ...baseFilters, verificationStatus: 'approved' }),
    countFromPreferredView(baseFilters, PENDING_STATUSES),
  ]);

  return {
    totalUsers,
    todayUsers,
    approvedUsers,
    pendingUsers,
  };
}