-- =====================================================
-- Migration: Create Remote Guidance Core Tables
-- Date: 2026-04-16
-- Description: Core data model for surgery remote guidance
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.guidance_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.guidance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_no TEXT NOT NULL UNIQUE,
  site_code TEXT NOT NULL DEFAULT 'cn',
  title TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'live_guidance'
    CHECK (session_type IN ('live_guidance', 'case_discussion', 'teaching_demo')),
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('draft', 'requested', 'triaged', 'expert_assigned', 'scheduled', 'ready', 'live', 'paused', 'ended', 'archived', 'cancelled')),
  room_status TEXT NOT NULL DEFAULT 'provisioning'
    CHECK (room_status IN ('provisioning', 'open', 'active', 'closing', 'closed', 'failed')),
  priority TEXT NOT NULL DEFAULT 'routine'
    CHECK (priority IN ('routine', 'urgent', 'critical')),
  surgeon_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assistant_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_expert_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_expert_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_consultation_id UUID,
  related_record_id UUID,
  related_order_id UUID,
  hospital_name TEXT,
  department_name TEXT,
  operating_room_name TEXT,
  patient_species TEXT,
  patient_identifier TEXT,
  procedure_name TEXT,
  clinical_summary TEXT,
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  actual_started_at TIMESTAMPTZ,
  actual_ended_at TIMESTAMPTZ,
  rtc_provider TEXT NOT NULL DEFAULT 'livekit'
    CHECK (rtc_provider IN ('livekit', 'daily', 'twilio', 'custom')),
  rtc_room_name TEXT,
  rtc_room_sid TEXT,
  primary_recording_id UUID,
  consent_confirmed BOOLEAN NOT NULL DEFAULT false,
  confidentiality_level TEXT NOT NULL DEFAULT 'restricted'
    CHECK (confidentiality_level IN ('restricted', 'highly_restricted', 'teaching_approved')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.guidance_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.guidance_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_role TEXT NOT NULL
    CHECK (participant_role IN ('surgeon', 'assistant', 'expert', 'observer', 'moderator', 'admin')),
  invite_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (invite_status IN ('pending', 'accepted', 'declined', 'revoked')),
  join_permission BOOLEAN NOT NULL DEFAULT true,
  can_publish_audio BOOLEAN NOT NULL DEFAULT false,
  can_publish_video BOOLEAN NOT NULL DEFAULT false,
  can_send_message BOOLEAN NOT NULL DEFAULT false,
  can_annotate BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  join_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.guidance_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.guidance_sessions(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL
    CHECK (device_type IN ('mobile_camera', 'or_camera', 'endoscope_capture', 'ultrasound_capture', 'vitals_feed', 'desktop_share')),
  device_name TEXT NOT NULL,
  stream_label TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  source_protocol TEXT NOT NULL DEFAULT 'webrtc'
    CHECK (source_protocol IN ('webrtc', 'rtmp', 'whip')),
  status TEXT NOT NULL DEFAULT 'offline'
    CHECK (status IN ('offline', 'ready', 'live', 'error')),
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guidance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.guidance_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'session_requested',
      'session_updated',
      'session_cancelled',
      'expert_assigned',
      'participant_invited',
      'room_opened',
      'room_token_requested',
      'participant_joined',
      'participant_left',
      'network_warning',
      'snapshot_taken',
      'annotation_added',
      'recording_started',
      'recording_stopped',
      'session_paused',
      'session_resumed',
      'session_ended'
    )),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guidance_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.guidance_sessions(id) ON DELETE CASCADE,
  provider_recording_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'starting', 'recording', 'stopped', 'processing', 'ready', 'failed', 'expired')),
  storage_bucket TEXT,
  storage_path TEXT,
  playback_url TEXT,
  download_url TEXT,
  duration_seconds INTEGER,
  size_bytes BIGINT,
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  retention_until TIMESTAMPTZ,
  checksum TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guidance_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.guidance_sessions(id) ON DELETE CASCADE,
  recording_id UUID REFERENCES public.guidance_recordings(id) ON DELETE SET NULL,
  annotation_type TEXT NOT NULL
    CHECK (annotation_type IN ('snapshot', 'timeline_marker', 'text_note', 'risk_flag')),
  author_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  author_role TEXT NOT NULL,
  timestamp_seconds INTEGER,
  image_path TEXT,
  title TEXT,
  content TEXT,
  severity TEXT
    CHECK (severity IS NULL OR severity IN ('info', 'warning', 'critical')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guidance_expert_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  availability_type TEXT NOT NULL DEFAULT 'available'
    CHECK (availability_type IN ('available', 'busy', 'on_call')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_at > start_at)
);

