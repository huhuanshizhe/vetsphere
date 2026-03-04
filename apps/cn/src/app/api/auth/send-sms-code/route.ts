import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 验证码配置
const SMS_CODE_LENGTH = 6;
const SMS_CODE_EXPIRES_MINUTES = 5;
const SMS_COOLDOWN_SECONDS = 60;
const SMS_MAX_PER_HOUR = 5;
const SMS_MAX_ERRORS = 5;

// 演示测试账号（固定验证码，用于演示和测试）
const DEMO_MOBILE = process.env.DEMO_TEST_MOBILE || '13800000000';
const DEMO_CODE = process.env.DEMO_TEST_CODE || '888888';

// 生成随机验证码
function generateCode(): string {
  return Math.random().toString().slice(2, 2 + SMS_CODE_LENGTH);
}

// 验证手机号格式
function isValidMobile(mobile: string): boolean {
  return /^1[3-9]\d{9}$/.test(mobile);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile, purpose = 'login' } = body;
    
    // 参数校验
    if (!mobile) {
      return NextResponse.json({ error: '请输入手机号' }, { status: 400 });
    }
    
    if (!isValidMobile(mobile)) {
      return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 });
    }
    
    if (!['register', 'login', 'reset_password', 'bind_mobile'].includes(purpose)) {
      return NextResponse.json({ error: '无效的用途' }, { status: 400 });
    }
    
    // 获取客户端IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    
    // 演示测试账号：跳过频控，使用固定验证码
    if (mobile === DEMO_MOBILE) {
      const expiresAt = new Date(Date.now() + SMS_CODE_EXPIRES_MINUTES * 60 * 1000).toISOString();
      await supabaseAdmin
        .from('sms_verification_codes')
        .insert({
          mobile,
          code: DEMO_CODE,
          purpose,
          ip_address: ipAddress,
          expires_at: expiresAt,
        });
      
      return NextResponse.json({
        success: true,
        message: '验证码已发送',
        expiresIn: SMS_CODE_EXPIRES_MINUTES * 60,
        code: DEMO_CODE,
      });
    }
    
    // 频控检查 - 单手机号60秒内不能重复发送
    const cooldownTime = new Date(Date.now() - SMS_COOLDOWN_SECONDS * 1000).toISOString();
    const { data: recentCode } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('id, created_at')
      .eq('mobile', mobile)
      .eq('purpose', purpose)
      .gte('created_at', cooldownTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (recentCode) {
      const waitSeconds = Math.ceil(
        SMS_COOLDOWN_SECONDS - (Date.now() - new Date(recentCode.created_at).getTime()) / 1000
      );
      return NextResponse.json(
        { error: `发送过于频繁，请${waitSeconds}秒后重试`, waitSeconds },
        { status: 429 }
      );
    }
    
    // 频控检查 - 单手机号每小时最多发送次数
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: hourCount } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('mobile', mobile)
      .gte('created_at', hourAgo);
    
    if ((hourCount || 0) >= SMS_MAX_PER_HOUR) {
      return NextResponse.json(
        { error: '发送次数过多，请稍后再试' },
        { status: 429 }
      );
    }
    
    // 频控检查 - 单IP每小时最多发送次数
    const { count: ipHourCount } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', hourAgo);
    
    if ((ipHourCount || 0) >= SMS_MAX_PER_HOUR * 3) {
      return NextResponse.json(
        { error: '当前网络发送次数过多，请稍后再试' },
        { status: 429 }
      );
    }
    
    // 生成验证码
    const code = generateCode();
    const expiresAt = new Date(Date.now() + SMS_CODE_EXPIRES_MINUTES * 60 * 1000).toISOString();
    
    // 保存验证码到数据库
    const { error: insertError } = await supabaseAdmin
      .from('sms_verification_codes')
      .insert({
        mobile,
        code,
        purpose,
        ip_address: ipAddress,
        expires_at: expiresAt,
      });
    
    if (insertError) {
      console.error('Error saving SMS code:', insertError);
      return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
    }
    
    // TODO: 调用实际短信服务发送验证码
    // 目前先在开发环境打印验证码
    console.log(`[SMS] Mobile: ${mobile}, Code: ${code}, Purpose: ${purpose}`);
    
    // 生产环境应该调用短信服务
    // await sendSMS(mobile, `您的验证码是${code}，${SMS_CODE_EXPIRES_MINUTES}分钟内有效。`);
    
    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      expiresIn: SMS_CODE_EXPIRES_MINUTES * 60,
      // 开发环境返回验证码，生产环境移除
      ...(process.env.NODE_ENV === 'development' && { code }),
    });
    
  } catch (err) {
    console.error('send-sms-code error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
