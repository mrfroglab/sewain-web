"use client";

// Persistent action queue (F6.9). Every server action is written to localStorage *before* it is sent, with an
// Idempotency-Key, so it survives a reload, a closed tab or a dead connection, and is sent again later with the
// same key. v2 deduplicates on that key; v1 ignores it, so a few v1-only safeguards below avoid double effects.
//
// - One list per user: localStorage "sewain-outbox:<userId>" ("…:guest" before sign-in). Never touches "sewain-demo".
// - Strict order per device: entries carry a global sequence number and are sent oldest first across all users
//   (a renter's request must reach the server before the provider accepts it in the same demo tab).
// - One sender per device: a Web Lock (fallback: in-tab flag) keeps two tabs from sending the same entry.
// - 2xx ok:true → done. ok:false (2xx or 4xx, except 401/408/429) → rejected for good: dropped, toast, resync.
//   401 → fresh token, retry. Network error, 408, 429, 5xx → retry with backoff (1 s → 30 s), same key.

import { create } from "zustand";
import { API_BASE, sendAction, type ActionResponse } from "./api";

export const OUTBOX_PREFIX = "sewain-outbox:";
const SEQ_KEY = "sewain-outbox-seq";
const LOCK = "sewain-outbox";
const MAX_SERVER_ERRORS = 8;

export interface OutboxEntry {
  /** Idempotency-Key (UUID v4), identical on every attempt */
  key: string;
  seq: number;
  /** the account that performed the action (token owner); null = guest (e.g. registerUser) */
  userId: string | null;
  name: string;
  args: unknown[];
  /** client-generated id of a created object (createBooking → "b-…"), kept by the server */
  id?: string;
  at: number;
  attempts: number;
  /** set right before a request goes out; still set after a reload = the request may have reached the server */
  sentAt?: number;
  /** the server may already have applied it (reload or timeout mid-request) */
  maybeApplied?: boolean;
  serverErrors?: number;
}

export interface OutboxHooks {
  /** token for any account on this device (demo: demo-login), null = send without one */
  tokenFor: (userId: string) => Promise<string | null>;
  /** the cached token was rejected (401) */
  dropToken: (userId: string) => void;
  /** whether the server deduplicates on Idempotency-Key (v2, via /api/v1/config) */
  idempotent: () => boolean;
  /** v1 safety net for "maybe applied" creates: true when the object with this id already exists on the server */
  exists: (id: string) => Promise<boolean>;
  onRejected: (entry: OutboxEntry, error: string, quiet: boolean) => void;
  onAccepted: (entry: OutboxEntry, resp: ActionResponse) => void;
  /** queue drained (or blocked): time to reconcile with the server */
  onSettled: () => void;
}

interface OutboxState {
  /** entries not yet confirmed by the server, all users on this device */
  count: number;
  /** the last attempt failed (offline / server error) and a retry is scheduled */
  waiting: boolean;
}

export const useOutbox = create<OutboxState>(() => ({ count: 0, waiting: false }));

let hooks: OutboxHooks | null = null;
let retryTimer: number | null = null;
let stuckTimer: number | null = null;
let backoff = 1000;
let flushing = false;
let flushAgain = false;
/** users whose entries cannot be sent from this tab (no token): skipped, not blocking */
const stuck = new Set<string>();

let unloading = false;
if (typeof window !== "undefined") {
  const leave = () => (unloading = true);
  window.addEventListener("beforeunload", leave);
  window.addEventListener("pagehide", leave);
  window.addEventListener("pageshow", () => (unloading = false));
}