CREATE TABLE IF NOT EXISTS public.guidance_access_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.guidance_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL
    CHECK (action IN ('view_live', 'view_recording', 'download_recording', 'export_summary')),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.guidance_sessions
  DROP CONSTRAINT IF EXISTS guidance_sessions_primary_recording_fk;

ALTER TABLE public.guidance_sessions
  ADD CONSTRAINT guidance_sessions_primary_recording_fk
  FOREIGN KEY (primary_recording_id)
  REFERENCES public.guidance_recordings(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_guidance_sessions_room_name
  ON public.guidance_sessions(rtc_room_name)
  WHERE rtc_room_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_guidance_sessions_status
  ON public.guidance_sessions(status, scheduled_start_at DESC);

CREATE INDEX IF NOT EXISTS idx_guidance_sessions_surgeon
  ON public.guidance_sessions(surgeon_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guidance_sessions_expert
  ON public.guidance_sessions(assigned_expert_user_id, scheduled_start_at DESC);

CREATE INDEX IF NOT EXISTS idx_guidance_participants_user
  ON public.guidance_participants(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guidance_devices_session
  ON public.guidance_devices(session_id, is_primary DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guidance_events_session_time
  ON public.guidance_events(session_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_guidance_events_type
  ON public.guidance_events(event_type, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_guidance_recordings_session
  ON public.guidance_recordings(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guidance_annotations_session
  ON public.guidance_annotations(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guidance_access_audits_session
  ON public.guidance_access_audits(session_id, created_at DESC);

DROP TRIGGER IF EXISTS guidance_sessions_set_updated_at ON public.guidance_sessions;
CREATE TRIGGER guidance_sessions_set_updated_at
  BEFORE UPDATE ON public.guidance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.guidance_set_updated_at();

DROP TRIGGER IF EXISTS guidance_recordings_set_updated_at ON public.guidance_recordings;
CREATE TRIGGER guidance_recordings_set_updated_at
  BEFORE UPDATE ON public.guidance_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.guidance_set_updated_at();

DROP TRIGGER IF EXISTS guidance_expert_availability_set_updated_at ON public.guidance_expert_availability;
CREATE TRIGGER guidance_expert_availability_set_updated_at
  BEFORE UPDATE ON public.guidance_expert_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.guidance_set_updated_at();

ALTER TABLE public.guidance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidance_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidance_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidance_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidance_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidance_expert_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guidance_access_audits ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.guidance_sessions IS 'Remote guidance sessions for surgery collaboration and post-op review.';
COMMENT ON TABLE public.guidance_participants IS 'Users invited to or participating in a remote guidance session.';
COMMENT ON TABLE public.guidance_devices IS 'Camera and device feeds bound to a remote guidance session.';
COMMENT ON TABLE public.guidance_events IS 'Immutable event timeline for session operations and media lifecycle.';
COMMENT ON TABLE public.guidance_recordings IS 'Recording files and transcoding results for remote guidance sessions.';
COMMENT ON TABLE public.guidance_annotations IS 'Snapshots, markers, and notes created during or after a guidance session.';
COMMENT ON TABLE public.guidance_expert_availability IS 'Expert scheduling window for later dispatch and on-call workflows.';
COMMENT ON TABLE public.guidance_access_audits IS 'High-sensitivity access audit records for live or recorded surgery content.';
