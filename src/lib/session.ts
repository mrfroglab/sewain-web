"use client";

// Who is signed in *in this tab*. Kept in sessionStorage so two tabs can be two different people
// (renter in one window, provider in the other) while sharing the same demo data in localStorage.
// A new tab falls back to the last account used on this device.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { demoLogin, isOnline, setTokenProvider } from "./api";
import { useAppStore } from "./store";
import type { User } from "./types";

const LAST_KEY = "sewain-last-user";

interface SessionState {
  userId: string | null;
  /** API session token for userId (sewain-api, DEMO_MODE login). */
  token: string | null;
  tokenFor: string | null;
  hydrated: boolean;
  signIn: (userId: string) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      token: null,
      tokenFor: null,
      hydrated: false,
      signIn: (userId) => {
        set({ userId, token: null, tokenFor: null });
        if (isOnline()) void ensureToken();
        try {
          localStorage.setItem(LAST_KEY, userId);
        } catch {}
      },
      signOut: () => {
        set({ userId: null, token: null, tokenFor: null });
        try {
          localStorage.removeItem(LAST_KEY);
        } catch {}
      },
    }),
    {
      name: "sewain-session",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (s) => ({ userId: s.userId, token: s.token, tokenFor: s.tokenFor }),
    },
  ),
);

let tokenRequest: Promise<string | null> | null = null;

/** Token for the signed-in user; logs in through the API (queued after pending commands) when missing. */
async function ensureToken(): Promise<string | null> {
  const { userId, token, tokenFor } = useSession.getState();
  if (!userId) return null;
  if (token && tokenFor === userId) return token;
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

export async function bootSession() {
  await useSession.persist.rehydrate();
  if (!useSession.getState().userId) {
    try {
      const last = localStorage.getItem(LAST_KEY);
      if (last) useSession.setState({ userId: last });
    } catch {}
  }
  useSession.setState({ hydrated: true });
}

/** The signed-in user in this tab, or null (guest). Only meaningful once useReady() is true. */
export function useCurrentUser(): User | null {
  const id = useSession((s) => s.userId);
  return useAppStore((s) => (id ? s.users.find((u) => u.id === id) ?? null : null));
}

/** Both the demo data and the tab session are loaded. Gate data-dependent UI on this. */
export function useReady(): boolean {
  const a = useAppStore((s) => s.hydrated);
  const b = useSession((s) => s.hydrated);
  return a && b;
}
