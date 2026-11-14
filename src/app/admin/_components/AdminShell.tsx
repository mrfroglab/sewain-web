"use client";

import { Shield } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Container } from "@/components/ui/Layout";
import type { User } from "@/lib/types";
import { AdminNav } from "./AdminNav";

/** Two-column admin chrome on desktop (220px nav + content), pill nav on top on phones. */
export function AdminShell({ user, children }: { user: User; children: ReactNode }) {
  return (
    <Container className="pb-12 pt-4 lg:pt-8">
      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-[132px]">
            <p className="flex items-center gap-2 px-3.5 text-caption font-semibold uppercase tracking-[0.08em] text-smoke">
              <Shield className="size-3.5" /> Panel admin
            </p>
            <AdminNav variant="side" className="mt-3" />
            <div className="mt-6 flex items-center gap-2.5 border-t border-border-gray px-3.5 pt-4">
              <Avatar name={user.name} size={30} dark />
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold text-ink">{user.name}</p>
                <p className="text-micro text-smoke">Setiap tindakan tercatat di log audit.</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 lg:hidden">
            <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.08em] text-smoke">
              <Shield className="size-3.5" /> Panel admin
            </p>
            <AdminNav variant="pills" className="mt-2.5" />
          </div>
          {children}
        </div>
      </div>
    </Container>
  );
}
