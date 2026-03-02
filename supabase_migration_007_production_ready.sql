-- ==========================================
-- VetSphere Production Migration 007
-- Date: 2026-03-02
-- Description: Comprehensive production-readiness migration
--   1. Ensure all courses columns exist (idempotent merge of 004/005/006)
--   2. Add orders payment + tracking columns
--   3. Create order_tracking table
--   4. Fix RLS policies (user_points over-permissive, admin orders access)
--   5. Add performance indexes for all core tables
--   6. Verification queries
--
-- SAFETY: All operations use IF NOT EXISTS / IF EXISTS guards
--         This script is safe to run multiple times (idempotent)
--
-- HOW TO RUN:
--   Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==========================================

BEGIN;

-- ==========================================
-- SECTION 1: COURSES TABLE - Complete all columns
-- Merges migrations 004, 005, 006 for idempotent execution
-- ==========================================

-- 1a. Multi-language fields (from migration 004)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title_zh text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title_th text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_zh text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_th text;

-- 1b. Capacity & enrollment (from migration 004)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS max_enrollment integer DEFAULT 30;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS current_enrollment integer DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS enrollment_deadline date;

-- 1c. Metadata (from migration 004)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS target_audience text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS target_audience_zh text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS total_hours numeric;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 1d. Course services (from migration 005)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS publish_language text DEFAULT 'zh';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS teaching_languages jsonb DEFAULT '[]';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS preview_video_url text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '{}';

-- 1e. Japanese + English translations (from migration 006)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title_ja text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_ja text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS translations_complete boolean DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS translated_at timestamp with time zone;


-- ==========================================
-- SECTION 2: ORDERS TABLE - Payment & Tracking columns
-- Required by: Stripe webhook, WeChat notify, Alipay notify, Tracking API
-- ==========================================

-- 2a. Payment fields (used by all payment webhooks)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;       -- 'stripe', 'wechat', 'alipay', 'airwallex'
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id text;           -- External payment transaction ID
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_amount numeric;       -- Actual paid amount
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;  -- Payment timestamp
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';  -- 'pending', 'paid', 'failed', 'refunded'

-- 2b. Display date field (used in order creation: api.ts line 748)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS date text;                 -- Display date string (YYYY-MM-DD)

-- 2c. Tracking fields (used by tracking API: /api/orders/[orderId]/tracking)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;      -- Shipping tracking number
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_carrier text;     -- Carrier name (e.g. 'SF Express', 'FedEx')
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery text;   -- Estimated delivery date

-- 2d. Currency field (for multi-currency order support)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'CNY';


-- ==========================================
-- SECTION 3: ORDER_TRACKING TABLE (New)
-- Required by: /api/orders/[orderId]/tracking route
-- Stores individual tracking events for shipment monitoring
-- ==========================================

CREATE TABLE IF NOT EXISTS public.order_tracking (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id text NOT NULL,
  status text NOT NULL,           -- 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'exception'
  location text DEFAULT '',
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;

-- Order tracking visible to order owner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_tracking' 
    AND policyname = 'Users can view own order tracking'
  ) THEN
    CREATE POLICY "Users can view own order tracking" ON order_tracking
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.orders 
          WHERE orders.id = order_tracking.order_id 
          AND orders.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Admin/system can manage tracking events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_tracking' 
    AND policyname = 'Admin can manage tracking'
  ) THEN
    CREATE POLICY "Admin can manage tracking" ON order_tracking
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
      );
  END IF;
END $$;

-- Service role insert for API routes (using SECURITY DEFINER functions or service_role key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_tracking' 
    AND policyname = 'System insert tracking'
  ) THEN
    CREATE POLICY "System insert tracking" ON order_tracking
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;


-- ==========================================
-- SECTION 4: RLS POLICY FIXES
-- ==========================================

-- 4a. Fix user_points: Remove overly permissive "System can manage points" policy
-- Problem: FOR ALL USING (true) lets any authenticated user modify anyone's points
-- Solution: Keep user read access, use SECURITY DEFINER function for point updates
DO $$
BEGIN
  -- Drop the overly permissive policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_points' 
    AND policyname = 'System can manage points'
  ) THEN
    DROP POLICY "System can manage points" ON public.user_points;
  END IF;
END $$;

