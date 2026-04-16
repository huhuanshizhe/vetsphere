import crypto from "crypto";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 12;

export type GuidanceInvitePayload = {
  sessionId: string;
  role: "expert" | "observer" | "assistant";
  roomName: string;
  exp: number;
  issuedAt: number;
};

function getInviteSecret() {
  return process.env.GUIDANCE_INVITE_SECRET || process.env.LIVEKIT_API_SECRET || "";
}

function encodePayload(payload: GuidanceInvitePayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signRawValue(value: string) {
  return crypto.createHmac("sha256", getInviteSecret()).update(value).digest("base64url");
}

export function createGuidanceInviteToken(
  payload: Omit<GuidanceInvitePayload, "exp" | "issuedAt">,
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS
) {
  const completePayload: GuidanceInvitePayload = {
    ...payload,
    issuedAt: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };

  const encodedPayload = encodePayload(completePayload);
  const signature = signRawValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseGuidanceInviteToken(token: string): GuidanceInvitePayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !getInviteSecret()) {
    return null;
  }

  const expectedSignature = signRawValue(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as GuidanceInvitePayload;
    if (!payload.sessionId || !payload.roomName || !payload.role) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
