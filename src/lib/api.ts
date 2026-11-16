"use client";

// Client for sewain-api (Go + Postgres/PostGIS). When the API is reachable the server is the source of truth:
// every store action is applied locally first (instant UI) and then sent to the server, which validates it,
// persists it and broadcasts a change event over WebSocket so every device refreshes. When the API is not
// reachable the app silently keeps working on browser data (offline demo fallback).

import { create } from "zustand";

/** Empty = same origin ("/api/..." routed by Caddy). Set NEXT_PUBLIC_API_URL for local dev against another port. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const apiUrl = (path: string) => `${API_BASE}${path}`;

/** Server photo URLs are stored as "/api/v1/photos/<id>"; prefix them with the API origin when it differs. */
export const resolveMediaUrl = (src: string) => (src.startsWith("/api/") ? apiUrl(src) : src);

export type ApiStatus = "connecting" | "online" | "offline";

export const useApiStatus = create<{ status: ApiStatus; clients?: number; lastSync?: number }>(() => ({ status: "connecting" }));

export const isOnline = () => useApiStatus.getState().status === "online";

/* ---------------------------------------------------------------- auth token */

let tokenProvider: () => Promise<string | null> = async () => null;
/**
 * session.ts registers how to obtain a token for the signed-in user: a demo/staging bearer token, or "" for a
 * cookie session (production, D6: the token never reaches JavaScript), or null for a guest.
 */
export function setTokenProvider(fn: () => Promise<string | null>) {
  tokenProvider = fn;
}

let includeCredentials = false;
/** Cookie sessions: send the `sewain_session` cookie to the API, also when it lives on another origin. */
export function setIncludeCredentials(on: boolean) {
  includeCredentials = on;
}
export const credentialsMode = (): RequestCredentials => (includeCredentials ? "include" : "same-origin");

let unauthorizedHandler: () => void = () => {};
/** session.ts: a signed-in request came back 401 (session expired or revoked elsewhere). */
export function setUnauthorizedHandler(fn: () => void) {
  unauthorizedHandler = fn;
}