const storageKey = (userId: string | null) => OUTBOX_PREFIX + (userId ?? "guest");

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readList(key: string): OutboxEntry[] {
  try {
    const raw = safeStorage()?.getItem(key);
    const list = raw ? (JSON.parse(raw) as OutboxEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: OutboxEntry[]) {
  const ls = safeStorage();
  if (!ls) return;
  try {
    if (list.length) ls.setItem(key, JSON.stringify(list));
    else ls.removeItem(key);
  } catch {}
}

function allKeys(): string[] {
  const ls = safeStorage();
  if (!ls) return [];
  const keys: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k?.startsWith(OUTBOX_PREFIX)) keys.push(k);
  }
  return keys;
}

/** Every pending entry on this device, oldest first. */
export function pendingEntries(): OutboxEntry[] {
  return allKeys()
    .flatMap(readList)
    .sort((a, b) => a.seq - b.seq);
}

function updateEntry(entry: OutboxEntry, patch: Partial<OutboxEntry>) {
  const key = storageKey(entry.userId);
  writeList(
    key,
    readList(key).map((e) => (e.key === entry.key ? { ...e, ...patch } : e)),
  );
}

function removeEntry(entry: OutboxEntry) {
  const key = storageKey(entry.userId);
  writeList(
    key,
    readList(key).filter((e) => e.key !== entry.key),
  );
}

function refreshCount() {
  useOutbox.setState({ count: pendingEntries().length });
}

/** Entries that hold back a server resync: everything except accounts this tab cannot send for. */
export function blockingCount(): number {
  return pendingEntries().filter((e) => !e.userId || !stuck.has(e.userId)).length;
}

function nextSeq(): number {
  const ls = safeStorage();
  let n = Date.now() * 1000;
  try {
    const last = Number(ls?.getItem(SEQ_KEY) ?? 0);
    if (last >= n) n = last + 1;
    ls?.setItem(SEQ_KEY, String(n));
  } catch {}
  return n;
}

export function newIdempotencyKey(): string {
  // randomUUID needs a secure context; plain-http LAN testing falls back to getRandomValues.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Store the action durably (synchronously), then try to send it. */
export function enqueueAction(userId: string | null, name: string, args: unknown[], id?: string): OutboxEntry {
  const entry: OutboxEntry = { key: newIdempotencyKey(), seq: nextSeq(), userId, name, args, id, at: Date.now(), attempts: 0 };
  const key = storageKey(userId);
  writeList(key, [...readList(key), entry]);
  refreshCount();
  void flushOutbox();
  return entry;
}

/** Actions that are not safe to send twice to a server without idempotency (v1) when we cannot tell if they landed. */
const V1_NOT_REPEATABLE = new Set(["toggleFavorite", "sendMessage", "addCheckoutPhotos", "proposeSolution", "offerWanted", "createReport", "addStrike", "advanceClock", "resetDemo"]);

async function withLock(fn: () => Promise<void>): Promise<void> {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  if (locks?.request) {
    await locks.request(LOCK, async () => fn());
    return;
  }
  await fn();
}

function scheduleRetry() {
  if (retryTimer != null || typeof window === "undefined") return;
  useOutbox.setState({ waiting: true });
  const delay = backoff + Math.round(Math.random() * 250);
  backoff = Math.min(backoff * 2, 30_000);
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    void flushOutbox();
  }, delay);
}

type Step = "next" | "stop";

