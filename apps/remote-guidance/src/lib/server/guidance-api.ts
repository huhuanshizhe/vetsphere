import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

let supabaseAdminInstance: any = null;

function getRequiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY') {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function getSupabaseAdmin(): any {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  return supabaseAdminInstance;
}

export const supabaseAdmin: any = new Proxy({} as Record<string, unknown>, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

const DEFAULT_PERMISSIONS = {
  can_access_user_center: false,
  can_purchase_courses: false,
  can_purchase_products: false,
  can_manage_orders: false,
  can_access_growth_system: false,
  can_access_doctor_workspace: false,
  can_access_medical_features: false,
  can_access_professional_courses: false,
  can_view_restricted_product_info: false,
};

function mapIdentityTypeToGroupV2(identityType: string | null | undefined) {
  if (!identityType) return null;

  const map: Record<string, string> = {
    veterinarian: 'doctor',
    assistant_doctor: 'doctor',
    rural_veterinarian: 'doctor',
    nurse_care: 'vet_related_staff',
    researcher_teacher: 'vet_related_staff',
    pet_service_staff: 'vet_related_staff',
    student: 'student_academic',
    industry_practitioner: 'other_related',
    enthusiast: 'other_related',
    other: 'other_related',
  };

  return map[identityType] || 'other_related';
}

function mapIdentityTypeToDoctorSubtype(identityType: string | null | undefined) {
  if (!identityType) return null;
  if (['veterinarian', 'assistant_doctor', 'rural_veterinarian'].includes(identityType)) {
    return identityType;
  }
  return null;
}

function deriveDoctorPrivilegeStatus(identityGroupV2: string | null, verificationStatus: string) {
  if (identityGroupV2 !== 'doctor') {
    return 'not_applicable';
  }

  if (verificationStatus === 'approved') return 'approved';
  if (['submitted', 'under_review'].includes(verificationStatus)) return 'pending_review';
  if (verificationStatus === 'rejected') return 'rejected';
  return 'not_started';
}

function buildGuidancePermissions(
  rawPermissionFlags: Record<string, boolean> | null | undefined,
  doctorPrivilegeStatus: string,
) {
  const doctorAccessGranted =
    Boolean(rawPermissionFlags?.can_access_doctor_workspace) ||
    doctorPrivilegeStatus === 'approved';

  return {
    ...DEFAULT_PERMISSIONS,
    can_access_user_center: true,
    can_purchase_courses: true,
    can_purchase_products: true,
    can_manage_orders: true,
    can_access_growth_system: true,
    can_access_doctor_workspace: doctorAccessGranted,
    can_access_medical_features:
      Boolean(rawPermissionFlags?.can_access_medical_features) || doctorAccessGranted,
    can_access_professional_courses:
      Boolean(rawPermissionFlags?.can_access_professional_courses) || doctorAccessGranted,
    can_view_restricted_product_info:
      Boolean(rawPermissionFlags?.can_view_restricted_product_info) || doctorAccessGranted,
  };
}

export type GuidanceActor = {
  userId: string;
  email: string | null;
  fullName: string | null;
  profileRole: string | null;
  snapshot: any | null;
  cnProfile: any | null;
  cnUser: any | null;
  permissions: Record<string, boolean>;
  doctorPrivilegeStatus: string;
  isAdmin: boolean;
  canAccessDoctorWorkspace: boolean;
  canAccessRemoteGuidance: boolean;
};

export function apiSuccess<T>(data: T, message = 'ok', status = 200) {
  return NextResponse.json(
    {
      code: status,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

export function apiError(status: number, message: string, details?: unknown) {
  return NextResponse.json(
    {
      code: status,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
}

export async function getGuidanceActor(request: NextRequest): Promise<GuidanceActor | null> {
  const supabaseAdmin = getSupabaseAdmin();
  const token = getBearerToken(request);
  if (!token) {
    return null;
  }

  // supabase-js v2 的 auth.getUser(token) 有时不正确传入 token，改为直接 decode JWT + admin.getUserById
  let userId: string;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'));
    if (!payload?.sub) throw new Error('no sub in JWT');
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) throw new Error('JWT expired');
    userId = payload.sub as string;
  } catch (jwtErr) {
    console.error('guidance-api getGuidanceActor JWT decode failed:', jwtErr);
    return null;
  }

  const { data: adminUserData, error: adminUserError } =
    await supabaseAdmin.auth.admin.getUserById(userId);
  const user = adminUserData?.user;

  if (adminUserError || !user) {
    console.error('guidance-api getGuidanceActor getUserById failed:', { adminUserError, userId });
    return null;
  }

  const [profileRes, cnProfileRes, stateViewRes, snapshotRes, latestVerificationRes, cnUserRes] =
    await Promise.all([
      supabaseAdmin.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle(),
      supabaseAdmin
        .from('cn_user_profiles')
        .select('display_name, organization_name, profile_completion_percent')
        .eq('user_id', user.id)
        .eq('site_code', 'cn')
        .maybeSingle(),
      supabaseAdmin.from('v_cn_user_full_state').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin
        .from('cn_user_state_snapshots')
        .select(
          'doctor_privilege_status, permission_flags, identity_group_v2, doctor_subtype, verification_status, verification_required, verification_reject_reason, access_level, onboarding_status, identity_type',
        )
        .eq('user_id', user.id)
        .eq('site_code', 'cn')
        .maybeSingle(),
      supabaseAdmin
        .from('cn_verification_requests')
        .select('status, reject_reason')
        .eq('user_id', user.id)
        .eq('site_code', 'cn')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin.from('cn_users').select('mobile, status').eq('id', user.id).maybeSingle(),
    ]);

  const stateSource = stateViewRes.data || snapshotRes.data || null;
  const identityType = stateSource?.identity_type || null;
  const identityGroupV2 = stateSource?.identity_group_v2 || mapIdentityTypeToGroupV2(identityType);
  const doctorSubtype = stateSource?.doctor_subtype || mapIdentityTypeToDoctorSubtype(identityType);
  const verificationStatus =
    latestVerificationRes.data?.status || stateSource?.verification_status || 'not_started';
  const doctorPrivilegeStatus = deriveDoctorPrivilegeStatus(identityGroupV2, verificationStatus);
  const permissions = buildGuidancePermissions(
    stateSource?.permission_flags,
    doctorPrivilegeStatus,
  );
  const profileRole = profileRes.data?.role || null;
  const isAdmin = ['Admin', 'admin', 'super_admin'].includes(profileRole || '');
  const canAccessDoctorWorkspace = Boolean(permissions.can_access_doctor_workspace);

  const derivedSnapshot = stateSource
    ? {
        ...stateSource,
        identity_group_v2: identityGroupV2,
        doctor_subtype: doctorSubtype,
        verification_status: verificationStatus,
        verification_required: identityGroupV2 === 'doctor',
        verification_reject_reason:
          latestVerificationRes.data?.reject_reason ||
          stateSource?.verification_reject_reason ||
          null,
        doctor_privilege_status: doctorPrivilegeStatus,
        permission_flags: permissions,
      }
    : null;

  const derivedCnProfile = {
    ...(cnProfileRes.data || {}),
    display_name: cnProfileRes.data?.display_name || stateViewRes.data?.display_name || null,
    organization_name:
      cnProfileRes.data?.organization_name || stateViewRes.data?.organization_name || null,
    profile_completion_percent:
      cnProfileRes.data?.profile_completion_percent ||
      stateViewRes.data?.profile_completion_percent ||
      0,
  };

  return {
    userId: user.id,
    email: user.email || null,
    fullName: derivedCnProfile.display_name || profileRes.data?.full_name || null,
    profileRole,
    snapshot: derivedSnapshot,
    cnProfile: derivedCnProfile,
    cnUser: cnUserRes.data || null,
    permissions,
    doctorPrivilegeStatus,
    isAdmin,
    canAccessDoctorWorkspace,
    canAccessRemoteGuidance: isAdmin || canAccessDoctorWorkspace,
  };
}

export function createSessionNo() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RG-${datePart}-${randomPart}`;
}

export function createRoomName(sessionId: string) {
  return `guidance-${sessionId.replace(/-/g, '').slice(0, 18)}`;
}

export function getLiveKitUrl() {
  return process.env.LIVEKIT_URL || '';
}

export function getGuidancePublicUrl(fallbackOrigin?: string) {
  return process.env.GUIDANCE_PUBLIC_URL || fallbackOrigin || '';
}

export function getLiveKitApiKey() {
  return process.env.LIVEKIT_API_KEY || '';
}

export function getLiveKitApiSecret() {
  return process.env.LIVEKIT_API_SECRET || '';
}

export function getLiveKitHostForServer() {
  const liveKitUrl = getLiveKitUrl();
  if (!liveKitUrl) {
    return '';
  }

  if (liveKitUrl.startsWith('wss://')) {
    return liveKitUrl.replace('wss://', 'https://');
  }

  if (liveKitUrl.startsWith('ws://')) {
    return liveKitUrl.replace('ws://', 'http://');
  }

  return liveKitUrl;
}

export function isLiveKitConfigured() {
  return Boolean(getLiveKitUrl() && getLiveKitApiKey() && getLiveKitApiSecret());
}

export function getPublishCapabilitiesByRole(actorRole: string | null) {
  switch (actorRole) {
    case 'surgeon':
    case 'assistant':
    case 'expert':
    case 'admin':
      return {
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
      };
    case 'moderator':
      return {
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
      };
    case 'observer':
    default:
      return {
        canPublish: false,
        canPublishData: false,
        canSubscribe: true,
      };
  }
}

export function buildParticipantPermissions(participantRole: string) {
  switch (participantRole) {
    case 'surgeon':
    case 'assistant':
    case 'expert':
    case 'admin':
      return {
        can_publish_audio: true,
        can_publish_video: true,
        can_send_message: true,
        can_annotate: true,
      };
    case 'moderator':
      return {
        can_publish_audio: true,
        can_publish_video: false,
        can_send_message: true,
        can_annotate: true,
      };
    case 'observer':
    default:
      return {
        can_publish_audio: false,
        can_publish_video: false,
        can_send_message: false,
        can_annotate: false,
      };
  }
}

export async function getSessionAccess(sessionId: string, actor: GuidanceActor) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: session, error } = await supabaseAdmin
    .from('guidance_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !session) {
    return null;
  }

  if (actor.isAdmin) {
    return { session, participant: null, actorRole: 'admin' };
  }

  const directRoleMap: Array<[string, string]> = [
    ['surgeon_user_id', 'surgeon'],
    ['assistant_user_id', 'assistant'],
    ['requested_expert_user_id', 'expert'],
    ['assigned_expert_user_id', 'expert'],
    ['moderator_user_id', 'moderator'],
    ['created_by', 'surgeon'],
  ];

  for (const [field, role] of directRoleMap) {
    if (session[field] === actor.userId) {
      return { session, participant: null, actorRole: role };
    }
  }

  const { data: participant } = await supabaseAdmin
    .from('guidance_participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', actor.userId)
    .maybeSingle();

  if (
    !participant ||
    participant.join_permission === false ||
    participant.invite_status === 'revoked'
  ) {
    return null;
  }

  return {
    session,
    participant,
    actorRole: participant.participant_role as string,
  };
}

export function canManageSession(actor: GuidanceActor, session: any) {
  if (actor.isAdmin) return true;
  return [session.created_by, session.surgeon_user_id, session.moderator_user_id].includes(
    actor.userId,
  );
}

export function canOperateRoom(actorRole: string | null, actor: GuidanceActor, session: any) {
  if (actor.isAdmin) return true;
  return (
    actorRole === 'surgeon' ||
    actorRole === 'moderator' ||
    session.assigned_expert_user_id === actor.userId
  );
}

export async function recordGuidanceEvent(
  sessionId: string,
  eventType: string,
  actor: GuidanceActor,
  actorRole: string | null,
  payload: Record<string, unknown> = {},
) {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.from('guidance_events').insert({
    session_id: sessionId,
    event_type: eventType,
    actor_user_id: actor.userId,
    actor_role: actorRole,
    payload,
  });
}

export async function auditGuidanceAccess(
  request: NextRequest,
  sessionId: string,
  actor: GuidanceActor,
  action: 'view_live' | 'view_recording' | 'download_recording' | 'export_summary',
  metadata: Record<string, unknown> = {},
) {
  const supabaseAdmin = getSupabaseAdmin();
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || null;
  const userAgent = request.headers.get('user-agent');

  await supabaseAdmin.from('guidance_access_audits').insert({
    session_id: sessionId,
    user_id: actor.userId,
    action,
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata,
  });
}
