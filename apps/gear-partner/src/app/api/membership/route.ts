/**
 * 会员信息 API
 * GET /api/membership - 获取当前用户会员信息
 * POST /api/membership - 开通/续费会员
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function apiResponse<T>(code: number, message: string, data?: T) {
  return NextResponse.json({
    code,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

// 会员套餐配置
const MEMBERSHIP_PLANS = {
  monthly: {
    name: '月度会员',
    price: 29.9,
    duration_days: 30,
  },
  quarterly: {
    name: '季度会员',
    price: 79.9,
    duration_days: 90,
  },
  yearly: {
    name: '年度会员',
    price: 299,
    duration_days: 365,
  },
  lifetime: {
    name: '终身会员',
    price: 999,
    duration_days: null, // 永久
  },
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return apiResponse(401, '请先登录');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return apiResponse(401, '认证失败');
    }

    // 获取当前有效会员
    const { data: membership, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('查询会员信息失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 计算剩余天数
    let daysRemaining = null;
    let isExpired = false;
    
    if (membership) {
      if (membership.end_date) {
        const endDate = new Date(membership.end_date);
        const now = new Date();
        daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        isExpired = daysRemaining <= 0;
      } else {
        // 终身会员
        daysRemaining = -1; // 表示永久
      }
    }

    // 获取会员权益
    const benefits = [
      { name: '全站课程免费学', enabled: true },
      { name: '专属会员内容', enabled: true },
      { name: 'AI助手无限使用', enabled: true },
      { name: '优先客服支持', enabled: true },
      { name: '会员专属活动', enabled: true },
    ];

    return apiResponse(200, '查询成功', {
      is_member: !!membership && !isExpired,
      membership: membership ? {
        ...membership,
        plan_name: MEMBERSHIP_PLANS[membership.plan_type as keyof typeof MEMBERSHIP_PLANS]?.name,
        days_remaining: daysRemaining,
        is_expired: isExpired,
      } : null,
      benefits,
      plans: Object.entries(MEMBERSHIP_PLANS).map(([key, value]) => ({
        type: key,
        ...value,
      })),
    });

  } catch (error) {
    console.error('会员信息API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return apiResponse(401, '请先登录');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return apiResponse(401, '认证失败');
    }

    const body = await request.json();
    const { plan_type, payment_method } = body;

    if (!plan_type || !MEMBERSHIP_PLANS[plan_type as keyof typeof MEMBERSHIP_PLANS]) {
      return apiResponse(400, '无效的会员套餐');
    }

    const plan = MEMBERSHIP_PLANS[plan_type as keyof typeof MEMBERSHIP_PLANS];

    // 检查是否已有活跃会员
    const { data: existingMembership } = await supabase
      .from('memberships')
      .select('id, end_date')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .single();

    // 计算开始和结束日期
    let startDate = new Date();
    if (existingMembership?.end_date) {
      // 续费，从当前会员结束日期开始
      startDate = new Date(existingMembership.end_date);
    }

    let endDate = null;
    if (plan.duration_days) {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plan.duration_days);
    }

    // 创建会员记录
    const { data: membership, error } = await supabase
      .from('memberships')
      .insert({
        user_id: user.id,
        plan_type,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate?.toISOString(),
        auto_renew: plan_type !== 'lifetime',
        payment_method,
      })
      .select()
      .single();

    if (error) {
      console.error('创建会员记录失败:', error);
      return apiResponse(500, '开通失败');
    }

    // 更新用户会员状态
    await supabase
      .from('profiles')
      .update({ is_member: true })
      .eq('id', user.id);

    return apiResponse(200, '会员开通成功', {
      membership,
      plan_name: plan.name,
      message: existingMembership ? '续费成功' : '开通成功',
    });

  } catch (error) {
    console.error('开通会员API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}