async function request<T>(path: string, init: RequestInit = {}, auth = false, timeoutMs = 10_000): Promise<T> {
  const headers = new Headers(init.headers);
  if (auth) {
    const token = await tokenProvider();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(apiUrl(path), { ...init, headers, cache: "no-store", credentials: credentialsMode(), signal: AbortSignal.timeout(timeoutMs) });
  const body = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as T & { error?: string };
  if (res.status === 401 && auth) unauthorizedHandler();
  if (!res.ok && !(body && typeof body === "object" && "ok" in body)) throw new Error(body?.error ?? `HTTP ${res.status}`);
  return body as T;
}

export async function detectApi(): Promise<boolean> {
  try {
    const h = await request<{ ok: boolean; clients?: number }>("/api/health", {}, false, 2500);
    return !!h.ok;
  } catch {
    return false;
  }
}

/** Snapshot for the signed-in user of this tab (v2 scopes it per viewer; v1 ignores the token). */
export async function fetchState<T>(): Promise<T | null> {
  try {
    const s = await request<T & { ok?: boolean }>("/api/v1/state", {}, true);
    // An error body (401 expired session, 5xx) is not a snapshot.
    return s && typeof s === "object" && s.ok !== false ? s : null;
  } catch {
    return null;
  }
}

export async function demoLogin(userId: string): Promise<string | null> {
  try {
    // Not queued: it is also called from inside queued commands (token refresh). A failed early login
    // (e.g. right after registering, before the server has the user) is simply retried on the next command.
    // A rate-limited login (429, e.g. many personas/tabs at once on staging) would leave the tab on the guest
    // snapshot: wait as the server asks (capped) and try again.
    for (let attempt = 0; ; attempt++) {
      const r = await request<{ ok: boolean; token?: string; retryAfter?: number; error?: string }>("/api/v1/auth/demo-login", { method: "POST", body: JSON.stringify({ userId }) });
      if (r.ok) return r.token ?? null;
      const wait = r.retryAfter ?? (/(\d+) detik/.exec(r.error ?? "")?.[1] ? Number(/(\d+) detik/.exec(r.error ?? "")![1]) : 0);
      if (!wait || attempt >= 2) return null;
      await new Promise((ok) => setTimeout(ok, Math.min(wait, 15) * 1000 + 250));
    }
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ actions */

export interface ActionResponse {
  ok: boolean;
  error?: string;
  value?: unknown;
  version?: number;
}

export type ActionSendResult =
  | { kind: "response"; status: number; body: ActionResponse }
  /** fetch failed: offline, DNS, CORS, connection reset. `timeout` = the request may have reached the server. */
  | { kind: "network"; timeout: boolean; error: string };

/**
 * One attempt at POST /api/v1/actions/{name}. Used by the persistent outbox (lib/outbox.ts), which owns ordering,
 * retries and the Idempotency-Key. The key also travels in the body: a custom header needs CORS approval that v1
 * does not give, so the header is only sent when `keyHeader` is true (same origin, or a v2 server).
 */
export async function sendAction(input: { name: string; args: unknown[]; id?: string; key: string; token: string | null; keyHeader: boolean }): Promise<ActionSendResult> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (input.token) headers.set("Authorization", `Bearer ${input.token}`);
  if (input.keyHeader) headers.set("Idempotency-Key", input.key);
  try {
    // keepalive: an action already on the wire survives a reload/tab close right after the tap (flaky 4G, quick
    // navigation). Bodies are tiny, well under the 64 KB keepalive limit.
    const res = await fetch(apiUrl(`/api/v1/actions/${input.name}`), {
      method: "POST",
      headers,
      keepalive: true,
      cache: "no-store",
      credentials: credentialsMode(),
      body: JSON.stringify({ args: input.args, id: input.id, idempotencyKey: input.key }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as ActionResponse;
    return { kind: "response", status: res.status, body: body && typeof body === "object" ? body : { ok: false, error: `HTTP ${res.status}` } };
  } catch (e) {
    const timeout = e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError");
    return { kind: "network", timeout, error: e instanceof Error ? e.message : "Server tidak merespons." };
  }
}

/* ------------------------------------------------------------- JSON endpoints */

/** Every v2 error body: `{ok:false, error}` in Indonesian, sometimes with a machine `code` and, for 429, `retryAfter`. */
export interface ApiBody {
  ok: boolean;
  error?: string;
  code?: string;
  retryAfter?: number;
}

export interface ApiResult<T> {
  /** HTTP status, 0 = no response (offline, CORS, timeout) */
  status: number;
  body: T & ApiBody;
}

export const NETWORK_ERROR = "Tidak bisa terhubung ke server. Cek koneksi internetmu lalu coba lagi.";

export interface CallOptions {
  method?: string;
  /** JSON body (objects) or FormData */
  body?: unknown;
  /** send the signed-in user's credentials (default true) */
  auth?: boolean;
  /** use this bearer token instead of the session's (e.g. logout after the session was already cleared locally) */
  token?: string | null;
  credentials?: RequestCredentials;
  timeoutMs?: number;
  /** do not treat a 401 as "session expired" (login screens) */
  quiet401?: boolean;
}

/** One call to a v2 JSON endpoint. Never throws: network failures come back as status 0 with a readable error. */
export async function apiCall<T = object>(path: string, opts: CallOptions = {}): Promise<ApiResult<T>> {
  const headers = new Headers();
  const auth = opts.auth ?? true;
  const token = opts.token !== undefined ? opts.token : auth ? await tokenProvider() : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.body);
  }
  try {
    const res = await fetch(apiUrl(path), {
      method: opts.method ?? (body ? "POST" : "GET"),
      headers,
      body,
      cache: "no-store",
      credentials: opts.credentials ?? credentialsMode(),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
    });
    const parsed = (await res.json().catch(() => null)) as (T & ApiBody) | null;
    const out = parsed && typeof parsed === "object" ? parsed : ({ ok: res.ok } as T & ApiBody);
    if (!res.ok) {
      out.ok = false;
      out.error ??= res.status === 404 ? "Fitur ini belum tersedia di server." : `Server menolak permintaan (HTTP ${res.status}).`;
    }
    if (res.status === 401 && auth && !opts.quiet401) unauthorizedHandler();
    return { status: res.status, body: out };
  } catch {
    return { status: 0, body: { ok: false, error: NETWORK_ERROR } as T & ApiBody };
  }
}

/** GET a binary (admin KYC files). The caller turns it into an object URL. */
export async function apiBlob(path: string): Promise<{ status: number; blob?: Blob; error?: string }> {
  const headers = new Headers();
  const token = await tokenProvider();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    const res = await fetch(apiUrl(path), { headers, cache: "no-store", credentials: credentialsMode(), signal: AbortSignal.timeout(20_000) });
    if (res.ok) return { status: res.status, blob: await res.blob() };
    const body = (await res.json().catch(() => null)) as ApiBody | null;
    if (res.status === 401) unauthorizedHandler();
    return { status: res.status, error: body?.error ?? `HTTP ${res.status}` };
  } catch {
    return { status: 0, error: NETWORK_ERROR };
  }
}

/**
 * Multipart POST with upload progress (fetch has no upload progress events). Resolves with the parsed JSON body;
 * status 0 = network error or abort. `signal` cancels the request.
 */
export async function apiUpload<T = object>(path: string, form: FormData, onProgress?: (fraction: number) => void, signal?: AbortSignal): Promise<ApiResult<T>> {
  const token = await tokenProvider();
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl(path));
    xhr.withCredentials = includeCredentials;
    xhr.timeout = 120_000;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.min(1, e.loaded / e.total));
    const fail = () => resolve({ status: 0, body: { ok: false, error: NETWORK_ERROR } as T & ApiBody });
    xhr.onerror = fail;
    xhr.ontimeout = fail;
    xhr.onabort = () => resolve({ status: 0, body: { ok: false, error: "Unggahan dibatalkan." } as T & ApiBody });
    xhr.onload = () => {
      let body: (T & ApiBody) | null = null;
      try {
        body = JSON.parse(xhr.responseText) as T & ApiBody;
      } catch {}
      const out = body && typeof body === "object" ? body : ({ ok: false } as T & ApiBody);
      if (xhr.status < 200 || xhr.status >= 300) {
        out.ok = false;
        out.error ??= xhr.status === 413 ? "Foto terlalu besar." : `Server menolak unggahan (HTTP ${xhr.status}).`;
      }
      if (xhr.status === 401) unauthorizedHandler();
      resolve({ status: xhr.status, body: out });
    };
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });
}

