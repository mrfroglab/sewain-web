"use client";

import { BadgeCheck, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { isVerified } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";

/** One-tap demo accounts (users with `.demo`) for the pitch. */
export function DemoAccounts({ currentUserId, onPick }: { currentUserId?: string; onPick: (u: User) => void }) {
  const users = useAppStore((s) => s.users);
  const demo = useMemo(() => users.filter((u) => u.demo), [users]);

  return (
    <section aria-labelledby="akun-demo" className="lg:pt-2">
      <div className="mb-3 flex items-center gap-3 lg:hidden" aria-hidden>
        <span className="h-px flex-1 bg-border-gray" />
        <span className="text-caption text-ash">atau</span>
        <span className="h-px flex-1 bg-border-gray" />
      </div>
      <h2 id="akun-demo" className="text-body-lg font-semibold text-ink">
        Pakai akun demo
      </h2>
      <p className="mt-1 text-body-sm text-smoke">Sekali ketuk langsung masuk, tanpa OTP. Data demo tersimpan di browser ini.</p>
      <ul className="mt-4 divide-y divide-border-gray overflow-hidden rounded-card border border-border-gray">
        {demo.map((u) => {
          const current = u.id === currentUserId;
          return (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onPick(u)}
                className={cn("flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-soft-gray", current && "bg-soft-gray")}
              >
                <Avatar name={u.name} size={40} dark={u.role === "admin"} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-body-sm font-semibold text-ink">{u.demo!.label}</span>
                    {isVerified(u) ? <BadgeCheck className="size-3.5 text-ink" aria-label="Terverifikasi" /> : <Badge tone="outline">Belum verifikasi</Badge>}
                    {current && <Badge tone="ink">Sedang dipakai</Badge>}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-caption text-smoke">{u.demo!.persona}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ash" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
