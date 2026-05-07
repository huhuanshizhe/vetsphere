-- =====================================================
-- Migration: Create Consultation Domain Tables
-- Date: 2026-05-05
-- Description: Add paid consultation order flow linked to case records
-- =====================================================

CREATE TABLE IF NOT EXISTS public.consultation_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  site_code TEXT NOT NULL DEFAULT 'cn',
  case_id UUID NOT NULL REFERENCES public.case_records(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  consultation_type TEXT NOT NULL DEFAULT 'case_plan'
    CHECK (consultation_type IN ('case_plan', 'second_opinion', 'follow_up')),
  order_status TEXT NOT NULL DEFAULT 'requested'
    CHECK (order_status IN ('draft', 'requested', 'quoted', 'paid', 'in_progress', 'delivered', 'closed', 'cancelled', 'refunded')),
  pricing_mode TEXT NOT NULL DEFAULT 'fixed_package'
    CHECK (pricing_mode IN ('fixed_package', 'subscription_overage')),
  requester_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  requested_expert_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_expert_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  currency_code TEXT NOT NULL DEFAULT 'CNY',
  requested_budget_amount NUMERIC(10,2),
  quoted_price_amount NUMERIC(10,2),
  paid_amount NUMERIC(10,2),
  desired_response_at TIMESTAMPTZ,
  delivery_due_at TIMESTAMPTZ,
  question_summary TEXT NOT NULL,
  confidentiality_level TEXT NOT NULL DEFAULT 'restricted'
    CHECK (confidentiality_level IN ('restricted', 'highly_restricted', 'teaching_approved')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.consultation_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_order_id UUID NOT NULL REFERENCES public.consultation_orders(id) ON DELETE CASCADE,
  quote_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (quote_status IN ('pending', 'offered', 'accepted', 'rejected', 'expired')),
  quoted_price_amount NUMERIC(10,2) NOT NULL CHECK (quoted_price_amount >= 0),
  currency_code TEXT NOT NULL DEFAULT 'CNY',
  platform_fee_amount NUMERIC(10,2),
  expert_payout_amount NUMERIC(10,2),
  billing_notes TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.consultation_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_order_id UUID NOT NULL REFERENCES public.consultation_orders(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL DEFAULT 'structured_plan'
    CHECK (deliverable_type IN ('structured_plan', 'follow_up_reply')),
  deliverable_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (deliverable_status IN ('pending', 'submitted', 'revised', 'approved')),
  summary TEXT,
  content_markdown TEXT,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultation_orders_requester
  ON public.consultation_orders(requester_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_orders_case
  ON public.consultation_orders(case_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_orders_status
  ON public.consultation_orders(order_status, desired_response_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_quotes_order
  ON public.consultation_quotes(consultation_order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_deliverables_order
  ON public.consultation_deliverables(consultation_order_id, created_at DESC);

DROP TRIGGER IF EXISTS consultation_orders_set_updated_at ON public.consultation_orders;
CREATE TRIGGER consultation_orders_set_updated_at
  BEFORE UPDATE ON public.consultation_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.guidance_set_updated_at();

DROP TRIGGER IF EXISTS consultation_quotes_set_updated_at ON public.consultation_quotes;
CREATE TRIGGER consultation_quotes_set_updated_at
  BEFORE UPDATE ON public.consultation_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.guidance_set_updated_at();

DROP TRIGGER IF EXISTS consultation_deliverables_set_updated_at ON public.consultation_deliverables;
CREATE TRIGGER consultation_deliverables_set_updated_at
  BEFORE UPDATE ON public.consultation_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.guidance_set_updated_at();

ALTER TABLE public.consultation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_deliverables ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.guidance_sessions
  DROP CONSTRAINT IF EXISTS guidance_sessions_related_consultation_fk;

ALTER TABLE public.guidance_sessions
  ADD CONSTRAINT guidance_sessions_related_consultation_fk
  FOREIGN KEY (related_consultation_id)
  REFERENCES public.consultation_orders(id)
  ON DELETE SET NULL;

COMMENT ON TABLE public.consultation_orders IS 'Paid expert consultation orders linked to a shared case record.';
COMMENT ON TABLE public.consultation_quotes IS 'Pricing offers and billing metadata for consultation orders.';
COMMENT ON TABLE public.consultation_deliverables IS 'Structured expert outputs and follow-up replies for consultation orders.';