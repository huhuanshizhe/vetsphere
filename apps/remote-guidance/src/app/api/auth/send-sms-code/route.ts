import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/guidance-api';

const SMS_CODE_LENGTH = 6;
const SMS_CODE_EXPIRES_MINUTES = 5;
const SMS_COOLDOWN_SECONDS = 60;
const SMS_MAX_PER_HOUR = 5;
const DEMO_MOBILE = process.env.DEMO_TEST_MOBILE || '13800000000';
const DEMO_CODE = process.env.DEMO_TEST_CODE || '888888';

function generateCode() {
  return Math.random()
    .toString()
    .slice(2, 2 + SMS_CODE_LENGTH);
}

function isValidMobile(mobile: string) {
  return /^1[3-9]\d{9}$/.test(mobile);
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const body = await request.json();
    const mobile = String(body?.mobile || '').trim();
    const purpose = String(body?.purpose || 'login').trim() || 'login';

    if (!mobile) {
      return NextResponse.json({ error: '请输入手机号' }, { status: 400 });
    }

    if (!isValidMobile(mobile)) {
      return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 });
    }

    if (!'register login reset_password bind_mobile'.split(' ').includes(purpose)) {
      return NextResponse.json({ error: '无效的用途' }, { status: 400 });
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    if (mobile === DEMO_MOBILE) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: '该手机号不可用' }, { status: 400 });
      }

      const expiresAt = new Date(Date.now() + SMS_CODE_EXPIRES_MINUTES * 60 * 1000).toISOString();
      await supabaseAdmin.from('sms_verification_codes').insert({
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

    const cooldownTime = new Date(Date.now() - SMS_COOLDOWN_SECONDS * 1000).toISOString();
    const { data: recentCode } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('id, created_at')
      .eq('mobile', mobile)
      .eq('purpose', purpose)
      .gte('created_at', cooldownTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCode) {
      const waitSeconds = Math.ceil(
        SMS_COOLDOWN_SECONDS - (Date.now() - new Date(recentCode.created_at).getTime()) / 1000,
      );
      return NextResponse.json(
        { error: `发送过于频繁，请${waitSeconds}秒后重试`, waitSeconds },
        { status: 429 },
      );
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: hourCount } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('mobile', mobile)
      .gte('created_at', hourAgo);

    if ((hourCount || 0) >= SMS_MAX_PER_HOUR) {
      return NextResponse.json({ error: '发送次数过多，请稍后再试' }, { status: 429 });
    }

    const { count: ipHourCount } = await supabaseAdmin
      .from('sms_verification_codes')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', hourAgo);

    if ((ipHourCount || 0) >= SMS_MAX_PER_HOUR * 3) {
      return NextResponse.json({ error: '当前网络发送次数过多，请稍后再试' }, { status: 429 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + SMS_CODE_EXPIRES_MINUTES * 60 * 1000).toISOString();
    const { error: insertError } = await supabaseAdmin.from('sms_verification_codes').insert({
      mobile,
      code,
      purpose,
      ip_address: ipAddress,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('guidance send-sms-code error:', insertError);
      return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[GUIDANCE-SMS-DEV] Code sent to ${mobile.slice(0, 3)}****${mobile.slice(-4)}`);
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      expiresIn: SMS_CODE_EXPIRES_MINUTES * 60,
      ...(process.env.NODE_ENV === 'development' && { code }),
    });
  } catch (error) {
    console.error('guidance send-sms-code error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
