// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/guidance-api";

export const dynamic = "force-dynamic";

function isValidMobile(mobile: string) {
  return /^1[3-9]\d{9}$/.test(mobile);
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const body = await request.json();
    const { mobile, password } = body;

    if (!mobile || !password) {
      return NextResponse.json({ error: "请输入手机号和密码。" }, { status: 400 });
    }

    if (!isValidMobile(mobile)) {
      return NextResponse.json({ error: "请输入正确的手机号。" }, { status: 400 });
    }

    const { data: cnUser, error: userError } = await supabaseAdmin
      .from("cn_users")
      .select("id, mobile, password_hash, status, login_count")
      .eq("mobile", mobile)
      .single();

    if (userError || !cnUser) {
      return NextResponse.json({ error: "手机号或密码错误。" }, { status: 401 });
    }

    if (["disabled", "banned"].includes(cnUser.status)) {
      return NextResponse.json({ error: "账号已被限制使用，请联系管理员。", accountStatus: cnUser.status }, { status: 403 });
    }

    if (!cnUser.password_hash) {
      return NextResponse.json({ error: "当前账号尚未设置密码，请先使用验证码登录后设置密码。" }, { status: 400 });
    }

    const virtualEmail = `${mobile}@vetsphere.cn`;
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: virtualEmail,
      password,
    });

    if (signInError || !signInData?.session) {
      return NextResponse.json({ error: "手机号或密码错误。" }, { status: 401 });
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

    await supabaseAdmin
      .from("cn_users")
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: ipAddress,
        login_count: (cnUser.login_count || 0) + 1,
      })
      .eq("id", cnUser.id);

    const { data: userState } = await supabaseAdmin
      .from("v_cn_user_full_state")
      .select("*")
      .eq("user_id", cnUser.id)
      .single();

    const { data: latestVerification } = await supabaseAdmin
      .from("cn_verification_requests")
      .select("status, reject_reason")
      .eq("user_id", cnUser.id)
      .eq("site_code", "cn")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const realVerificationStatus = latestVerification?.status || "not_started";
    const state = userState || {
      user_id: cnUser.id,
      mobile,
      user_status: "active",
      onboarding_status: "completed",
      verification_status: "not_started",
      access_level: "registered_basic",
      redirect_hint: "go_home",
      identity_group_v2: null,
      doctor_subtype: null,
      doctor_privilege_status: "not_applicable",
    };

    const identityGroupV2 = state.identity_group_v2;
    let realDoctorPrivilegeStatus = "not_applicable";
    if (identityGroupV2 === "doctor") {
      if (realVerificationStatus === "approved") realDoctorPrivilegeStatus = "approved";
      else if (["submitted", "under_review"].includes(realVerificationStatus)) realDoctorPrivilegeStatus = "pending_review";
      else if (realVerificationStatus === "rejected") realDoctorPrivilegeStatus = "rejected";
      else realDoctorPrivilegeStatus = "not_started";
    }

    const isDoctorApproved = identityGroupV2 === "doctor" && realDoctorPrivilegeStatus === "approved";
    const permissions = {
      can_access_user_center: true,
      can_purchase_courses: true,
      can_purchase_products: true,
      can_manage_orders: true,
      can_access_growth_system: true,
      can_access_doctor_workspace: isDoctorApproved,
      can_access_medical_features: isDoctorApproved,
      can_access_professional_courses: isDoctorApproved,
      can_view_restricted_product_info: isDoctorApproved,
    };

    return NextResponse.json({
      success: true,
      user: {
        id: cnUser.id,
        mobile,
        status: state.user_status,
        displayName: state.display_name,
        avatarUrl: state.avatar_file_id,
      },
      identity: {
        identityType: state.identity_type,
        identityGroup: state.identity_group,
        identityGroupV2,
        doctorSubtype: state.doctor_subtype,
        identityVerifiedFlag: state.identity_verified_flag,
      },
      verification: {
        required: state.verification_required || false,
        status: realVerificationStatus,
        rejectReason: latestVerification?.reject_reason || state.verification_reject_reason,
      },
      doctorAccess: {
        status: realDoctorPrivilegeStatus,
        rejectReason:
          realDoctorPrivilegeStatus === "rejected"
            ? latestVerification?.reject_reason || state.verification_reject_reason
            : null,
      },
      permissions,
      redirectHint: isDoctorApproved ? "go_home" : "go_doctor_verification",
      session: {
        accessToken: signInData.session.access_token,
        refreshToken: signInData.session.refresh_token,
        expiresAt: signInData.session.expires_at,
      },
    });
  } catch (error) {
    console.error("guidance login-by-password error:", error);
    return NextResponse.json({ error: "服务器错误，请稍后重试。" }, { status: 500 });
  }
}
