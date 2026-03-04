import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/v1/admin/cn-verifications
 * 获取CN站认证申请列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证Admin权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    
    // 检查Admin权限
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'Admin') {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }
    
    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const verificationType = searchParams.get('type');
    const mobile = searchParams.get('mobile');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    
    // 构建查询
    let query = supabaseAdmin
      .from('cn_verification_requests')
      .select(`
        *,
        cn_users!inner(mobile),
        cn_user_profiles(display_name, avatar_file_id),
        cn_user_identity_profiles(identity_type, identity_group)
      `, { count: 'exact' })
      .eq('site_code', 'cn')
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    
    // 应用筛选
    if (status) {
      query = query.eq('status', status);
    }
    if (verificationType) {
      query = query.eq('verification_type', verificationType);
    }
    if (mobile) {
      query = query.ilike('cn_users.mobile', `%${mobile}%`);
    }
    
    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    const { data: verifications, error: queryError, count } = await query;
    
    if (queryError) {
      console.error('Error fetching verifications:', queryError);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }
    
    // 格式化返回
    const items = (verifications || []).map((v: any) => ({
      id: v.id,
      userId: v.user_id,
      mobile: v.cn_users?.mobile,
      displayName: v.cn_user_profiles?.display_name,
      avatarUrl: v.cn_user_profiles?.avatar_file_id,
      identityType: v.cn_user_identity_profiles?.identity_type,
      identityGroup: v.cn_user_identity_profiles?.identity_group,
      verificationType: v.verification_type,
      status: v.status,
      realName: v.real_name,
      organizationName: v.organization_name,
      positionTitle: v.position_title,
      submittedAt: v.submitted_at,
      reviewedAt: v.reviewed_at,
      createdAt: v.created_at,
    }));
    
    return NextResponse.json({
      items,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
    
  } catch (err) {
    console.error('GET /api/v1/admin/cn-verifications error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
