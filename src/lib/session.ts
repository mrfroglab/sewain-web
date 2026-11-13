"use client";

// Who is signed in *in this tab*. Kept in sessionStorage so two tabs can be two different people
// (renter in one window, provider in the other) while sharing the same demo data in localStorage.
// A new tab falls back to the last account used on this device.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useAppStore } from "./store";
import type { User } from "./types";

const LAST_KEY = "sewain-last-user";

interface SessionState {
  userId: string | null;
  hydrated: boolean;
  signIn: (userId: string) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      userId: null,
      hydrated: false,
      signIn: (userId) => {
        set({ userId });
        try {
          localStorage.setItem(LAST_KEY, userId);
        } catch {}
      },
      signOut: () => {
        set({ userId: null });
        try {
          localStorage.removeItem(LAST_KEY);
        } catch {}
      },
    }),
    {
      name: "sewain-session",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true,
      partialize: (s) => ({ userId: s.userId }),
    },
  ),
);

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
