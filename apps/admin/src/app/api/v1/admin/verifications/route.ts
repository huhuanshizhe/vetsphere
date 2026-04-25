import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

const supabaseAdmin = getSupabaseAdmin();

/**
 * GET /api/v1/admin/verifications
 * 通用医生认证申请列表（跨站点）
 *
 * Query:
 *   site_code = cn | intl | global   (默认 global = 不过滤)
 *   status    = submitted | under_review | approved | rejected ...
 *   type      = veterinarian | general_practitioner | ...
 *   keyword   = 搜索手机号 / 姓名 / 邮箱（模糊）
 *   page, pageSize
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const siteCode = searchParams.get('site_code') || 'global';
    const status = searchParams.get('status');
    const verificationType = searchParams.get('type');
    const keyword = (searchParams.get('keyword') || '').trim();
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let query = supabaseAdmin
      .from('cn_verification_requests')
      .select('*', { count: 'exact' })
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (siteCode !== 'global') {
      query = query.eq('site_code', siteCode);
    }
    if (status) query = query.eq('status', status);
    if (verificationType) query = query.eq('verification_type', verificationType);

    if (keyword) {
      // real_name / organization_name 模糊匹配
      query = query.or(`real_name.ilike.%${keyword}%,organization_name.ilike.%${keyword}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: verifications, error, count } = await query;
    if (error) {
      console.error('[verifications] query error', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    const userIds = [...new Set((verifications || []).map((v) => v.user_id))];

    // 跨站用户信息：cn_users（手机）+ profiles（邮箱）
    const [cnUsersRes, profilesRes, cnProfilesRes, identitiesRes] = await Promise.all([
      supabaseAdmin.from('cn_users').select('id, mobile').in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']),
      supabaseAdmin.from('profiles').select('id, email, full_name, avatar_url, phone').in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']),
      supabaseAdmin.from('cn_user_profiles').select('user_id, display_name, avatar_file_id').in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']),
      supabaseAdmin.from('cn_user_identity_profiles').select('user_id, identity_type, identity_group').in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']),
    ]);

    const cnUsersMap = new Map((cnUsersRes.data || []).map((u) => [u.id, u]));
    const profilesMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
    const cnProfilesMap = new Map((cnProfilesRes.data || []).map((p) => [p.user_id, p]));
    const identitiesMap = new Map((identitiesRes.data || []).map((i) => [i.user_id, i]));

    const items = (verifications || []).map((v) => {
      const cn = cnUsersMap.get(v.user_id) as { id: string; mobile?: string } | undefined;
      const pf = profilesMap.get(v.user_id) as { id: string; email?: string; full_name?: string; avatar_url?: string; phone?: string } | undefined;
      const cnP = cnProfilesMap.get(v.user_id) as { display_name?: string; avatar_file_id?: string } | undefined;
      const idy = identitiesMap.get(v.user_id) as { identity_type?: string; identity_group?: string } | undefined;

      return {
        id: v.id,
        userId: v.user_id,
        siteCode: v.site_code,
        contact: cn?.mobile || pf?.phone || pf?.email || null,
        email: pf?.email || null,
        mobile: cn?.mobile || pf?.phone || null,
        displayName: cnP?.display_name || pf?.full_name || v.real_name,
        avatarUrl: cnP?.avatar_file_id || pf?.avatar_url || null,
        identityType: idy?.identity_type || null,
        identityGroup: idy?.identity_group || null,
        verificationType: v.verification_type,
        status: v.status,
        realName: v.real_name,
        organizationName: v.organization_name,
        positionTitle: v.position_title,
        specialtyTags: v.specialty_tags,
        submittedAt: v.submitted_at,
        reviewedAt: v.reviewed_at,
        rejectReason: v.reject_reason,
        createdAt: v.created_at,
      };
    });

    return NextResponse.json({
      items,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      siteCode,
    });
  } catch (err) {
    console.error('GET /api/v1/admin/verifications error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
