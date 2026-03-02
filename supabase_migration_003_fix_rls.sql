-- Migration 003: Fix courses table RLS policies
-- Issue: Empty error object {} when CourseProvider tries to insert courses
-- Root cause: Conflicting or incorrectly configured RLS policies
-- Date: 2026-03-01

-- ==========================================
-- STEP 1: Drop all existing courses policies
-- ==========================================
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Providers can manage own courses" ON courses;
DROP POLICY IF EXISTS "Providers can insert courses" ON courses;
DROP POLICY IF EXISTS "Providers can update own courses" ON courses;
DROP POLICY IF EXISTS "Providers can delete own courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage all courses" ON courses;

-- ==========================================
-- STEP 2: Create correct separated policies
-- ==========================================

-- SELECT: Anyone can view all courses
CREATE POLICY "Anyone can view courses" ON courses 
FOR SELECT USING (true);

-- INSERT: CourseProvider can insert their own courses
-- Uses WITH CHECK for INSERT operations
CREATE POLICY "Providers can insert courses" ON courses 
FOR INSERT WITH CHECK (auth.uid() = provider_id);

-- UPDATE: CourseProvider can update their own courses
CREATE POLICY "Providers can update own courses" ON courses 
FOR UPDATE USING (auth.uid() = provider_id);

-- DELETE: CourseProvider can delete their own courses
CREATE POLICY "Providers can delete own courses" ON courses 
FOR DELETE USING (auth.uid() = provider_id);

-- ALL: Admins can manage all courses
CREATE POLICY "Admins can manage all courses" ON courses 
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'Admin')
);

-- ==========================================
-- VERIFICATION: Check policies were created
-- ==========================================
-- Run this to verify:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'courses';
