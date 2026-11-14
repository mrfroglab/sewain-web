"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/components/ui/Gate";
import { AdminProvider } from "./_components/AdminContext";
import { AdminShell } from "./_components/AdminShell";

/**
 * Admin panel (PRD 9.8). Only the admin account gets past the gate; every /admin page renders
 * inside the shared chrome and can read the admin user with useAdmin() (or useCurrentUser()).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    // oxlint-disable-next-line jsx-a11y/aria-role -- `role` is RequireAuth's prop (who may enter), not an ARIA role
    <RequireAuth role="admin">
      {(user) => (
        <AdminProvider user={user}>
          <AdminShell user={user}>{children}</AdminShell>
        </AdminProvider>
      )}
    </RequireAuth>
  );
}
