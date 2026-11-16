"use client";

// Who is signed in *in this tab*. Kept in sessionStorage so two tabs can be two different people
// (renter in one window, provider in the other) while sharing the same demo data in localStorage.
// A new tab falls back to the last account used on this device.
//
// Three kinds of session (F6.1):
// - "demo":   persona picker / simulated OTP. Token from POST /auth/demo-login (DEMO_MODE servers), refreshed freely.
// - "bearer": real OTP on a DEMO_MODE/staging server (transport "bearer"), so per-tab accounts keep working and a
//             local web can talk to the staging API cross-site. The token cannot be refreshed: 401 = sign in again.
// - "cookie": production (D6). The session lives in the HttpOnly `sewain_session` cookie, JavaScript never sees a
//             token. 401 = sign in again.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { fetchMe, logoutServer } from "./account";
import { demoLogin, isOnline, setIncludeCredentials, setTokenProvider, setUnauthorizedHandler } from "./api";
import { useAppConfig } from "./config";
import { dropPushOnLogout, reattachPush } from "./push";
import { resyncForViewer, setSessionBridge, useAppStore } from "./store";
import { toast } from "./toast";
import type { User } from "./types";

const LAST_KEY = "sewain-last-user";
/** {transport, token} of the last real (OTP) sign-in on this device, so a new tab stays signed in. */
const LAST_AUTH_KEY = "sewain-last-auth";

export type SessionTransport = "demo" | "bearer" | "cookie";

interface SessionState {
  userId: string | null;
  transport: SessionTransport;
  /** API session token for userId: demo login or OTP bearer. Always null for cookie sessions. */
  token: string | null;
  tokenFor: string | null;
  hydrated: boolean;
  /** Persona picker / simulated OTP (demo token), or a verified OTP session. */
  signIn: (userId: string, auth?: { transport: SessionTransport; token?: string | null }) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      userId: null,
      transport: "demo",
      token: null,
      tokenFor: null,
      hydrated: false,
      signIn: (userId, auth) => {
        const transport = auth?.transport ?? "demo";
        const token = transport === "bearer" ? auth?.token ?? null : null;
        set({ userId, transport, token, tokenFor: token ? userId : null });
        setIncludeCredentials(transport === "cookie");
        expiring = false;
        if (transport === "demo" && isOnline()) void ensureToken();
        try {
          localStorage.setItem(LAST_KEY, userId);
          if (transport === "demo") localStorage.removeItem(LAST_AUTH_KEY);
          else localStorage.setItem(LAST_AUTH_KEY, JSON.stringify({ transport, token }));
        } catch {}
        // A scoped (v2) snapshot belongs to one viewer: fetch the one for the new account.
        resyncForViewer();
        void reattachPush().catch(() => {});
      },
      signOut: () => {
        const { userId, transport, token } = get();
        set({ userId: null, transport: "demo", token: null, tokenFor: null });
        setIncludeCredentials(false);
        clearLast();
        if (userId && useAppConfig.getState().fromServer) void serverLogout(transport, token, userId);
        resyncForViewer();
      },
    }),
    {
      name: "sewain-session",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (s) => ({ userId: s.userId, transport: s.transport, token: s.token, tokenFor: s.tokenFor }),
    },
  ),
);

function clearLast() {
  try {
    localStorage.removeItem(LAST_KEY);
    localStorage.removeItem(LAST_AUTH_KEY);
  } catch {}
}

/** Logout on the server with the credentials of the session that was just cleared locally: push first, then the session. */
async function serverLogout(transport: SessionTransport, token: string | null, userId: string) {
  const cookie = transport === "cookie";
  // Demo sessions: the persona token may not be cached in this tab; nothing to revoke then.
  const t = transport === "demo" ? token ?? otherTokens.get(userId) ?? null : token;
  if (transport === "demo" && !t) return;
  await dropPushOnLogout(t, cookie).catch(() => {});
  await logoutServer(t, cookie);
  otherTokens.delete(userId);
}

let tokenRequest: Promise<string | null> | null = null;

/**
 * Token for the signed-in user. "" = cookie session (credentials travel as a cookie), null = none (guest, or an OTP
 * bearer session that was lost). Demo sessions log in through the API when missing.
 */
async function ensureToken(): Promise<string | null> {
  const { userId, token, tokenFor, transport } = useSession.getState();
  if (!userId) return null;
  if (transport === "cookie") return "";
  if (token && tokenFor === userId) return token;
  if (transport === "bearer") return null;
  if (!tokenRequest) {
    tokenRequest = demoLogin(userId).then((t) => {
      if (t && useSession.getState().userId === userId) useSession.setState({ token: t, tokenFor: userId });
      return t;
    });
    void tokenRequest.finally(() => (tokenRequest = null));
  }
  return tokenRequest;
}

