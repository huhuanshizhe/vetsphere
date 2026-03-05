import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 验证Admin权限，返回用户信息
async function verifyAdmin(token: string) {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'Admin') return null;
    return { user, profile };
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const admin = await verifyAdmin(token);
    if (!admin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }
    
    const { data, error } = await supabaseAdmin
      .from('doctor_applications')
      .select('*')
      .eq('id', id)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const admin = await verifyAdmin(token);
    if (!admin) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }
    
    const { user: adminUser, profile: adminProfile } = admin;
    
    const body = await request.json();
    const { action, reason } = body;
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
    
    // 获取现有申请
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('doctor_applications')
      .select('id, user_id, status, site_code')
      .eq('id', id)
      .single();
    
    if (fetchError || !existing) {
      return NextResponse.json({ error: '申请不存在' }, { status: 404 });
    }
    
    // 只能审核待审核状态的申请
    if (existing.status !== 'pending_review') {
      return NextResponse.json(
        { error: `当前状态(${existing.status})不允许审核操作` }, 
        { status: 400 }
      );
    }
    
    // 执行审核操作
    const updateData: any = {
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
    };
    
    let newStatus: string;
    
    if (action === 'approve') {
      newStatus = 'approved';
      updateData.status = 'approved';
      updateData.rejection_reason = null;
    } else {
      if (!reason) {
        return NextResponse.json({ error: '请填写拒绝原因' }, { status: 400 });
      }
      newStatus = 'rejected';
      updateData.status = 'rejected';
      updateData.rejection_reason = reason;
    }
    
    const { data, error } = await supabaseAdmin
      .from('doctor_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating application:', error);
      return NextResponse.json({ error: '审核操作失败' }, { status: 500 });
    }
    
    // 记录审核日志（使用 Service Role Key 绕过 RLS）
    const { error: auditError } = await supabaseAdmin
      .from('doctor_audit_logs')
      .insert({
        application_id: id,
        action,
        old_status: existing.status,
        new_status: newStatus,
        reason: action === 'reject' ? reason : null,
        performed_by: adminUser.id,
      });
    
    if (auditError) {
      // 审核日志写入失败不阻断主流程，但记录错误
      console.error('Error writing audit log:', auditError);
    }
    
    // 更新用户状态快照
    if (existing.user_id) {
      const snapshotUpdate: any = {
        verification_status: newStatus,
        updated_at: new Date().toISOString(),
      };
      
      if (action === 'approve') {
        snapshotUpdate.identity_verified_flag = true;
        snapshotUpdate.access_level = 'verified_professional';
        snapshotUpdate.redirect_hint = 'go_home';
        snapshotUpdate.doctor_privilege_status = 'approved';
        snapshotUpdate.permission_flags = {
          can_access_user_center: true,
          can_purchase_courses: true,
          can_purchase_products: true,
          can_manage_orders: true,
          can_access_growth_system: true,
          can_access_doctor_workspace: true,
          can_access_medical_features: true,
          can_access_professional_courses: true,
          can_view_restricted_product_info: true,
        };
      } else if (action === 'reject') {
        snapshotUpdate.verification_reject_reason = reason;
        snapshotUpdate.access_level = 'profiled_user';
        snapshotUpdate.redirect_hint = 'show_rejection_prompt';
        snapshotUpdate.doctor_privilege_status = 'rejected';
      }
      
      const siteCode = existing.site_code || 'cn';
      const { error: snapshotError } = await supabaseAdmin
        .from('cn_user_state_snapshots')
        .update(snapshotUpdate)
        .eq('user_id', existing.user_id)
        .eq('site_code', siteCode);
      
      if (snapshotError) {
        console.error('Error updating user state snapshot:', snapshotError);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: action === 'approve' ? '已通过审核' : '已拒绝申请',
      action,
      newStatus,
      application: mapDbToClient(data),
    });
  } catch (err) {
    console.error('POST application error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
