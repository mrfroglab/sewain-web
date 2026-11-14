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
/** session.ts registers how to obtain a token for the signed-in user (demo login). */
export function setTokenProvider(fn: () => Promise<string | null>) {
  tokenProvider = fn;
}

async function request<T>(path: string, init: RequestInit = {}, auth = false, timeoutMs = 10_000): Promise<T> {
  const headers = new Headers(init.headers);
  if (auth) {
    const token = await tokenProvider();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(apiUrl(path), { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  const body = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as T & { error?: string };
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

export async function fetchState<T>(): Promise<T | null> {
  try {
    return await request<T>("/api/v1/state");
  } catch {
    return null;
  }
}

export async function demoLogin(userId: string): Promise<string | null> {
  try {
    // Not queued: it is also called from inside queued commands (token refresh). A failed early login
    // (e.g. right after registering, before the server has the user) is simply retried on the next command.
    const r = await request<{ ok: boolean; token?: string }>("/api/v1/auth/demo-login", { method: "POST", body: JSON.stringify({ userId }) });
    return r.ok ? r.token ?? null : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ ordered queue */

// Commands are sent one at a time, in the order the user performed them (e.g. register → login, checkout → agree).
let chain: Promise<unknown> = Promise.resolve();
let pending = 0;
export const pendingCommands = () => pending;

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  pending++;
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined).finally(() => {
    pending--;
  });
  return run;
}

export interface ActionResponse {
  ok: boolean;
  error?: string;
  value?: unknown;
  version?: number;
}

export function postAction(name: string, args: unknown[], id?: unknown): Promise<ActionResponse> {
  return enqueue(async () => {
    try {
      return await request<ActionResponse>(`/api/v1/actions/${name}`, { method: "POST", body: JSON.stringify({ args, id: typeof id === "string" ? id : undefined }) }, true);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Server tidak merespons." };
    }
  });
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

export async function uploadPhoto<T>(blob: Blob, meta: UploadMeta): Promise<T> {
  const fd = new FormData();
  fd.append("file", blob, `foto.${blob.type.split("/")[1] ?? "jpg"}`);
  for (const [k, v] of Object.entries(meta)) if (v != null) fd.append(k, String(v));
  const r = await request<{ ok: boolean; photo?: T; error?: string }>("/api/v1/photos", { method: "POST", body: fd }, true, 30_000);
  if (!r.ok || !r.photo) throw new Error(r.error ?? "Gagal mengunggah foto.");
  return r.photo;
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

/** WebSocket change feed with automatic reconnect. Calls onChange(version) for every server change. */
export function connectEvents(onChange: (version: number) => void, onOpen: () => void): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;
  let retry = 1000;
  const open = () => {
    if (stopped) return;
    const base = API_BASE || window.location.origin;
    ws = new WebSocket(`${base.replace(/^http/, "ws")}/api/v1/events`);
    ws.onopen = () => {
      retry = 1000;
      useApiStatus.setState({ status: "online" });
      onOpen();
    };
    ws.onmessage = (m) => {
      try {
        const msg = JSON.parse(String(m.data)) as { type: string; version: number };
        if (msg.type === "changed" || msg.type === "hello") onChange(msg.version);
      } catch {}
    };
    ws.onclose = () => {
      if (stopped) return;
      window.setTimeout(open, retry);
      retry = Math.min(retry * 2, 15_000);
    };
  };
  open();
  return () => {
    stopped = true;
    ws?.close();
  };
}
