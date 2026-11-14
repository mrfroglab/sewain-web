"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@/lib/types";

const AdminCtx = createContext<User | null>(null);

/** Provided by app/admin/layout.tsx once <RequireAuth role="admin"> has passed. */
export function AdminProvider({ user, children }: { user: User; children: ReactNode }) {
  return <AdminCtx value={user}>{children}</AdminCtx>;
}

/** The signed-in admin. Only usable inside the admin layout (every /admin page is). */
export function useAdmin(): User {
  const user = useContext(AdminCtx);
  if (!user) throw new Error("useAdmin() dipakai di luar layout admin.");
  return user;
}
