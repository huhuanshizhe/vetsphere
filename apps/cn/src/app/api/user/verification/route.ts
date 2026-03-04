import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 有效的认证类型（仅3种医生身份需要认证）
const VALID_VERIFICATION_TYPES = [
  'veterinarian',
  'assistant_doctor',
  'rural_veterinarian',
];

/**
 * GET /api/user/verification
 * 获取当前用户的认证申请状态
 */
export async function GET(request: NextRequest) {
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
    
    // 获取最新的认证申请
    const { data: verification, error: verificationError } = await supabaseAdmin
      .from('cn_verification_requests')
      .select(`
        *,
        documents:cn_verification_documents(*)
      `)
      .eq('user_id', user.id)
      .eq('site_code', 'cn')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (verificationError) {
      if (verificationError.code === 'PGRST116') {
        // 没有申请记录
        return NextResponse.json({
          verification: null,
          status: 'not_started',
          hasVerification: false,
        });
      }
      console.error('Error fetching verification:', verificationError);
      return NextResponse.json({ error: '获取认证信息失败' }, { status: 500 });
    }
    
    // 格式化返回
    const documents = (verification.documents || []).map((doc: any) => ({
      id: doc.id,
      fileId: doc.file_id,
      fileUrl: doc.file_url,
      fileName: doc.file_name,
      fileType: doc.file_type,
      docType: doc.doc_type,
      docTypeDesc: doc.doc_type_desc,
      sortOrder: doc.sort_order,
    }));
    
    return NextResponse.json({
      verification: {
        id: verification.id,
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
        rejectReason: verification.reject_reason,
        approvedLevel: verification.approved_level,
        documents,
      },
      status: verification.status,
      hasVerification: true,
    });
    
  } catch (err) {
    console.error('GET /api/user/verification error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * POST /api/user/verification
 * 创建或更新认证申请草稿
 */
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
    const {
      verificationType,
      realName,
      organizationName,
      positionTitle,
      specialtyTags,
      verificationNote,
      typeSpecificFields,
      agreeVerificationStatement,
      documents,
    } = body;
    
    // 获取用户身份
    const { data: identity } = await supabaseAdmin
      .from('cn_user_identity_profiles')
      .select('identity_type')
      .eq('user_id', user.id)
      .eq('site_code', 'cn')
      .single();
    
    // 验证认证类型
    const verifyType = verificationType || identity?.identity_type;
    if (!verifyType || !VALID_VERIFICATION_TYPES.includes(verifyType)) {
      return NextResponse.json({ error: '无效的认证类型' }, { status: 400 });
    }
    
    // 检查是否已有认证申请
    const { data: existing } = await supabaseAdmin
      .from('cn_verification_requests')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('site_code', 'cn')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // 只允许编辑草稿或被驳回的申请
    if (existing && !['draft', 'rejected'].includes(existing.status)) {
      return NextResponse.json(
        { error: '当前状态不允许修改申请' },
        { status: 400 }
      );
    }
    
    const verificationData: any = {
      verification_type: verifyType,
      status: 'draft',
      updated_at: new Date().toISOString(),
    };
    
    if (realName !== undefined) verificationData.real_name = realName || '';
    if (organizationName !== undefined) verificationData.organization_name = organizationName || '';
    if (positionTitle !== undefined) verificationData.position_title = positionTitle || '';
    if (specialtyTags !== undefined) verificationData.specialty_tags = specialtyTags || [];
    if (verificationNote !== undefined) verificationData.verification_note = verificationNote || '';
    if (typeSpecificFields !== undefined) verificationData.type_specific_fields = typeSpecificFields || {};
    if (agreeVerificationStatement !== undefined) verificationData.agree_verification_statement = agreeVerificationStatement || false;
    
    let verificationId: string;
    
    if (existing) {
      // 更新现有申请
      if (existing.status === 'rejected') {
        // 被驳回的申请重新编辑时，清除驳回原因
        verificationData.reject_reason = null;
      }
      
      const { error: updateError } = await supabaseAdmin
        .from('cn_verification_requests')
        .update(verificationData)
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('Error updating verification:', updateError);
        return NextResponse.json({ error: '保存失败' }, { status: 500 });
      }
      
      verificationId = existing.id;
    } else {
      // 创建新申请
      const { data: newVerification, error: insertError } = await supabaseAdmin
        .from('cn_verification_requests')
        .insert({
          user_id: user.id,
          site_code: 'cn',
          ...verificationData,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating verification:', insertError);
        return NextResponse.json({ error: '保存失败' }, { status: 500 });
      }
      
      verificationId = newVerification.id;
    }
    
    // 处理文档
    if (documents && Array.isArray(documents)) {
      // 删除旧文档
      await supabaseAdmin
        .from('cn_verification_documents')
        .delete()
        .eq('verification_request_id', verificationId);
      
      // 插入新文档
      if (documents.length > 0) {
        // 中文类型到英文枚举的映射
        const docTypeMapping: Record<string, string> = {
          '执业兽医师资格证': 'license',
          '执业助理兽医师资格证': 'license',
          '乡村兽医登记证': 'license',
          '身份证': 'profile_page',
          '工作证明': 'employment_proof',
          '其他证明': 'other',
        };
        
        const docsToInsert = documents.map((doc: any, index: number) => {
          const rawDocType = doc.docType || doc.documentType || 'other';
          const mappedDocType = docTypeMapping[rawDocType] || 'other';
          const fileUrl = doc.fileUrl || doc.documentUrl || '';
          
          return {
            verification_request_id: verificationId,
            file_id: fileUrl.split('/').pop() || `doc_${Date.now()}_${index}`, // 从URL提取或生成ID
            file_url: fileUrl,
            file_name: doc.fileName || null,
            file_type: doc.fileType || (fileUrl.match(/\.(pdf)$/i) ? 'pdf' : 'image'),
            doc_type: mappedDocType,
            doc_type_desc: rawDocType, // 保存原始中文描述
            sort_order: index,
          };
        });
        
        const { error: docError } = await supabaseAdmin
          .from('cn_verification_documents')
          .insert(docsToInsert);
        
        if (docError) {
          console.error('Error inserting documents:', docError);
          // 不阻塞主流程，但记录错误
        }
      }
    }
    
    // 更新状态快照
    await supabaseAdmin
      .from('cn_user_state_snapshots')
      .upsert({
        user_id: user.id,
        site_code: 'cn',
        verification_status: 'draft',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,site_code',
      });
    
    return NextResponse.json({
      success: true,
      verificationId,
      status: 'draft',
      message: '草稿已保存',
    });
    
  } catch (err) {
    console.error('POST /api/user/verification error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
