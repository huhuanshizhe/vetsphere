import type { SupabaseClient } from '@supabase/supabase-js';

export type UserSiteCode = 'cn' | 'intl';

interface BaseProfileInput {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface UserSiteMembershipInput {
  userId: string;
  siteCode: UserSiteCode;
  originSite?: UserSiteCode;
  createdVia: string;
  isShadowProfile?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  const message =
    'message' in error ? String((error as { message?: unknown }).message || '') : '';

  return code === '42P01' || message.includes('user_site_memberships');
}

export async function upsertBaseProfile(
  supabase: SupabaseClient,
  input: BaseProfileInput,
): Promise<void> {
  const now = input.updatedAt || new Date().toISOString();
  const payload: Record<string, unknown> = {
    id: input.userId,
    created_at: input.createdAt || now,
    updated_at: now,
  };

  if (input.email !== undefined) payload.email = input.email;
  if (input.fullName !== undefined) payload.full_name = input.fullName;
  if (input.role !== undefined) payload.role = input.role;
  if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;
  if (input.phone !== undefined) payload.phone = input.phone;

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
}

export async function safeUpsertUserSiteMembership(
  supabase: SupabaseClient,
  input: UserSiteMembershipInput,
): Promise<void> {
  const now = input.updatedAt || new Date().toISOString();
  const payload = {
    user_id: input.userId,
    site_code: input.siteCode,
    origin_site: input.originSite || input.siteCode,
    created_via: input.createdVia,
    is_shadow_profile: input.isShadowProfile || false,
    is_active: input.isActive ?? true,
    metadata: input.metadata || {},
    created_at: input.createdAt || now,
    updated_at: now,
  };

  const { error } = await supabase
    .from('user_site_memberships')
    .upsert(payload, { onConflict: 'user_id,site_code' });

  if (!error) return;

  if (isMissingRelationError(error)) {
    console.warn('[user-site-provenance] user_site_memberships unavailable, skipping provenance write:', error.message);
    return;
  }

  throw error;
}