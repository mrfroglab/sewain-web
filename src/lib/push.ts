"use client";

// Web push (F6.5, sewain-api docs/integration/notify.md §5–6). Opt-in only after the user taps a button: never on
// page load. The browser subscription belongs to this device; the server links it to whoever is signed in.

import { create } from "zustand";
import { deletePushSubscription, fetchVapidKey, savePushSubscription } from "./account";
import { useAppConfig } from "./config";

export type PushPermission = NotificationPermission | "unsupported";

interface PushState {
  /** browser can do push at all (iOS: only as an installed PWA, 16.4+) */
  supported: boolean;
  /** server has VAPID configured (GET /push/vapid-key answered) */
  serverKey: string | null;
  permission: PushPermission;
  subscribed: boolean;
  checked: boolean;
}

export const usePush = create<PushState>(() => ({ supported: false, serverKey: null, permission: "unsupported", subscribed: false, checked: false }));

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && window.isSecureContext;

/** base64url VAPID key → Uint8Array (Safari does not accept the string form). */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  // Production builds register /sw.js at boot; dev does not, so register on demand (push needs a worker).
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

async function existingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

let keyRequest: Promise<string | null> | null = null;

/** VAPID public key: from /api/v1/config when present, else GET /push/vapid-key (404 = push off on the server). */
async function serverKey(): Promise<string | null> {
  const fromConfig = useAppConfig.getState().vapidPublicKey;
  if (fromConfig) return fromConfig;
  if (!useAppConfig.getState().fromServer) return null; // v1: no push
  keyRequest ??= fetchVapidKey().then((r) => (r.body.ok && r.body.publicKey ? r.body.publicKey : null));
  return keyRequest;
}

/** Refresh the push state (support, server key, permission, subscription). Cheap; call when a push UI mounts. */
export async function checkPush(): Promise<void> {
  if (!pushSupported()) return usePush.setState({ supported: false, checked: true });
  const [key, sub] = await Promise.all([serverKey(), existingSubscription().catch(() => null)]);
  usePush.setState({ supported: true, serverKey: key, permission: Notification.permission, subscribed: !!sub, checked: true });
}

export type PushResult = { ok: true } | { ok: false; error: string };

/** Ask permission → subscribe → POST /api/v1/push/subscriptions. Must run from a user gesture (button tap). */
export async function enablePush(): Promise<PushResult> {
  if (!pushSupported()) return { ok: false, error: "Browser ini belum mendukung notifikasi push. Di iPhone, pasang Sewain ke layar utama dulu." };
  const key = await serverKey();
  if (!key) return { ok: false, error: "Notifikasi push belum aktif di server." };
  const permission = await Notification.requestPermission();
  usePush.setState({ permission });
  if (permission !== "granted") return { ok: false, error: permission === "denied" ? "Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser." : "Izin notifikasi belum diberikan." };
  try {
    const reg = await registration();
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
    const r = await savePushSubscription(sub.toJSON());
    if (!r.body.ok) return { ok: false, error: r.body.error ?? "Gagal menyimpan langganan notifikasi." };
    usePush.setState({ subscribed: true });
    return { ok: true };
  } catch {
    return { ok: false, error: "Gagal mengaktifkan notifikasi di perangkat ini." };
  }
}

/** Turn push off on this device: tell the server, then drop the browser subscription. */
export async function disablePush(): Promise<PushResult> {
  const sub = await existingSubscription().catch(() => null);
  if (sub) {
    const r = await deletePushSubscription(sub.endpoint);
    await sub.unsubscribe().catch(() => false);
    if (!r.body.ok && r.status !== 0) return { ok: false, error: r.body.error ?? "Gagal mematikan notifikasi." };
  }
  usePush.setState({ subscribed: false });
  return { ok: true };
}

/**
 * Logout: the next person on this device must not get the previous account's notifications. Runs with the old
 * credentials (the local session is already cleared).
 */
export async function dropPushOnLogout(token: string | null, cookie: boolean): Promise<void> {
  const sub = await existingSubscription().catch(() => null);
  if (!sub) return;
  await deletePushSubscription(sub.endpoint, token, cookie);
  await sub.unsubscribe().catch(() => false);
  usePush.setState({ subscribed: false });
}

/** After a sign-in (or persona switch) on a device that already allowed push: move the subscription to this account. */
export async function reattachPush(): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") return;
  const sub = await existingSubscription().catch(() => null);
  if (sub) await savePushSubscription(sub.toJSON());
}

/* ---------------------------------------------------------- polite opt-in */

const ASKED_KEY = "sewain-push-asked";

/** Actions after which a notification is genuinely useful (an answer is coming). */
export const MEANINGFUL_ACTIONS = new Set(["createBooking", "acceptBooking", "createListing", "sendMessage", "createWanted", "offerWanted", "openDispute"]);

export function pushAskedBefore(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) !== null;
  } catch {
    return true;
  }
}

export function rememberPushAsked(answer: "ya" | "nanti") {
  try {
    localStorage.setItem(ASKED_KEY, answer);
  } catch {}
}
