-- Migration: AI Sales Chat System
-- Description: Create tables for AI conversation sessions and messages
-- Date: 2026-06-08

BEGIN;

-- ============================================================================
-- 1. AI Conversation Sessions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Visitor identification (supports anonymous)
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Session metadata
  title TEXT,
  source_page TEXT,
  source_products TEXT[] DEFAULT '{}',
  
  -- Lead information (extracted from conversation)
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,
  lead_clinic TEXT,
  lead_country TEXT,
  lead_budget TEXT,
  lead_intent TEXT,
  lead_captured BOOLEAN DEFAULT FALSE,
  
  -- Related inquiry
  inquiry_id UUID,
  
  -- Statistics
  message_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active',
  closed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT ai_conversation_sessions_status_chk CHECK (
    status IN ('active', 'closed', 'converted')
  )
);

-- Indexes
CREATE INDEX idx_ai_sessions_visitor ON ai_conversation_sessions(visitor_id);
CREATE INDEX idx_ai_sessions_user ON ai_conversation_sessions(user_id);
CREATE INDEX idx_ai_sessions_status ON ai_conversation_sessions(status);
CREATE INDEX idx_ai_sessions_lead ON ai_conversation_sessions(lead_captured) WHERE lead_captured = FALSE;
CREATE INDEX idx_ai_sessions_created ON ai_conversation_sessions(created_at DESC);

-- ============================================================================
-- 2. AI Conversation Messages Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_conversation_sessions(id) ON DELETE CASCADE,
  
  -- Message content
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- AI metadata
  model_used TEXT,
  tokens_used INTEGER,
  
  -- Action markers
  action_type TEXT,
  action_data JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT ai_conversation_messages_role_chk CHECK (
    role IN ('user', 'assistant', 'system')
  ),
  CONSTRAINT ai_conversation_messages_action_chk CHECK (
    action_type IS NULL OR action_type IN (
      'lead_form_shown', 'lead_captured', 'product_recommended', 
      'course_recommended', 'inquiry_created'
    )
  )
);

-- Indexes
CREATE INDEX idx_ai_messages_session ON ai_conversation_messages(session_id);
CREATE INDEX idx_ai_messages_created ON ai_conversation_messages(session_id, created_at);

-- ============================================================================
-- 3. Extend inquiry_requests table
-- ============================================================================

-- Note: inquiry_requests table should already exist from migration 010/011
-- We add new columns to link with AI conversations

ALTER TABLE inquiry_requests 
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES ai_conversation_sessions(id) ON DELETE SET NULL;

ALTER TABLE inquiry_requests 
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;

-- Index for AI-generated inquiries
CREATE INDEX idx_inquiry_requests_conversation ON inquiry_requests(conversation_id);
CREATE INDEX idx_inquiry_requests_ai ON inquiry_requests(ai_generated) WHERE ai_generated = TRUE;

-- ============================================================================
-- 4. Update Trigger for updated_at
-- ============================================================================

-- Reuse existing function if available, otherwise create it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to ai_conversation_sessions
DROP TRIGGER IF EXISTS update_ai_conversation_sessions_updated_at ON ai_conversation_sessions;
CREATE TRIGGER update_ai_conversation_sessions_updated_at
  BEFORE UPDATE ON ai_conversation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE ai_conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_messages ENABLE ROW LEVEL SECURITY;

-- ai_conversation_sessions policies
DROP POLICY IF EXISTS "Anyone can insert own sessions" ON ai_conversation_sessions;
CREATE POLICY "Anyone can insert own sessions"
  ON ai_conversation_sessions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own sessions" ON ai_conversation_sessions;
CREATE POLICY "Users can view own sessions"
  ON ai_conversation_sessions FOR SELECT
  USING (auth.uid() = user_id OR visitor_id IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage all sessions" ON ai_conversation_sessions;
CREATE POLICY "Admins can manage all sessions"
  ON ai_conversation_sessions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ai_conversation_messages policies
DROP POLICY IF EXISTS "Anyone can insert messages" ON ai_conversation_messages;
CREATE POLICY "Anyone can insert messages"
  ON ai_conversation_messages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own messages" ON ai_conversation_messages;
CREATE POLICY "Users can view own messages"
  ON ai_conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversation_sessions 
      WHERE id = ai_conversation_messages.session_id 
      AND (auth.uid() = user_id OR visitor_id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "Admins can manage all messages" ON ai_conversation_messages;
CREATE POLICY "Admins can manage all messages"
  ON ai_conversation_messages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

COMMIT;
