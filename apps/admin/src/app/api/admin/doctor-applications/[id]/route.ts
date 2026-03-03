import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 检查是否为管理员并返回用户 ID
async function getAdminUser(token: string): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    return profile?.role === 'Admin' ? user.id : null;
  } catch {
    return null;
  }
}

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

// GET: 获取单个申请详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const adminId = await getAdminUser(token);
    if (!adminId) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }
    
    const { data, error } = await supabaseAdmin
      .from('doctor_applications')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '申请不存在' }, { status: 404 });
      }
      return NextResponse.json({ error: '获取申请失败' }, { status: 500 });
    }
    
    return NextResponse.json({ application: mapDbToClient(data) });
  } catch (err) {
    console.error('GET application error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST: 审核操作 (approve/reject)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const adminId = await getAdminUser(token);
    if (!adminId) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }
    
    const body = await request.json();
    const { action, reason } = body;
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
    
    // 获取现有申请
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('doctor_applications')
      .select('status')
      .eq('id', params.id)
      .single();
    
    if (fetchError || !existing) {
      return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    }
    
    // 只能审核待审核状态的申请
    if (existing.status !== 'pending_review') {
      return NextResponse.json(
        { error: '只能审核待审核状态的申请' }, 
        { status: 400 }
      );
    }
    
    // 执行审核操作
    const updateData: any = {
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    };
    
    if (action === 'approve') {
      updateData.status = 'approved';
      updateData.rejection_reason = null;
    } else {
      if (!reason) {
        return NextResponse.json({ error: '请填写拒绝原因' }, { status: 400 });
      }
      updateData.status = 'rejected';
      updateData.rejection_reason = reason;
    }
    
    const { data, error } = await supabaseAdmin
      .from('doctor_applications')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating application:', error);
      return NextResponse.json({ error: '审核操作失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: action === 'approve' ? '已通过审核' : '已拒绝申请',
      application: mapDbToClient(data),
    });
  } catch (err) {
    console.error('POST application error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
