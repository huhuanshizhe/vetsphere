import { NextRequest } from 'next/server';
import { apiError, apiSuccess, getGuidanceActor } from '@/lib/server/guidance-api';
import { createConsultationQuote } from '@/lib/server/consultation-orders';

type RouteProps = {
  params: Promise<{ id: string }>;
};

function toRequiredNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  const actor = await getGuidanceActor(request);
  if (!actor) {
    return apiError(401, '请先登录后再提交报价。', null);
  }

  if (!actor.canAccessDoctorWorkspace) {
    return apiError(403, '当前账号没有医生工作台访问权限。', null);
  }

  const body = (await request.json()) as {
    quoted_price_amount?: string | number;
    currency_code?: string;
    billing_notes?: string;
    expires_at?: string;
    platform_fee_amount?: string | number;
    expert_payout_amount?: string | number;
  };

  const quotedPriceAmount = toRequiredNumber(body.quoted_price_amount);
  if (quotedPriceAmount === null) {
    return apiError(400, '请填写有效报价金额。', null);
  }

  const platformFeeAmount =
    body.platform_fee_amount === undefined ? null : toRequiredNumber(body.platform_fee_amount);
  const expertPayoutAmount =
    body.expert_payout_amount === undefined ? null : toRequiredNumber(body.expert_payout_amount);

  try {
    const { id } = await params;
    const created = await createConsultationQuote(id, actor, {
      quotedPriceAmount,
      currencyCode: body.currency_code || 'CNY',
      billingNotes: body.billing_notes || null,
      expiresAt: body.expires_at || null,
      platformFeeAmount,
      expertPayoutAmount,
    });

    return apiSuccess(created, '咨询报价已提交。', 201);
  } catch (error) {
    return apiError(500, error instanceof Error ? error.message : '提交咨询报价失败。', null);
  }
}
