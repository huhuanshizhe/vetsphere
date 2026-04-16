// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getGuidanceActor } from "@/lib/server/guidance-api";

export const dynamic = "force-dynamic";

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

export async function GET(request: NextRequest) {
  const actor = await getGuidanceActor(request);

  if (!actor) {
    return NextResponse.json({
      isLoggedIn: false,
      permissions: DEFAULT_PERMISSIONS,
      redirectHint: "go_login",
    });
  }

  return NextResponse.json({
    isLoggedIn: true,
    user: {
      id: actor.userId,
      mobile: actor.cnUser?.mobile || null,
      status: actor.cnUser?.status || "active",
      displayName: actor.cnProfile?.display_name || actor.fullName,
      avatarUrl: null,
      realName: actor.fullName,
      organizationName: actor.cnProfile?.organization_name || null,
    },
    identity: {
      identityType: actor.snapshot?.doctor_subtype || null,
      identityGroup: actor.snapshot?.identity_group_v2 || null,
      identityGroupV2: actor.snapshot?.identity_group_v2 || null,
      doctorSubtype: actor.snapshot?.doctor_subtype || null,
      identityLabel: actor.snapshot?.identity_group_v2 === "doctor" ? "执业兽医" : "用户",
      identityVerifiedFlag: actor.snapshot?.verification_status === "approved",
    },
    onboarding: {
      status: actor.snapshot?.onboarding_status || "completed",
      profileCompletionPercent: actor.cnProfile?.profile_completion_percent || 0,
    },
    verification: {
      required: actor.snapshot?.verification_required || false,
      status: actor.snapshot?.verification_status || "not_started",
      rejectReason: actor.snapshot?.verification_reject_reason || null,
    },
    doctorAccess: {
      status: actor.doctorPrivilegeStatus,
      rejectReason: actor.snapshot?.verification_reject_reason || null,
    },
    permissions: actor.permissions,
    access: {
      level: actor.snapshot?.access_level || "registered_basic",
      permissionFlags: actor.permissions,
    },
    redirectHint: actor.canAccessRemoteGuidance ? "go_home" : "go_doctor_verification",
  });
}
