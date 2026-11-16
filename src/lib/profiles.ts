"use client";

// Public profiles on demand: GET /api/v1/users/{id} → {ok, user, listings, reviews} (v2). A scoped snapshot only
// carries the users it refers to (SNAPSHOT_USERS=referenced), so a direct link to /u/<id>, or a name in a review,
// board post or chat whose profile is not in the snapshot, is fetched here and merged into the store without
// overwriting snapshot data (lib/store.ts › mergeRemoteProfile). v1 has no such endpoint (404): the snapshot stays
// the only source, exactly as before.

import { useEffect } from "react";
import { create } from "zustand";
import { apiCall, isOnline, useApiStatus } from "./api";
import { useAppConfig } from "./config";
import { mergeRemoteProfile, useAppStore } from "./store";
import type { ID, Listing, Review, User } from "./types";

export interface ProfileEntry {
  /** loading = first request in flight; ok/missing/error = last answer (data kept while a refresh runs) */
  status: "loading" | "ok" | "missing" | "error";
  /** when the last answer arrived (0 while the first request runs) */
  at: number;
  user?: User;
  listings: Listing[];
  reviews: Review[];
  error?: string;
}

export const useProfiles = create<{ entries: Record<ID, ProfileEntry> }>(() => ({ entries: {} }));

const inflight = new Map<ID, Promise<void>>();
const ERROR_RETRY_MS = 30_000;

function setEntry(id: ID, entry: ProfileEntry) {
  useProfiles.setState((s) => ({ entries: { ...s.entries, [id]: entry } }));
}

/**
 * Fetch one public profile unless a fresh enough answer is cached (`maxAgeMs`; a 404 is cached for the session,
 * an error is retried after 30 s). Never throws; does nothing offline.
 */
export function loadProfile(id: ID, maxAgeMs = Number.POSITIVE_INFINITY): Promise<void> {
  if (!id || !isOnline()) return Promise.resolve();
  const running = inflight.get(id);
  if (running) return running;
  const cur = useProfiles.getState().entries[id];
  if (cur && cur.status !== "loading") {
    const age = Date.now() - cur.at;
    if (cur.status === "error" ? age < ERROR_RETRY_MS : cur.status === "missing" || age < maxAgeMs) return Promise.resolve();
  }
  if (!cur) setEntry(id, { status: "loading", at: 0, listings: [], reviews: [] });
  const p = (async () => {
    const r = await apiCall<{ user?: User; listings?: Listing[]; reviews?: Review[] }>(`/api/v1/users/${encodeURIComponent(id)}`, { quiet401: true, timeoutMs: 8000 });
    const at = Date.now();
    const user = r.body.user;
    if (r.status === 200 && r.body.ok !== false && user && user.id === id) {
      const listings = Array.isArray(r.body.listings) ? r.body.listings : [];
      const reviews = Array.isArray(r.body.reviews) ? r.body.reviews : [];
      setEntry(id, { status: "ok", at, user, listings, reviews });
      mergeRemoteProfile({ user, listings, reviews });
    } else if (r.status === 404) {
      // v1 (no endpoint) or no such user.
      setEntry(id, { status: "missing", at, listings: [], reviews: [] });
    } else {
      const prev = useProfiles.getState().entries[id];
      // A failed refresh keeps the last good answer.
      if (prev?.status === "ok") setEntry(id, { ...prev, at });
      else setEntry(id, { status: "error", at, listings: [], reviews: [], error: r.body.error });
    }
  })().finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

/** Drop a cached error/404 and ask again (retry button). */
export function retryProfile(id: ID) {
  useProfiles.setState((s) => {
    const entries = { ...s.entries };
    delete entries[id];
    return { entries };
  });
  return loadProfile(id);
}

/**
 * /u/[id]: the profile response for `id`. Fetched when the snapshot has no such user, and on v2 servers always
 * (fresh listings and reviews), again after each new snapshot.
 */
export function usePublicProfile(id: ID): ProfileEntry | undefined {
  const online = useApiStatus((s) => s.status === "online");
  const lastSync = useApiStatus((s) => s.lastSync);
  const v2 = useAppConfig((s) => s.fromServer);
  const inSnapshot = useAppStore((s) => s.users.some((u) => u.id === id));
  useEffect(() => {
    if (!online) return;
    if (v2) void loadProfile(id, 5000);
    else if (!inSnapshot) void loadProfile(id);
  }, [id, online, v2, inSnapshot, lastSync]);
  return useProfiles((s) => s.entries[id]);
}

/**
 * Make sure the public profiles of `ids` are in the store (names/badges in reviews, board, chat, booking cards).
 * Only users the store does not know are fetched, once each.
 */
export function useEnsureUsers(ids: readonly (ID | null | undefined)[]) {
  const online = useApiStatus((s) => s.status === "online");
  const key = [...new Set(ids.filter((x): x is ID => !!x))].sort().join(",");
  const missing = useAppStore((s) => (key ? key.split(",").filter((id) => !s.users.some((u) => u.id === id)).join(",") : ""));
  useEffect(() => {
    if (!online || !missing) return;
    for (const id of missing.split(",")) void loadProfile(id);
  }, [online, missing]);
}
