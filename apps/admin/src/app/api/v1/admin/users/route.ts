import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

const supabase = getSupabaseAdmin();

/**
 * GET /api/v1/admin/users
 *
 * 跨站点用户列表。
 *
 * Query:
 *   site_code = cn | intl | global   (默认 global = 全部)
 *     - cn:    cn_users 表（手机注册）
 *     - intl:  profiles 表（邮箱注册，排除管理员）
 *     - global: unified_users_view（合并两侧，排除管理员）
 *   keyword = 搜索 contact / display_name
 *   verification_status = 过滤认证状态（仅 global / 任意）
 *   page, pageSize
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const siteCode = searchParams.get('site_code') || 'global';
    const keyword = (searchParams.get('keyword') || '').trim();
    const verificationStatus = searchParams.get('verification_status');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // global → 走 unified_users_view
    if (siteCode === 'global') {
      let q = supabase
        .from('unified_users_view')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (keyword) {
        q = q.or(`contact.ilike.%${keyword}%,display_name.ilike.%${keyword}%,email.ilike.%${keyword}%`);
      }
      if (verificationStatus) {
        q = q.eq('verification_status', verificationStatus);
      }
      q = q.range(from, to);

      const { data, error, count } = await q;
      if (error) {
        // view 可能尚未部署 → 降级查 profiles
        console.warn('[users] unified_users_view error, fallback to profiles:', error.message);
      } else {
        return NextResponse.json({
          items: data || [],
          total: count || 0,
          page,
          pageSize,
          siteCode,
        });
      }
    }

    // cn → cn_users + cn_user_profiles
    if (siteCode === 'cn') {
      let q = supabase
        .from('cn_users')
        .select('id, mobile, status, registered_at, last_login_at, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (keyword) q = q.ilike('mobile', `%${keyword}%`);
      q = q.range(from, to);

      const { data, error, count } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const ids = (data || []).map((u) => u.id);
      const [profilesRes, identityRes, vrRes] = await Promise.all([
        supabase.from('cn_user_profiles').select('user_id, display_name, avatar_file_id').in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
        supabase.from('cn_user_identity_profiles').select('user_id, identity_type, identity_group').in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
        supabase.from('cn_verification_requests').select('user_id, status, verification_type').in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
      ]);

      const profilesMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
      const identityMap = new Map((identityRes.data || []).map((i) => [i.user_id, i]));
      const vrMap = new Map<string, { status: string; verification_type: string }>();
      for (const vr of vrRes.data || []) {
        if (!vrMap.has(vr.user_id)) vrMap.set(vr.user_id, vr);
      }

      const items = (data || []).map((u) => {
        const p = profilesMap.get(u.id) as { display_name?: string; avatar_file_id?: string } | undefined;
        const idy = identityMap.get(u.id) as { identity_type?: string; identity_group?: string } | undefined;
        const vr = vrMap.get(u.id);
        return {
          user_id: u.id,
          source_site: 'cn',
          contact: u.mobile,
          email: null,
          display_name: p?.display_name || null,
          avatar_url: p?.avatar_file_id || null,
          account_status: u.status,
          identity_type: idy?.identity_type || null,
          identity_group: idy?.identity_group || null,
          verification_status: vr?.status || null,
          verification_type: vr?.verification_type || null,
          registered_at: u.registered_at,
          last_login_at: u.last_login_at,
          created_at: u.created_at,
          is_admin: false,
        };
      });

      return NextResponse.json({ items, total: count || 0, page, pageSize, siteCode });
    }

    // intl → profiles 表（排除管理员）
    let q = supabase
      .from('profiles')
      .select('id, email, full_name, phone, avatar_url, is_admin, created_at, last_login_at, deleted_at', { count: 'exact' })
      .or('is_admin.is.null,is_admin.eq.false')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (keyword) {
      q = q.or(`email.ilike.%${keyword}%,full_name.ilike.%${keyword}%,phone.ilike.%${keyword}%`);
    }
    q = q.range(from, to);

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ids = (data || []).map((u) => u.id);
    const { data: vrs } = await supabase
      .from('cn_verification_requests')
      .select('user_id, status, verification_type')
      .in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
    const vrMap = new Map<string, { status: string; verification_type: string }>();
    for (const vr of vrs || []) {
      if (!vrMap.has(vr.user_id)) vrMap.set(vr.user_id, vr);
    }

    const items = (data || []).map((u) => {
      const vr = vrMap.get(u.id);
      return {
        user_id: u.id,
        source_site: 'intl',
        contact: u.email || u.phone,
        email: u.email,
        display_name: u.full_name,
        avatar_url: u.avatar_url,
        account_status: u.deleted_at ? 'deleted' : 'active',
        verification_status: vr?.status || null,
        verification_type: vr?.verification_type || null,
        registered_at: u.created_at,
        last_login_at: u.last_login_at,
        created_at: u.created_at,
        is_admin: !!u.is_admin,
      };
    });

    return NextResponse.json({ items, total: count || 0, page, pageSize, siteCode });
  } catch (err) {
    console.error('GET /api/v1/admin/users error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
