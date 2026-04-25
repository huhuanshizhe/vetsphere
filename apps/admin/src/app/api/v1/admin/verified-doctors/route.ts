import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

const supabase = getSupabaseAdmin();

/**
 * GET /api/v1/admin/verified-doctors
 *
 * 已通过审核的医生列表（cn_verification_requests.status = 'approved'）
 * Query: site_code, type, keyword, page, pageSize
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const siteCode = searchParams.get('site_code') || 'global';
    const type = searchParams.get('type');
    const keyword = (searchParams.get('keyword') || '').trim();
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from('cn_verification_requests')
      .select('*', { count: 'exact' })
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false, nullsFirst: false });

    if (siteCode !== 'global') q = q.eq('site_code', siteCode);
    if (type) q = q.eq('verification_type', type);
    if (keyword) {
      q = q.or(`real_name.ilike.%${keyword}%,organization_name.ilike.%${keyword}%`);
    }
    q = q.range(from, to);

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const userIds = [...new Set((data || []).map((v) => v.user_id))];
    const safeIds = userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'];
    const [cnUsersRes, profilesRes, cnProfilesRes] = await Promise.all([
      supabase.from('cn_users').select('id, mobile').in('id', safeIds),
      supabase.from('profiles').select('id, email, full_name, phone, avatar_url').in('id', safeIds),
      supabase.from('cn_user_profiles').select('user_id, display_name, avatar_file_id').in('user_id', safeIds),
    ]);
    const cnMap = new Map((cnUsersRes.data || []).map((u) => [u.id, u]));
    const pfMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
    const cnPfMap = new Map((cnProfilesRes.data || []).map((p) => [p.user_id, p]));

    const items = (data || []).map((v) => {
      const cn = cnMap.get(v.user_id) as { mobile?: string } | undefined;
      const pf = pfMap.get(v.user_id) as { email?: string; full_name?: string; phone?: string; avatar_url?: string } | undefined;
      const cnP = cnPfMap.get(v.user_id) as { display_name?: string; avatar_file_id?: string } | undefined;
      return {
        verificationId: v.id,
        userId: v.user_id,
        siteCode: v.site_code,
        contact: cn?.mobile || pf?.phone || pf?.email || null,
        displayName: cnP?.display_name || pf?.full_name || v.real_name,
        avatarUrl: cnP?.avatar_file_id || pf?.avatar_url || null,
        verificationType: v.verification_type,
        realName: v.real_name,
        organizationName: v.organization_name,
        positionTitle: v.position_title,
        approvedLevel: v.approved_level,
        reviewedAt: v.reviewed_at,
      };
    });

    return NextResponse.json({ items, total: count || 0, page, pageSize, siteCode });
  } catch (err) {
    console.error('GET /api/v1/admin/verified-doctors error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