async function sendOne(entry: OutboxEntry, h: OutboxHooks): Promise<Step> {
  const idempotent = h.idempotent();
  // v1 + "maybe applied" (reload/timeout mid-request): the keepalive request almost surely landed.
  if (entry.maybeApplied && !idempotent) {
    if (entry.id) {
      if (await h.exists(entry.id)) {
        removeEntry(entry);
        h.onAccepted(entry, { ok: true, value: entry.id });
        return "next";
      }
    } else if (V1_NOT_REPEATABLE.has(entry.name)) {
      removeEntry(entry);
      h.onRejected(entry, "", true);
      return "next";
    }
  }

  let token: string | null = null;
  if (entry.userId) {
    token = await h.tokenFor(entry.userId);
    if (!token) {
      stuck.add(entry.userId);
      return "next";
    }
    stuck.delete(entry.userId);
  }

  updateEntry(entry, { sentAt: Date.now(), attempts: entry.attempts + 1 });
  const res = await sendAction({ name: entry.name, args: entry.args, id: entry.id, key: entry.key, token, keyHeader: !API_BASE || idempotent });

  if (res.kind === "network") {
    // The page is going away (reload, tab close): the browser cancels our view of the keepalive request, but the
    // request itself still goes out. Leave `sentAt` in place so the next page load treats it as "maybe applied".
    if (unloading) return "stop";
    // A timeout may have reached the server; a refused connection did not.
    updateEntry(entry, { sentAt: undefined, maybeApplied: entry.maybeApplied || res.timeout });
    return "stop";
  }
  const { status, body } = res;
  if (status === 401 && entry.userId) {
    h.dropToken(entry.userId);
    updateEntry(entry, { sentAt: undefined });
    if (entry.attempts < 2) return sendOne({ ...entry, attempts: entry.attempts + 1 }, h);
    return "stop";
  }
  if (status >= 500 || status === 408 || status === 429) {
    const serverErrors = (entry.serverErrors ?? 0) + 1;
    if (serverErrors >= MAX_SERVER_ERRORS) {
      removeEntry(entry);
      h.onRejected(entry, body.error ?? "Server sedang bermasalah.", false);
      return "next";
    }
    updateEntry(entry, { sentAt: undefined, serverErrors });
    return "stop";
  }
  removeEntry(entry);
  if (body.ok) h.onAccepted(entry, body);
  // A repeat of a request that may already have been applied: a v1 "already done" rejection is expected, stay quiet.
  else h.onRejected(entry, body.error ?? `Aksi ditolak (HTTP ${status}).`, !!entry.maybeApplied && !idempotent);
  return "next";
}

/** Send pending entries in order until the queue is empty or a retry is needed. Safe to call any time. */
export async function flushOutbox(): Promise<void> {
  const h = hooks;
  if (!h) return;
  if (flushing) {
    flushAgain = true;
    return;
  }
  flushing = true;
  try {
    await withLock(async () => {
      for (;;) {
        const entry = pendingEntries().find((e) => !e.userId || !stuck.has(e.userId));
        if (!entry) break;
        const step = await sendOne(entry, h);
        refreshCount();
        if (step === "stop") {
          if (!unloading) scheduleRetry();
          return;
        }
        backoff = 1000;
      }
      useOutbox.setState({ waiting: false });
      // No token yet for some account (e.g. just registered, or signed out): try those again a bit later.
      if (stuck.size > 0 && stuckTimer == null && typeof window !== "undefined") {
        stuckTimer = window.setTimeout(() => {
          stuckTimer = null;
          stuck.clear();
          void flushOutbox();
        }, 5000);
      }
    });
  } finally {
    flushing = false;
    refreshCount();
  }
  if (flushAgain) {
    flushAgain = false;
    return flushOutbox();
  }
  h.onSettled();
}

/** Retry now (e.g. the browser came back online), skipping the backoff wait. */
export function retryOutboxNow() {
  if (retryTimer != null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
  backoff = 1000;
  stuck.clear();
  void flushOutbox();
}

/**
 * Install the hooks and mark requests that were on the wire when the page went away as "maybe applied".
 * Call once the API is reachable; the caller then flushes.
 */
export function startOutbox(h: OutboxHooks) {
  const first = !hooks;
  hooks = h;
  if (first) {
    for (const e of pendingEntries()) if (e.sentAt) updateEntry(e, { sentAt: undefined, maybeApplied: true });
    if (typeof window !== "undefined") {
      window.addEventListener("online", retryOutboxNow);
      // Another tab may have added entries: keep the counter honest.
      window.addEventListener("storage", (ev) => ev.key?.startsWith(OUTBOX_PREFIX) && refreshCount());
    }
  }
  refreshCount();
}