/* -------------------------------------------------------------------- config */

export interface ServerConfig {
  appEnv?: string;
  demoMode?: boolean;
  paymentMode?: string;
  auth?: { otpProvider?: string };
  push?: { vapidPublicKey?: string } | null;
  legal?: { termsVersion?: string; privacyVersion?: string };
}

/** GET /api/v1/config (v2). null on v1 (404) or when unreachable. */
export async function fetchConfig(): Promise<ServerConfig | null> {
  try {
    const res = await fetch(apiUrl("/api/v1/config"), { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const body = (await res.json()) as ServerConfig & { ok?: boolean };
    return body && body.ok !== false ? body : null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------- photos */

export interface UploadMeta {
  stage: string;
  bookingId?: string;
  angle?: string;
  source: string;
  width?: number;
  height?: number;
}

/** Upload one evidence photo. `onProgress` gets 0..1 while the bytes go out. Throws with a readable message. */
export async function uploadPhoto<T>(blob: Blob, meta: UploadMeta, onProgress?: (fraction: number) => void): Promise<T> {
  const fd = new FormData();
  fd.append("file", blob, `foto.${blob.type.split("/")[1] ?? "jpg"}`);
  for (const [k, v] of Object.entries(meta)) if (v != null) fd.append(k, String(v));
  const r = await apiUpload<{ photo?: T }>("/api/v1/photos", fd, onProgress);
  if (!r.body.ok || !r.body.photo) throw new Error(r.body.error ?? "Gagal mengunggah foto.");
  return r.body.photo;
}

export async function registerDemoPhoto<T>(url: string, meta: Omit<UploadMeta, "source" | "width" | "height">): Promise<T> {
  const r = await request<{ ok: boolean; photo?: T; error?: string }>("/api/v1/photos/demo", { method: "POST", body: JSON.stringify({ url, ...meta }) }, true);
  if (!r.ok || !r.photo) throw new Error(r.error ?? "Gagal menyimpan foto contoh.");
  return r.photo;
}

/* --------------------------------------------------------------------- search */

export interface ServerSearchResult {
  hits: { id: string; distanceKm: number }[];
  hiddenByProviderReach: number;
  query: string;
}

/** PostGIS two-way radius search (FR-S3). Returns null when offline so callers fall back to local search. */
export async function serverSearch(params: Record<string, string | number | undefined>): Promise<ServerSearchResult | null> {
  if (!isOnline()) return null;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  try {
    const r = await request<ServerSearchResult & { ok: boolean }>(`/api/v1/listings/search?${qs}`, {}, false, 5000);
    return r.ok ? r : null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------- events */

let reopenEvents: (() => void) | null = null;

/** Reconnect the change feed (e.g. after a persona switch: v2 sends events only to the signed-in user). */
export function reconnectEvents() {
  reopenEvents?.();
}

/**
 * WebSocket change feed with automatic reconnect. Calls onChange(version) for every server change.
 * `token` (demo bearer sessions only) is passed as ?token=, since a browser WebSocket cannot send headers.
 */
export function connectEvents(onChange: (version: number) => void, onOpen: () => void, token: () => Promise<string | null> = async () => null): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;
  let retry = 1000;
  const open = async () => {
    if (stopped) return;
    const base = API_BASE || window.location.origin;
    const t = await token().catch(() => null);
    if (stopped) return;
    const socket = new WebSocket(`${base.replace(/^http/, "ws")}/api/v1/events${t ? `?token=${encodeURIComponent(t)}` : ""}`);
    ws = socket;
    socket.onopen = () => {
      retry = 1000;
      useApiStatus.setState({ status: "online" });
      onOpen();
    };
    socket.onmessage = (m) => {
      try {
        const msg = JSON.parse(String(m.data)) as { type: string; version: number };
        if (msg.type === "changed" || msg.type === "hello") onChange(msg.version);
      } catch {}
    };
    socket.onclose = () => {
      if (stopped || ws !== socket) return;
      window.setTimeout(() => void open(), retry);
      retry = Math.min(retry * 2, 15_000);
    };
  };
  reopenEvents = () => {
    const old = ws;
    ws = null;
    old?.close();
    retry = 1000;
    void open();
  };
  void open();
  return () => {
    stopped = true;
    reopenEvents = null;
    ws?.close();
  };
}
