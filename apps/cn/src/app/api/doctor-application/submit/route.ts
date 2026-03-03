import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// POST: 提交申请审核
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
    
    // 获取现有申请
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('doctor_applications')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !existing) {
      return NextResponse.json({ error: '未找到申请记录' }, { status: 404 });
    }
    
    // 只允许提交草稿或被拒绝的申请
    if (!['draft', 'rejected'].includes(existing.status)) {
      return NextResponse.json(
        { error: '当前状态不允许提交' }, 
        { status: 400 }
      );
    }
    
    // 验证必填字段
    const requiredFields = ['full_name', 'phone', 'city', 'hospital_name', 'position'];
    const missingFields = requiredFields.filter(field => !existing[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: '请完善必填信息', missingFields }, 
        { status: 400 }
      );
    }
    
    // 检查专科方向
    if (!existing.specialties || existing.specialties.length === 0) {
      return NextResponse.json(
        { error: '请选择至少一个专科方向' }, 
        { status: 400 }
      );
    }
    
    // 检查资质证明
    if (!existing.license_image_url) {
      return NextResponse.json(
        { error: '请上传执业证明或资格证书' }, 
        { status: 400 }
      );
    }
    
    // 更新状态为待审核
    const { data, error } = await supabaseAdmin
      .from('doctor_applications')
      .update({
        status: 'pending_review',
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error submitting application:', error);
      return NextResponse.json({ error: '提交失败' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: '申请已提交，请等待审核',
      status: data.status,
    });
  } catch (err) {
    console.error('POST submit error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
