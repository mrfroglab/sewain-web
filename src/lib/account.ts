"use client";

// Typed wrappers for the v2 account endpoints (sewain-api docs/integration/auth.md and notify.md, plus
// GET /api/v1/me/export and DELETE /api/v1/me). Every function resolves to ApiResult and never throws: screens show
// `body.error` (already Indonesian) as is.

import { apiBlob, apiCall, apiUpload, type ApiResult } from "./api";

/* -------------------------------------------------------------------- OTP */

export interface OtpRequestResult {
  phone: string;
  expiresAt: string;
  /** seconds until "Kirim ulang" is allowed */
  resendAfter: number;
  channel?: string;
  /** provider `demo`/`echo` only (staging test aid) */
  devCode?: string;
}

export const requestOtp = (phone: string) => apiCall<OtpRequestResult>("/api/v1/auth/otp/request", { body: { phone }, auth: false, quiet401: true });

export interface OtpVerifyResult {
  userId: string;
  role: "user" | "admin";
  isNew: boolean;
  session: { id: string; expiresAt: string };
  /** transport "bearer" only (DEMO_MODE / SESSION_BEARER_LOGIN servers) */
  token?: string;
}

export const verifyOtp = (input: { phone: string; code: string; acceptTerms: boolean; transport: "cookie" | "bearer" }) =>
  // A cookie login must be allowed to store the Set-Cookie of a cross-origin API: always "include".
  apiCall<OtpVerifyResult>("/api/v1/auth/otp/verify", { body: input, auth: false, quiet401: true, credentials: "include" });

/** Revoke this device's session. Idempotent (a guest also gets 200). */
export const logoutServer = (token: string | null, cookie: boolean) =>
  apiCall("/api/v1/auth/logout", { method: "POST", token, credentials: cookie ? "include" : "same-origin", quiet401: true, timeoutMs: 5000 });

/** The signed-in user per the session cookie (production boot). */
export const fetchMe = () => apiCall<{ user?: { id: string; role?: string } }>("/api/v1/auth/me", { quiet401: true, timeoutMs: 5000 });

/* --------------------------------------------------------------- sessions */

export interface SessionInfo {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  userAgent?: string;
  ip?: string;
  current: boolean;
}

export const listSessions = () => apiCall<{ sessions: SessionInfo[] }>("/api/v1/auth/sessions");
export const revokeSession = (id: string) => apiCall(`/api/v1/auth/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
export const revokeOtherSessions = () => apiCall<{ revoked: number }>("/api/v1/auth/sessions", { method: "DELETE" });

/* -------------------------------------------------------------------- KYC */

export type KycStatus = "pending" | "approved" | "rejected";

export interface KycSubmission {
  id: string;
  userId: string;
  nikMasked: string;
  status: KycStatus;
  reason: string;
  provider: string;
  createdAt: string;
  decidedAt: string | null;
  filesPurgeAfter: string | null;
  filesPurgedAt: string | null;
  /** admin endpoints only */
  nameOnKtp?: string;
  decidedBy?: string;
}

/** multipart: ktp, selfie (files), nik (16 digits), nameOnKtp. Progress 0..1 over both files. */
export function submitKyc(input: { ktp: Blob; selfie: Blob; nik: string; nameOnKtp: string }, onProgress?: (f: number) => void, signal?: AbortSignal) {
  const fd = new FormData();
  fd.append("nik", input.nik);
  fd.append("nameOnKtp", input.nameOnKtp);
  fd.append("ktp", input.ktp, `ktp.${extOf(input.ktp)}`);
  fd.append("selfie", input.selfie, `selfie.${extOf(input.selfie)}`);
  return apiUpload<{ submission?: KycSubmission }>("/api/v1/kyc/submissions", fd, onProgress, signal);
}

const extOf = (b: Blob) => (b.type === "image/png" ? "png" : b.type === "image/webp" ? "webp" : "jpg");

export const kycStatus = () => apiCall<{ submission: KycSubmission | null }>("/api/v1/kyc/status");

export const adminKycQueue = (status: KycStatus | "all" = "all", limit = 100) => apiCall<{ submissions: KycSubmission[] }>(`/api/v1/admin/kyc?status=${status}&limit=${limit}`);

export const adminKycDecide = (id: string, decision: "approve" | "reject", reason: string) =>
  apiCall<{ submission?: KycSubmission }>(`/api/v1/admin/kyc/${encodeURIComponent(id)}/decision`, { body: { decision, reason } });

/** Original KTP/selfie bytes. Every call is written to the audit log on the server. */
export const adminKycFile = (id: string, kind: "ktp" | "selfie") => apiBlob(`/api/v1/admin/kyc/${encodeURIComponent(id)}/files/${kind}`);

/* ------------------------------------------------------------------- push */

export const fetchVapidKey = () => apiCall<{ publicKey?: string }>("/api/v1/push/vapid-key", { auth: false, timeoutMs: 5000 });
export const savePushSubscription = (sub: PushSubscriptionJSON) => apiCall("/api/v1/push/subscriptions", { body: sub });
export const deletePushSubscription = (endpoint: string, token?: string | null, cookie?: boolean) =>
  apiCall<{ removed?: boolean }>("/api/v1/push/subscriptions", {
    method: "DELETE",
    body: { endpoint },
    ...(token !== undefined ? { token, credentials: cookie ? "include" : "same-origin" } : {}),
    quiet401: true,
    timeoutMs: 5000,
  });

/* ------------------------------------------------------- notification prefs */

export type NotifyChannel = "inapp" | "webpush" | "email" | "whatsapp";
export type NotifyCategory = "booking" | "chat" | "sengketa" | "sistem";

export interface NotificationPrefs {
  channels: Record<NotifyChannel, Record<NotifyCategory, boolean>>;
  quietHours: { enabled: boolean; start: string; end: string; timezone: string };
}

export interface NotificationPrefsResponse {
  prefs: NotificationPrefs;
  available: Record<NotifyChannel, boolean>;
  pushSubscriptions: number;
}

export interface NotificationPrefsPatch {
  channels?: Partial<Record<NotifyChannel, Partial<Record<NotifyCategory, boolean>>>>;
  quietHours?: Partial<NotificationPrefs["quietHours"]>;
}

export const getNotificationPrefs = () => apiCall<NotificationPrefsResponse>("/api/v1/me/notification-prefs");
export const putNotificationPrefs = (patch: NotificationPrefsPatch) => apiCall<NotificationPrefsResponse>("/api/v1/me/notification-prefs", { method: "PUT", body: patch });

/* ------------------------------------------------------- export / delete */

export const exportMyData = () => apiCall<{ export?: unknown }>("/api/v1/me/export", { timeoutMs: 30_000 });
export const deleteMyAccount = () => apiCall("/api/v1/me", { method: "DELETE" });

export type { ApiResult };
