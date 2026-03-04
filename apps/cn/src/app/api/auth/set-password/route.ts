import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const SMS_MAX_ERRORS = 5;

// 验证手机号格式
function isValidMobile(mobile: string): boolean {
  return /^1[3-9]\d{9}$/.test(mobile);
}

// 验证密码强度
function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: '密码长度需为 8-32 位' };
  }
  if (password.length > 32) {
    return { valid: false, message: '密码长度需为 8-32 位' };
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile, code, newPassword, confirmPassword, mode = 'reset' } = body;
    
    // 参数校验
    if (!newPassword || !confirmPassword) {
      return NextResponse.json({ error: '请输入新密码' }, { status: 400 });
    }
    
    // 密码强度校验
    const passwordCheck = isValidPassword(newPassword);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.message }, { status: 400 });
    }
    
    // 确认密码一致性
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: '两次输入的密码不一致' }, { status: 400 });
    }
    
    let userId: string;
    
    if (mode === 'reset') {
      // 重置密码模式 - 需要验证码
      if (!mobile || !code) {
        return NextResponse.json({ error: '请输入手机号和验证码' }, { status: 400 });
      }
      
      if (!isValidMobile(mobile)) {
        return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 });
      }
      
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: '验证码格式不正确' }, { status: 400 });
      }
      
      // 验证验证码
      const { data: smsRecord, error: smsError } = await supabaseAdmin
        .from('sms_verification_codes')
        .select('*')
        .eq('mobile', mobile)
        .eq('purpose', 'reset_password')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (smsError || !smsRecord) {
        return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });
      }
      
      if (smsRecord.error_count >= SMS_MAX_ERRORS) {
        return NextResponse.json({ error: '验证码错误次数过多，请重新获取' }, { status: 400 });
      }
      
      if (smsRecord.code !== code) {
        await supabaseAdmin
          .from('sms_verification_codes')
          .update({ error_count: smsRecord.error_count + 1 })
          .eq('id', smsRecord.id);
        return NextResponse.json({ error: '验证码错误' }, { status: 400 });
      }
      
      // 标记验证码已使用
      await supabaseAdmin
        .from('sms_verification_codes')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', smsRecord.id);
      
      // 查找用户
      const { data: cnUser, error: userError } = await supabaseAdmin
        .from('cn_users')
        .select('id')
        .eq('mobile', mobile)
        .single();
      
      if (userError || !cnUser) {
        return NextResponse.json({ error: '用户不存在' }, { status: 404 });
      }
      
      userId = cnUser.id;
      
    } else {
      // 首次设置密码模式 - 需要登录态
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !user) {
        return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
      }
      
      userId = user.id;
    }
    
    // 更新Supabase Auth中的密码 (Supabase Auth会自动处理密码哈希)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    
    if (updateError) {
      console.error('Failed to update password:', updateError);
      return NextResponse.json({ error: '密码更新失败' }, { status: 500 });
    }
    
    // 标记用户已设置密码
    await supabaseAdmin
      .from('cn_users')
      .update({ has_password: true })
      .eq('id', userId);
    
    return NextResponse.json({
      success: true,
      message: mode === 'reset' ? '密码重置成功，请重新登录' : '密码设置成功',
      requireRelogin: mode === 'reset',
    });
    
  } catch (err) {
    console.error('set-password error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
