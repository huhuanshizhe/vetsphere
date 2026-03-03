/**
 * 优惠券 API
 * GET /api/coupons - 获取可用优惠券列表
 * POST /api/coupons/verify - 验证优惠券
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

    const now = new Date().toISOString();

    // 获取公开可用的优惠券
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gte.${now}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('查询优惠券失败:', error);
      return apiResponse(500, '查询失败');
    }

    // 过滤已用完的优惠券和超出用户限制的
    const { data: userUsage } = await supabase
      .from('coupon_usages')
      .select('coupon_id')
      .eq('user_id', user.id);

    const userCouponUsage: Record<string, number> = {};
    userUsage?.forEach(u => {
      userCouponUsage[u.coupon_id] = (userCouponUsage[u.coupon_id] || 0) + 1;
    });

    const availableCoupons = (coupons || []).filter(coupon => {
      // 检查总使用次数
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        return false;
      }
      // 检查用户使用次数
      if (coupon.per_user_limit && userCouponUsage[coupon.id] >= coupon.per_user_limit) {
        return false;
      }
      return true;
    }).map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      min_amount: coupon.min_amount,
      max_discount: coupon.max_discount,
      end_at: coupon.end_at,
      description: getCouponDescription(coupon),
    }));

    return apiResponse(200, '查询成功', availableCoupons);

  } catch (error) {
    console.error('优惠券列表API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, amount, product_ids } = body;

    if (!code) {
      return apiResponse(400, '请输入优惠码');
    }

    // 获取用户信息（可选）
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const now = new Date().toISOString();

    // 查找优惠券
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error || !coupon) {
      return apiResponse(400, '优惠码无效或不存在');
    }

    // 验证有效期
    if (coupon.start_at && new Date(coupon.start_at) > new Date()) {
      return apiResponse(400, '优惠券尚未生效');
    }
    if (coupon.end_at && new Date(coupon.end_at) < new Date()) {
      return apiResponse(400, '优惠券已过期');
    }

    // 验证使用次数
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return apiResponse(400, '优惠券已被领完');
    }

    // 验证用户使用次数
    if (userId && coupon.per_user_limit) {
      const { count } = await supabase
        .from('coupon_usages')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId);

      if (count && count >= coupon.per_user_limit) {
        return apiResponse(400, '您已达到此优惠券的使用上限');
      }
    }

    // 验证最低消费
    if (coupon.min_amount && amount && amount < coupon.min_amount) {
      return apiResponse(400, `订单金额需满 ¥${coupon.min_amount} 才能使用`);
    }

    // 计算优惠金额
    let discountAmount = 0;
    if (coupon.type === 'fixed') {
      discountAmount = coupon.value;
    } else if (coupon.type === 'percentage') {
      discountAmount = amount ? (amount * coupon.value / 100) : 0;
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount;
      }
    }

    return apiResponse(200, '优惠券有效', {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        min_amount: coupon.min_amount,
        max_discount: coupon.max_discount,
      },
      discount_amount: Math.round(discountAmount * 100) / 100,
      final_amount: amount ? Math.max(0, amount - discountAmount) : null,
    });

  } catch (error) {
    console.error('验证优惠券API错误:', error);
    return apiResponse(500, '服务器内部错误');
  }
}

function getCouponDescription(coupon: any): string {
  let desc = '';
  
  if (coupon.type === 'fixed') {
    desc = `立减 ¥${coupon.value}`;
  } else {
    desc = `${coupon.value}% 折扣`;
    if (coupon.max_discount) {
      desc += `，最高减 ¥${coupon.max_discount}`;
    }
  }
  
  if (coupon.min_amount) {
    desc += `，满 ¥${coupon.min_amount} 可用`;
  }
  
  return desc;
}