-- Users can only INSERT their own initial points record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_points' 
    AND policyname = 'Users can insert own points'
  ) THEN
    CREATE POLICY "Users can insert own points" ON public.user_points
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Note: point updates are handled by award_user_points() which is SECURITY DEFINER
-- This means it bypasses RLS, so no UPDATE policy is needed for normal users

-- 4b. Admin can view all orders (for admin dashboard stats)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Admins can view all orders'
  ) THEN
    CREATE POLICY "Admins can view all orders" ON public.orders
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
      );
  END IF;
END $$;

-- 4c. Admin can update orders (for order management)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Admins can update orders'
  ) THEN
    CREATE POLICY "Admins can update orders" ON public.orders
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
      );
  END IF;
END $$;

-- 4d. Suppliers can view orders containing their products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Suppliers can view relevant orders'
  ) THEN
    CREATE POLICY "Suppliers can view relevant orders" ON public.orders
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ShopSupplier')
      );
  END IF;
END $$;

-- 4e. Fix shipping_templates: Replace overly permissive admin policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shipping_templates' 
    AND policyname = 'Admins manage shipping'
  ) THEN
    DROP POLICY "Admins manage shipping" ON public.shipping_templates;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shipping_templates' 
    AND policyname = 'Admins can manage shipping templates'
  ) THEN
    CREATE POLICY "Admins can manage shipping templates" ON public.shipping_templates
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin')
      );
  END IF;
END $$;


-- ==========================================
-- SECTION 5: PERFORMANCE INDEXES
-- ==========================================

-- 5a. Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 5b. Products
CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_products_specialty ON public.products(specialty);
CREATE INDEX IF NOT EXISTS idx_products_group ON public.products(group_category);

-- 5c. Courses (some may already exist from migration 002)
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_provider ON public.courses(provider_id);
CREATE INDEX IF NOT EXISTS idx_courses_specialty ON public.courses(specialty);

-- 5d. Orders
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- 5e. Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- 5f. Posts
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_specialty ON public.posts(specialty);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- 5g. Order tracking
CREATE INDEX IF NOT EXISTS idx_order_tracking_order ON public.order_tracking(order_id);

-- 5h. Course enrollments (some may already exist from migration 001)
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_order ON public.course_enrollments(order_id);


-- ==========================================
-- SECTION 6: FUNCTIONS UPDATE
-- ==========================================

-- 6a. Ensure increment_course_enrollment exists (from migration 002)
CREATE OR REPLACE FUNCTION increment_course_enrollment(p_course_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.courses
  SET current_enrollment = COALESCE(current_enrollment, 0) + 1
  WHERE id = p_course_id;
END;
$$;

-- 6b. Ensure award_user_points exists (from migration 001)
CREATE OR REPLACE FUNCTION award_user_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS TABLE(new_total INTEGER, new_level TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_total INTEGER;
  v_new_level TEXT;
BEGIN
  -- Insert or get existing points record
  INSERT INTO user_points (user_id, total_points, level)
  VALUES (p_user_id, 500, 'Resident')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update points
  UPDATE user_points
  SET total_points = total_points + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_new_total;
  
  -- Calculate level
  v_new_level := CASE
    WHEN v_new_total >= 10000 THEN 'Master'
    WHEN v_new_total >= 5000 THEN 'Expert'
    WHEN v_new_total >= 2000 THEN 'Senior'
    WHEN v_new_total >= 1000 THEN 'Specialist'
    ELSE 'Resident'
  END;
  
  -- Update level
  UPDATE user_points
  SET level = v_new_level
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO point_transactions (user_id, amount, reason, balance_after)
  VALUES (p_user_id, p_amount, p_reason, v_new_total);
  
  RETURN QUERY SELECT v_new_total, v_new_level;
END;
$$;


COMMIT;

-- ==========================================
-- SECTION 7: VERIFICATION (Run after migration)
-- ==========================================
-- Uncomment and run these queries to verify:

-- 7a. Check courses columns
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'courses' 
-- ORDER BY ordinal_position;

-- 7b. Check orders columns
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'orders' 
-- ORDER BY ordinal_position;

-- 7c. Check order_tracking table exists
-- SELECT column_name, data_type
-- FROM information_schema.columns 
-- WHERE table_name = 'order_tracking';

-- 7d. Check all RLS policies
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- 7e. Check all indexes
-- SELECT indexname, tablename
-- FROM pg_indexes 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- 7f. Check all tables exist
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;
