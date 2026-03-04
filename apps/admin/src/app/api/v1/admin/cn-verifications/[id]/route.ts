import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 验证Admin权限
async function verifyAdmin(token: string) {
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  
  if (authError || !user) {
    return { error: '无效的认证令牌', status: 401 };
  }
  
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();
  
  if (!profile || profile.role !== 'Admin') {
    return { error: '无权限访问', status: 403 };
  }
  
  return { user, profile };
}

/**
 * GET /api/v1/admin/cn-verifications/[id]
 * 获取认证申请详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const adminCheck = await verifyAdmin(token);
    if ('error' in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }
    
    const { id } = await params;
    
    // 获取认证详情
    const { data: verification, error: queryError } = await supabaseAdmin
      .from('cn_verification_requests')
      .select(`
        *,
        documents:cn_verification_documents(*),
        cn_users!inner(mobile, status, registered_at, last_login_at),
        cn_user_profiles(
          display_name, real_name, avatar_file_id, organization_name,
          job_title, experience_years, interest_tags, bio, identity_fields
        ),
        cn_user_identity_profiles(identity_type, identity_group, identity_selected_at)
      `)
      .eq('id', id)
      .single();
    
    if (queryError || !verification) {
      return NextResponse.json({ error: '未找到认证申请' }, { status: 404 });
    }
    
    // 获取审核日志
    const { data: auditLogs } = await supabaseAdmin
      .from('cn_verification_audit_logs')
      .select('*')
      .eq('verification_request_id', id)
      .order('created_at', { ascending: false });
    
    // 格式化返回
    const documents = (verification.documents || []).map((doc: any) => ({
      id: doc.id,
      fileId: doc.file_id,
      fileUrl: doc.file_url,
      fileName: doc.file_name,
      fileType: doc.file_type,
      docType: doc.doc_type,
      docTypeDesc: doc.doc_type_desc,
    }));
    
    return NextResponse.json({
      verification: {
        id: verification.id,
        userId: verification.user_id,
        verificationType: verification.verification_type,
        status: verification.status,
        realName: verification.real_name,
        organizationName: verification.organization_name,
        positionTitle: verification.position_title,
        specialtyTags: verification.specialty_tags || [],
        verificationNote: verification.verification_note,
        typeSpecificFields: verification.type_specific_fields || {},
        agreeVerificationStatement: verification.agree_verification_statement,
        submittedAt: verification.submitted_at,
        reviewedAt: verification.reviewed_at,
        reviewedBy: verification.reviewed_by,
        rejectReason: verification.reject_reason,
        approvedLevel: verification.approved_level,
        snapshotJson: verification.snapshot_json,
        documents,
        createdAt: verification.created_at,
        updatedAt: verification.updated_at,
      },
      user: {
        mobile: verification.cn_users?.mobile,
        status: verification.cn_users?.status,
        registeredAt: verification.cn_users?.registered_at,
        lastLoginAt: verification.cn_users?.last_login_at,
      },
      profile: verification.cn_user_profiles ? {
        displayName: verification.cn_user_profiles.display_name,
        realName: verification.cn_user_profiles.real_name,
        avatarUrl: verification.cn_user_profiles.avatar_file_id,
        organizationName: verification.cn_user_profiles.organization_name,
        jobTitle: verification.cn_user_profiles.job_title,
        experienceYears: verification.cn_user_profiles.experience_years,
        interestTags: verification.cn_user_profiles.interest_tags || [],
        bio: verification.cn_user_profiles.bio,
        identityFields: verification.cn_user_profiles.identity_fields || {},
      } : null,
      identity: verification.cn_user_identity_profiles ? {
        identityType: verification.cn_user_identity_profiles.identity_type,
        identityGroup: verification.cn_user_identity_profiles.identity_group,
        identitySelectedAt: verification.cn_user_identity_profiles.identity_selected_at,
      } : null,
      auditLogs: (auditLogs || []).map((log: any) => ({
        id: log.id,
        action: log.action,
        adminName: log.admin_name,
        fromStatus: log.from_status,
        toStatus: log.to_status,
        rejectReason: log.reject_reason,
        reviewNote: log.review_note,
        createdAt: log.created_at,
      })),
    });
    
  } catch (err) {
    console.error('GET /api/v1/admin/cn-verifications/[id] error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * POST /api/v1/admin/cn-verifications/[id]
 * 审核认证申请 (approve/reject/start_review)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const adminCheck = await verifyAdmin(token);
    if ('error' in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }
    
    const { user: adminUser, profile: adminProfile } = adminCheck;
    const { id } = await params;
    const body = await request.json();
    const { action, rejectReason, reviewNote, approvedLevel } = body;
    
    // 验证action
    if (!['approve', 'reject', 'start_review'].includes(action)) {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
    
    // 获取当前申请
    const { data: verification, error: queryError } = await supabaseAdmin
      .from('cn_verification_requests')
      .select('id, user_id, status')
      .eq('id', id)
      .single();
    
    if (queryError || !verification) {
      return NextResponse.json({ error: '未找到认证申请' }, { status: 404 });
    }
    
    // 状态流转验证
    const allowedTransitions: Record<string, string[]> = {
      start_review: ['submitted'],
      approve: ['submitted', 'under_review'],
      reject: ['submitted', 'under_review'],
    };
    
    if (!allowedTransitions[action].includes(verification.status)) {
      return NextResponse.json(
        { error: `当前状态(${verification.status})不允许执行${action}操作` },
        { status: 400 }
      );
    }
    
    // 驳回必须有原因
    if (action === 'reject' && (!rejectReason || rejectReason.trim() === '')) {
      return NextResponse.json({ error: '请填写驳回原因' }, { status: 400 });
    }
    
    // 构建更新数据
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    let newStatus: string;
    
    switch (action) {
      case 'start_review':
        newStatus = 'under_review';
        updateData.status = newStatus;
        break;
        
      case 'approve':
        newStatus = 'approved';
        updateData.status = newStatus;
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = adminUser.id;
        updateData.approved_level = approvedLevel || 'professional_verified';
        break;
        
      case 'reject':
        newStatus = 'rejected';
        updateData.status = newStatus;
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = adminUser.id;
        updateData.reject_reason = rejectReason.trim();
        break;
        
      default:
        return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
    
    // 更新认证申请
    const { error: updateError } = await supabaseAdmin
      .from('cn_verification_requests')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) {
      console.error('Error updating verification:', updateError);
      return NextResponse.json({ error: '操作失败' }, { status: 500 });
    }
    
    // 记录审核日志
    await supabaseAdmin
      .from('cn_verification_audit_logs')
      .insert({
        verification_request_id: id,
        action,
        admin_user_id: adminUser.id,
        admin_name: adminProfile.full_name || adminUser.email,
        from_status: verification.status,
        to_status: newStatus,
        reject_reason: action === 'reject' ? rejectReason : null,
        review_note: reviewNote || null,
      });
    
    // 更新用户状态快照
    if (action === 'approve' || action === 'reject') {
      const snapshotUpdate: any = {
        verification_status: newStatus,
        updated_at: new Date().toISOString(),
      };
      
      if (action === 'approve') {
        snapshotUpdate.identity_verified_flag = true;
        snapshotUpdate.access_level = 'verified_professional';
        snapshotUpdate.redirect_hint = 'go_home';
        snapshotUpdate.permission_flags = {
          can_access_growth_system: true,
          can_access_professional_courses: true,
          can_submit_professional_application: false,
          can_view_restricted_product_info: true,
        };
      } else if (action === 'reject') {
        snapshotUpdate.verification_reject_reason = rejectReason;
        snapshotUpdate.access_level = 'profiled_user';
        snapshotUpdate.redirect_hint = 'show_rejection_prompt';
      }
      
      await supabaseAdmin
        .from('cn_user_state_snapshots')
        .update(snapshotUpdate)
        .eq('user_id', verification.user_id)
        .eq('site_code', 'cn');
    }
    
    // TODO: 发送通知给用户
    // await sendNotificationToUser(verification.user_id, action, rejectReason);
    
    return NextResponse.json({
      success: true,
      action,
      newStatus,
      message: action === 'approve' ? '审核通过' : action === 'reject' ? '已驳回' : '已开始审核',
    });
    
  } catch (err) {
    console.error('POST /api/v1/admin/cn-verifications/[id] error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
