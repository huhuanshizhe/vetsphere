-- ==========================================
-- VetSphere Refund System Migration 008
-- Date: 2026-03-02
-- Description: Add refunds table and related functionality
--
-- HOW TO RUN:
--   Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==========================================

BEGIN;

-- ==========================================
-- 1. REFUNDS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(id),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  
  -- Refund details
  amount numeric NOT NULL,                    -- Refund amount
  currency text DEFAULT 'CNY',
  reason text NOT NULL,                       -- Customer-provided reason
  status text DEFAULT 'pending',              -- 'pending', 'approved', 'rejected', 'processing', 'completed', 'failed'
  
  -- Original payment info (for processing)
  original_payment_method text,               -- 'stripe', 'alipay', 'wechat', 'airwallex'
  original_payment_id text,                   -- Original transaction ID
  
  -- Refund processing info
  refund_payment_id text,                     -- Refund transaction ID from payment provider
  processed_by uuid REFERENCES auth.users(id), -- Admin who processed
  processed_at timestamp with time zone,
  rejection_reason text,                      -- If rejected, why
  
  -- Items being refunded (partial refund support)
  refund_items jsonb DEFAULT '[]',            -- Array of {itemId, quantity, amount}
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Users can view their own refunds
CREATE POLICY "Users can view own refunds" ON public.refunds
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create refund requests for their orders
CREATE POLICY "Users can create refund requests" ON public.refunds
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_id AND orders.user_id = auth.uid())
  );

-- Admins can view all refunds
CREATE POLICY "Admins can view all refunds" ON public.refunds
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- Admins can update refunds (approve/reject/process)
CREATE POLICY "Admins can update refunds" ON public.refunds
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON public.refunds(created_at DESC);


-- ==========================================
-- 2. UPDATE ORDERS TABLE - Add refund tracking
-- ==========================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_status text;  -- 'none', 'partial', 'full', 'pending'
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refunded_amount numeric DEFAULT 0;


-- ==========================================
-- 3. REFUND STATUS UPDATE TRIGGER
-- ==========================================
CREATE OR REPLACE FUNCTION update_order_refund_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_total numeric;
  v_total_refunded numeric;
BEGIN
  -- Get order total
  SELECT total_amount INTO v_order_total
  FROM public.orders WHERE id = NEW.order_id;
  
  -- Calculate total refunded for this order
  SELECT COALESCE(SUM(amount), 0) INTO v_total_refunded
  FROM public.refunds 
  WHERE order_id = NEW.order_id AND status = 'completed';
  
  -- Update order refund status
  UPDATE public.orders
  SET 
    refunded_amount = v_total_refunded,
    refund_status = CASE
      WHEN v_total_refunded >= v_order_total THEN 'full'
      WHEN v_total_refunded > 0 THEN 'partial'
      WHEN EXISTS (SELECT 1 FROM public.refunds WHERE order_id = NEW.order_id AND status = 'pending') THEN 'pending'
      ELSE 'none'
    END,
    status = CASE
      WHEN v_total_refunded >= v_order_total THEN 'Refunded'
      WHEN v_total_refunded > 0 THEN 'PartialRefund'
      ELSE status
    END
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$;

-- Trigger on refund status change
DROP TRIGGER IF EXISTS trigger_update_order_refund ON public.refunds;
CREATE TRIGGER trigger_update_order_refund
  AFTER INSERT OR UPDATE OF status ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_order_refund_status();


-- ==========================================
-- 4. COURSE ENROLLMENT REFUND HANDLING
-- ==========================================
-- When refund is completed, update course enrollment status
CREATE OR REPLACE FUNCTION handle_course_refund()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when refund is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update course enrollments for this order
    UPDATE public.course_enrollments
    SET 
      payment_status = 'refunded',
      completion_status = 'dropped'
    WHERE order_id = NEW.order_id;
    
    -- Decrement course enrollment counts
    UPDATE public.courses
    SET current_enrollment = GREATEST(0, current_enrollment - 1)
    WHERE id IN (
      SELECT course_id FROM public.course_enrollments WHERE order_id = NEW.order_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_handle_course_refund ON public.refunds;
CREATE TRIGGER trigger_handle_course_refund
  AFTER UPDATE OF status ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION handle_course_refund();


COMMIT;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'refunds';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name LIKE 'refund%';
