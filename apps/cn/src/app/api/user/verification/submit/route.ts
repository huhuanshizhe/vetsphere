import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/user/verification/submit
 * 提交认证审核
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
    
    // 获取当前申请
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
    
    if (verificationError || !verification) {
      return NextResponse.json({ error: '未找到认证申请' }, { status: 404 });
    }
    
    // 检查状态
    if (!['draft', 'rejected'].includes(verification.status)) {
      return NextResponse.json(
        { error: '当前状态不允许提交' },
        { status: 400 }
      );
    }
    
    // 校验必填字段
    const errors: string[] = [];
    
    if (!verification.real_name || verification.real_name.trim() === '') {
      errors.push('请填写真实姓名');
    }
    
    if (!verification.organization_name || verification.organization_name.trim() === '') {
      errors.push('请填写所属机构');
    }
    
    if (!verification.position_title || verification.position_title.trim() === '') {
      errors.push('请填写职位/身份');
    }
    
    // 检查材料
    const documents = verification.documents || [];
    if (documents.length === 0) {
      errors.push('请至少上传一项证明材料');
    }
    
    // 检查声明
    if (!verification.agree_verification_statement) {
      errors.push('请确认提交资料真实有效');
    }
    
    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('；') }, { status: 400 });
    }
    
    // 创建快照
    const snapshot = {
      verification_type: verification.verification_type,
      real_name: verification.real_name,
      organization_name: verification.organization_name,
      position_title: verification.position_title,
      specialty_tags: verification.specialty_tags,
      verification_note: verification.verification_note,
      type_specific_fields: verification.type_specific_fields,
      documents: documents.map((doc: any) => ({
        file_id: doc.file_id,
        file_url: doc.file_url,
        file_name: doc.file_name,
        doc_type: doc.doc_type,
      })),
      submitted_at: new Date().toISOString(),
    };
    
    // 更新状态为已提交
    const { error: updateError } = await supabaseAdmin
      .from('cn_verification_requests')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        snapshot_json: snapshot,
        reject_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', verification.id);
    
    if (updateError) {
      console.error('Error submitting verification:', updateError);
      return NextResponse.json({ error: '提交失败' }, { status: 500 });
    }
    
    // 记录审核日志
    await supabaseAdmin
      .from('cn_verification_audit_logs')
      .insert({
        verification_request_id: verification.id,
        action: 'submit',
        from_status: verification.status,
        to_status: 'submitted',
      });
    
    // 更新状态快照
    await supabaseAdmin
      .from('cn_user_state_snapshots')
      .upsert({
        user_id: user.id,
        site_code: 'cn',
        verification_status: 'submitted',
        access_level: 'verification_pending',
        redirect_hint: 'show_verification_pending',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,site_code',
      });
    
    return NextResponse.json({
      success: true,
      status: 'submitted',
      message: '认证资料已提交，请等待审核',
      redirectHint: 'go_verification_status',
    });
    
  } catch (err) {
    console.error('POST /api/user/verification/submit error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
