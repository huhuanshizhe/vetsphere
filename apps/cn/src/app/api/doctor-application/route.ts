import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 创建 service role client 用于绕过 RLS（在后端使用）
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

// 从前端字段转换为数据库字段命名
function mapClientToDb(data: any) {
  const result: any = {};
  
  if (data.fullName !== undefined) result.full_name = data.fullName;
  if (data.phone !== undefined) result.phone = data.phone;
  if (data.province !== undefined) result.province = data.province;
  if (data.city !== undefined) result.city = data.city;
  if (data.avatarUrl !== undefined) result.avatar_url = data.avatarUrl;
  if (data.hospitalName !== undefined) result.hospital_name = data.hospitalName;
  if (data.position !== undefined) result.position = data.position;
  if (data.specialties !== undefined) result.specialties = data.specialties;
  if (data.yearsOfExperience !== undefined) result.years_of_experience = data.yearsOfExperience;
  if (data.licenseImageUrl !== undefined) result.license_image_url = data.licenseImageUrl;
  if (data.supplementaryUrls !== undefined) result.supplementary_urls = data.supplementaryUrls;
  if (data.credentialNotes !== undefined) result.credential_notes = data.credentialNotes;
  if (data.nickname !== undefined) result.nickname = data.nickname;
  if (data.email !== undefined) result.email = data.email;
  if (data.bio !== undefined) result.bio = data.bio;
  
  return result;
}

// GET: 获取当前用户的申请
export async function GET(request: NextRequest) {
  try {
    // 从请求头获取用户 token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // 验证用户
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    
    // 查询用户的申请
    const { data, error } = await supabaseAdmin
      .from('doctor_applications')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      // PGRST116 = no rows found，返回 null 表示没有申请
      if (error.code === 'PGRST116') {
        return NextResponse.json({ application: null });
      }
      console.error('Error fetching application:', error);
      return NextResponse.json({ error: '获取申请失败' }, { status: 500 });
    }
    
    return NextResponse.json({ application: mapDbToClient(data) });
  } catch (err) {
    console.error('GET doctor-application error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST: 创建新申请（草稿状态）
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    
    const body = await request.json();
    const dbData = mapClientToDb(body);
    
    // 检查是否已有申请
    const { data: existing } = await supabaseAdmin
      .from('doctor_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .single();
    
    if (existing) {
      return NextResponse.json(
        { error: '您已有申请记录，请使用更新接口' }, 
        { status: 400 }
      );
    }
    
    // 创建新申请
    const { data, error } = await supabaseAdmin
      .from('doctor_applications')
      .insert({
        user_id: user.id,
        status: 'draft',
        ...dbData,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating application:', error);
      return NextResponse.json({ error: '创建申请失败' }, { status: 500 });
    }
    
    return NextResponse.json({ application: mapDbToClient(data) }, { status: 201 });
  } catch (err) {
    console.error('POST doctor-application error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// PUT: 更新申请（只能更新草稿或被拒绝的申请）
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }
    
    const body = await request.json();
    const dbData = mapClientToDb(body);
    
    // 检查现有申请状态
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('doctor_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !existing) {
      return NextResponse.json({ error: '未找到申请记录' }, { status: 404 });
    }
    
    // 只允许更新草稿或被拒绝的申请
    if (!['draft', 'rejected'].includes(existing.status)) {
      return NextResponse.json(
        { error: '当前状态不允许修改申请' }, 
        { status: 400 }
      );
    }
    
    // 如果是被拒绝的申请重新编辑，状态保持为 draft
    const updateData = { ...dbData };
    if (existing.status === 'rejected') {
      updateData.status = 'draft';
      updateData.rejection_reason = null;
    }
    
    // 更新申请
    const { data, error } = await supabaseAdmin
      .from('doctor_applications')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating application:', error);
      return NextResponse.json({ error: '更新申请失败' }, { status: 500 });
    }
    
    return NextResponse.json({ application: mapDbToClient(data) });
  } catch (err) {
    console.error('PUT doctor-application error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
