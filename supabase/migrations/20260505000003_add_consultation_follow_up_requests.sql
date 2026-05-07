-- =====================================================
-- Migration: Add Consultation Follow-up Requests
-- Date: 2026-05-05
-- Description: Support a single requester follow-up window linked to consultation orders
-- =====================================================

CREATE TABLE IF NOT EXISTS public.consultation_follow_up_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_order_id UUID NOT NULL REFERENCES public.consultation_orders(id) ON DELETE CASCADE,
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question_summary TEXT,
  question_markdown TEXT NOT NULL,
  request_status TEXT NOT NULL DEFAULT 'open'
    CHECK (request_status IN ('open', 'answered', 'closed', 'cancelled')),
  replied_deliverable_id UUID REFERENCES public.consultation_deliverables(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_consultation_follow_up_requests_unique_order
  ON public.consultation_follow_up_requests(consultation_order_id);

CREATE INDEX IF NOT EXISTS idx_consultation_follow_up_requests_status
  ON public.consultation_follow_up_requests(request_status, created_at DESC);

DROP TRIGGER IF EXISTS consultation_follow_up_requests_set_updated_at ON public.consultation_follow_up_requests;
CREATE TRIGGER consultation_follow_up_requests_set_updated_at
  BEFORE UPDATE ON public.consultation_follow_up_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guidance_set_updated_at();

ALTER TABLE public.consultation_follow_up_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.consultation_follow_up_requests IS 'One-time requester follow-up window for delivered consultation orders.';