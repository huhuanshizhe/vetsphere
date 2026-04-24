import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';

const supabaseAdmin = getSupabaseAdmin();

// 从数据库字段转换为前端字段命名
function mapDbToClient(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    fullName: row.full_name,
    phone: row.phone,
    province: row.province,
    city: row.city,
    avatarUrl: row.avatar_url,
    hospitalName: row.hospital_name,
    position: row.position,
    specialties: row.specialties || [],
    yearsOfExperience: row.years_of_experience,
    licenseImageUrl: row.license_image_url,
    supplementaryUrls: row.supplementary_urls || [],
    credentialNotes: row.credential_notes,
    nickname: row.nickname,
    email: row.email,
    bio: row.bio,
    rejectionReason: row.rejection_reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET: 获取申请列表
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;

  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // 构建查询
    let query = supabaseAdmin
      .from('doctor_applications')
      .select('*', { count: 'exact' });
    
    // 按状态筛选
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    // 排序和分页
    query = query
      .order('submitted_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json({ error: '获取申请列表失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      applications: (data || []).map(mapDbToClient),
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('GET doctor-applications error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
