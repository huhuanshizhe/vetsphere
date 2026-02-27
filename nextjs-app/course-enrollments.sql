-- VetSphere Course Enrollments Schema
-- Execute this in Supabase Dashboard > SQL Editor

-- 1. Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  enrollment_date TIMESTAMPTZ DEFAULT NOW(),
  completion_status TEXT DEFAULT 'enrolled' CHECK (completion_status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
  certificate_issued BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- 2. Enable RLS
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can view their own enrollments
CREATE POLICY "Users can view own enrollments" 
  ON course_enrollments FOR SELECT 
  USING (auth.uid() = user_id);

-- System/Service can insert enrollments (from checkout)
CREATE POLICY "System can insert enrollments" 
  ON course_enrollments FOR INSERT 
  WITH CHECK (true);

-- System can update enrollments (payment status, completion)
CREATE POLICY "System can update enrollments" 
  ON course_enrollments FOR UPDATE 
  USING (true);

-- Course providers can view enrollments for their courses
CREATE POLICY "Providers can view course enrollments"
  ON course_enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c 
      WHERE c.id = course_enrollments.course_id 
      AND c.provider_id = auth.uid()
    )
  );

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_payment_status ON course_enrollments(payment_status);

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_enrollment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enrollment_updated_at
  BEFORE UPDATE ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_enrollment_updated_at();

-- 6. Add provider_id to courses if not exists (for RLS policy)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'provider_id'
  ) THEN
    ALTER TABLE courses ADD COLUMN provider_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Done! Verify with:
-- SELECT * FROM course_enrollments LIMIT 5;
