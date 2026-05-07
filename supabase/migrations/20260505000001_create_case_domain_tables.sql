-- =====================================================
-- Migration: Create Case Domain Tables
-- Date: 2026-05-05
-- Description: Add case-centric records for guidance-first intake
-- =====================================================

CREATE TABLE IF NOT EXISTS public.case_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_no TEXT NOT NULL UNIQUE,
  site_code TEXT NOT NULL DEFAULT 'cn',
  case_title TEXT NOT NULL,
  case_status TEXT NOT NULL DEFAULT 'intake'
    CHECK (case_status IN ('intake', 'consulting', 'scheduled_for_guidance', 'in_guidance', 'follow_up', 'archived')),
  origin_type TEXT NOT NULL DEFAULT 'guidance'
    CHECK (origin_type IN ('guidance', 'consultation', 'community')),
  patient_species TEXT,
  patient_identifier TEXT,
  procedure_name TEXT,
  hospital_name TEXT,
  department_name TEXT,
  clinical_summary TEXT,
  confidentiality_level TEXT NOT NULL DEFAULT 'restricted'
    CHECK (confidentiality_level IN ('restricted', 'highly_restricted', 'teaching_approved')),
  consent_confirmed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.case_access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.case_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_role TEXT NOT NULL
    CHECK (access_role IN ('owner', 'surgeon', 'assistant', 'expert', 'moderator', 'admin', 'viewer')),
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_manage_participants BOOLEAN NOT NULL DEFAULT false,
  can_export BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_case_records_owner
  ON public.case_records(owner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_records_site_status
  ON public.case_records(site_code, case_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_case_access_policies_user
  ON public.case_access_policies(user_id, created_at DESC);

DROP TRIGGER IF EXISTS case_records_set_updated_at ON public.case_records;
CREATE TRIGGER case_records_set_updated_at
  BEFORE UPDATE ON public.case_records
  FOR EACH ROW
  EXECUTE FUNCTION public.guidance_set_updated_at();

DROP TRIGGER IF EXISTS case_access_policies_set_updated_at ON public.case_access_policies;
CREATE TRIGGER case_access_policies_set_updated_at
  BEFORE UPDATE ON public.case_access_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.guidance_set_updated_at();

ALTER TABLE public.case_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_access_policies ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.guidance_sessions
  DROP CONSTRAINT IF EXISTS guidance_sessions_related_record_fk;

ALTER TABLE public.guidance_sessions
  ADD CONSTRAINT guidance_sessions_related_record_fk
  FOREIGN KEY (related_record_id)
  REFERENCES public.case_records(id)
  ON DELETE SET NULL;

COMMENT ON TABLE public.case_records IS 'Case-centric record shared across consultation, guidance, and community workflows.';
COMMENT ON TABLE public.case_access_policies IS 'Resource-level access rules for case records.';
