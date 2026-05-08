import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-middleware';
import { writeAuditLog } from '@/lib/audit';

const supabaseAdmin = getSupabaseAdmin();

/**
 * GET /api/v1/admin/cn-verifications/[id]
 * 获取认证申请详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;
  try {
    const { id } = await params;
    
    // 获取认证详情 - 不使用 join，因为外键关系可能不存在
    const { data: verification, error: queryError } = await supabaseAdmin
      .from('cn_verification_requests')
      .select('*, documents:cn_verification_documents(*)')
      .eq('id', id)
      .single();
    
    if (queryError || !verification) {
      console.error('Query error:', queryError);
      return NextResponse.json({ error: '未找到认证申请' }, { status: 404 });
    }
    
    let cnUser: Record<string, any> | null = null;
    let cnProfile: Record<string, any> | null = null;
    let cnIdentity: Record<string, any> | null = null;
    let intlProfile: Record<string, any> | null = null;

    if (verification.site_code === 'cn') {
      const [userRes, profileRes, identityRes] = await Promise.all([
        supabaseAdmin
          .from('cn_users')
          .select('mobile, status, registered_at, last_login_at')
          .eq('id', verification.user_id)
          .maybeSingle(),
        supabaseAdmin
          .from('cn_user_profiles')
          .select('display_name, real_name, avatar_file_id, organization_name, job_title, experience_years, interest_tags, bio, identity_fields')
          .eq('user_id', verification.user_id)
          .eq('site_code', 'cn')
          .maybeSingle(),
        supabaseAdmin
          .from('cn_user_identity_profiles')
          .select('identity_type, identity_group, identity_group_v2, doctor_subtype, identity_selected_at')
          .eq('user_id', verification.user_id)
          .eq('site_code', 'cn')
          .maybeSingle(),
      ]);

      cnUser = userRes.data;
      cnProfile = profileRes.data;
      cnIdentity = identityRes.data;
    } else {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name, avatar_url, created_at, last_login_at')
        .eq('id', verification.user_id)
        .maybeSingle();

      intlProfile = profile;
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
        siteCode: verification.site_code,
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
      user: verification.site_code === 'cn'
        ? cnUser ? {
            mobile: cnUser.mobile,
            email: null,
            status: cnUser.status,
            registeredAt: cnUser.registered_at,
            lastLoginAt: cnUser.last_login_at,
          } : null
        : intlProfile ? {
            mobile: null,
            email: intlProfile.email || null,
            status: 'active',
            registeredAt: intlProfile.created_at || null,
            lastLoginAt: intlProfile.last_login_at || null,
          } : null,
      profile: verification.site_code === 'cn'
        ? cnProfile ? {
            displayName: cnProfile.display_name,
            realName: cnProfile.real_name,
            avatarUrl: cnProfile.avatar_file_id,
            organizationName: cnProfile.organization_name,
            jobTitle: cnProfile.job_title,
            experienceYears: cnProfile.experience_years,
            interestTags: cnProfile.interest_tags || [],
            bio: cnProfile.bio,
            identityFields: cnProfile.identity_fields || {},
          } : null
        : intlProfile ? {
            displayName: intlProfile.full_name || null,
            realName: intlProfile.full_name || null,
            avatarUrl: intlProfile.avatar_url || null,
            organizationName: verification.organization_name,
            jobTitle: verification.position_title,
            experienceYears: null,
            interestTags: [],
            bio: null,
            identityFields: {},
          } : null,
      identity: verification.site_code === 'cn' && cnIdentity ? {
        identityType: cnIdentity.identity_type,
        identityGroup: cnIdentity.identity_group,
        identityGroupV2: cnIdentity.identity_group_v2,
        doctorSubtype: cnIdentity.doctor_subtype,
        identitySelectedAt: cnIdentity.identity_selected_at,
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
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;
  try {
    const adminUser = { id: auth.admin.id, email: auth.admin.email };
    const adminProfile = { full_name: auth.admin.fullName };
    const { id } = await params;
    const body = await request.json();
    const { action, rejectReason, reviewNote, approvedLevel } = body;
    
    // 验证action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
    
    // 获取当前申请
    const { data: verification, error: queryError } = await supabaseAdmin
      .from('cn_verification_requests')
      .select('id, user_id, site_code, status')
      .eq('id', id)
      .single();
    
    if (queryError || !verification) {
      return NextResponse.json({ error: '未找到认证申请' }, { status: 404 });
    }
    
    // 状态流转验证：允许从 submitted 或 under_review 状态审核
    const reviewableStatuses = ['submitted', 'under_review', 'pending_review'];
    if (!reviewableStatuses.includes(verification.status)) {
      return NextResponse.json(
        { error: `当前状态(${verification.status})不允许审核操作` },
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

    // 跨模块审计日志（admin_audit_logs）
    writeAuditLog(request, auth.admin, {
      module: 'doctor_verify',
      action,
      targetType: `${verification.site_code}_verification_request`,
      targetId: id,
      oldValue: { status: verification.status },
      newValue: { status: newStatus, reject_reason: rejectReason || null },
      changesSummary:
        action === 'approve'
          ? `通过 ${verification.site_code.toUpperCase()} 认证（${approvedLevel || 'professional_verified'}）`
          : `驳回 ${verification.site_code.toUpperCase()} 认证：${rejectReason || ''}`,
    });
    
    // 更新用户状态快照
    if ((action === 'approve' || action === 'reject') && verification.site_code === 'cn') {
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
        snapshotUpdate.verification_reject_reason = rejectReason;
        snapshotUpdate.access_level = 'profiled_user';
        snapshotUpdate.redirect_hint = 'show_rejection_prompt';
        snapshotUpdate.doctor_privilege_status = 'rejected';
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
      message: action === 'approve' ? '审核通过' : '已驳回',
    });
    
  } catch (err) {
    console.error('POST /api/v1/admin/cn-verifications/[id] error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