setTokenProvider(ensureToken);

/** Tokens of other accounts on this device (demo: the persona switcher), for actions still queued under them. */
const otherTokens = new Map<string, string>();

async function tokenForUser(userId: string): Promise<string | null> {
  if (userId === useSession.getState().userId) return ensureToken();
  const cached = otherTokens.get(userId);
  if (cached) return cached;
  // Only works on a DEMO_MODE server; elsewhere the entry waits until that account signs in on this device again.
  const t = await demoLogin(userId);
  if (t) otherTokens.set(userId, t);
  return t;
}

const isRealSession = () => {
  const s = useSession.getState();
  return !!s.userId && s.transport !== "demo";
};

let expiring = false;

/**
 * A real session ended (expired, revoked from another device, account deleted): sign out locally and send the user to
 * /masuk with next= so they land back here. Demo sessions just fetch a new token instead.
 */
export function sessionExpired() {
  if (!isRealSession() || expiring) return;
  expiring = true;
  const here = `${window.location.pathname}${window.location.search}`;
  useSession.setState({ userId: null, transport: "demo", token: null, tokenFor: null });
  setIncludeCredentials(false);
  clearLast();
  toast("Sesimu sudah berakhir. Masuk lagi, ya.", "info");
  if (window.location.pathname.startsWith("/masuk")) {
    expiring = false;
    resyncForViewer();
    return;
  }
  window.location.assign(`/masuk?next=${encodeURIComponent(here)}`);
}

setUnauthorizedHandler(() => {
  if (isRealSession()) sessionExpired();
  else {
    const { userId } = useSession.getState();
    if (userId) useSession.setState({ token: null, tokenFor: null });
  }
});

setSessionBridge({
  currentUserId: () => useSession.getState().userId,
  tokenFor: tokenForUser,
  dropToken: (userId) => {
    otherTokens.delete(userId);
    const s = useSession.getState();
    if (s.userId !== userId) return;
    if (s.transport === "demo") useSession.setState({ token: null, tokenFor: null });
    else sessionExpired();
  },
  viewerMismatch: () => sessionExpired(),
  afterConfig: restoreCookieSession,
});

/**
 * Production (no demo mode): the cookie is the source of truth. Pick up a session made in another tab, and drop a
 * local "signed in" that the server no longer knows. Demo servers keep today's behaviour untouched.
 */
async function restoreCookieSession(): Promise<void> {
  const cfg = useAppConfig.getState();
  if (!cfg.fromServer || cfg.demoMode) return;
  const s = useSession.getState();
  if (s.userId && s.transport !== "cookie") return; // a bearer session (rare outside demo) manages itself
  setIncludeCredentials(true);
  const r = await fetchMe();
  const id = r.body.ok ? r.body.user?.id : undefined;
  if (id) {
    if (useSession.getState().userId !== id) useSession.setState({ userId: id, transport: "cookie", token: null, tokenFor: null });
    return;
  }
  if (r.status === 401) {
    if (useSession.getState().userId) {
      useSession.setState({ userId: null, transport: "demo", token: null, tokenFor: null });
      clearLast();
    }
    setIncludeCredentials(false);
  }
  // status 0 (offline) or other errors: keep the local session, the next request will tell.
}

export async function bootSession() {
  await useSession.persist.rehydrate();
  if (!useSession.getState().userId) {
    try {
      const last = localStorage.getItem(LAST_KEY);
      const auth = JSON.parse(localStorage.getItem(LAST_AUTH_KEY) ?? "null") as { transport?: SessionTransport; token?: string | null } | null;
      if (last) {
        const transport: SessionTransport = auth?.transport === "bearer" || auth?.transport === "cookie" ? auth.transport : "demo";
        const token = transport === "bearer" ? auth?.token ?? null : null;
        useSession.setState({ userId: last, transport, token, tokenFor: token ? last : null });
      }
    } catch {}
  }
  setIncludeCredentials(useSession.getState().transport === "cookie");
  useSession.setState({ hydrated: true });
}

/** The signed-in user in this tab, or null (guest). Only meaningful once useReady() is true. */
export function useCurrentUser(): User | null {
  const id = useSession((s) => s.userId);
  return useAppStore((s) => (id ? s.users.find((u) => u.id === id) ?? null : null));
}

/** Signed in with a real OTP session (not a demo persona): real KYC upload, account settings, server logout. */
export function useRealSession(): boolean {
  return useSession((s) => !!s.userId && s.transport !== "demo");
}

/** Both the demo data and the tab session are loaded. Gate data-dependent UI on this. */
export function useReady(): boolean {
  const a = useAppStore((s) => s.hydrated);
  const b = useSession((s) => s.hydrated);
  return a && b;
}
