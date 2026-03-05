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
    
    // 构建查询 - 不使用 join，因为外键关系可能不存在
    let query = supabaseAdmin
      .from('cn_verification_requests')
      .select('*', { count: 'exact' })
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
    // 注意：mobile 筛选需要在获取结果后进行客户端过滤，因为不再 join cn_users 表
    
    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    const { data: verifications, error: queryError, count } = await query;
    
    if (queryError) {
      console.error('Error fetching verifications:', queryError);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }
    
    // 获取所有用户ID，批量查询用户信息
    const userIds = [...new Set((verifications || []).map((v: any) => v.user_id))];
    
    // 批量查询用户信息
    const [usersRes, profilesRes, identitiesRes] = await Promise.all([
      supabaseAdmin.from('cn_users').select('id, mobile').in('id', userIds),
      supabaseAdmin.from('cn_user_profiles').select('user_id, display_name, avatar_file_id').in('user_id', userIds),
      supabaseAdmin.from('cn_user_identity_profiles').select('user_id, identity_type, identity_group, identity_group_v2, doctor_subtype').in('user_id', userIds),
    ]);
    
    // 构建用户信息映射
    const usersMap = new Map((usersRes.data || []).map((u: any) => [u.id, u]));
    const profilesMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    const identitiesMap = new Map((identitiesRes.data || []).map((i: any) => [i.user_id, i]));
    
    // 格式化返回
    const items = (verifications || []).map((v: any) => {
      const user = usersMap.get(v.user_id);
      const profile = profilesMap.get(v.user_id);
      const identity = identitiesMap.get(v.user_id);
      
      return {
        id: v.id,
        userId: v.user_id,
        mobile: user?.mobile,
        displayName: profile?.display_name,
        avatarUrl: profile?.avatar_file_id,
        identityType: identity?.identity_type,
        identityGroup: identity?.identity_group,
        identityGroupV2: identity?.identity_group_v2,
        doctorSubtype: identity?.doctor_subtype,
        verificationType: v.verification_type,
        status: v.status,
        realName: v.real_name,
        organizationName: v.organization_name,
        positionTitle: v.position_title,
        specialtyTags: v.specialty_tags,
        submittedAt: v.submitted_at,
        reviewedAt: v.reviewed_at,
        createdAt: v.created_at,
      };
    });
    
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
