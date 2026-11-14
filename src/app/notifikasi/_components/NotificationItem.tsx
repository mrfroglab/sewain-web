"use client";

import { BadgeCheck, ChevronRight, Info, Megaphone, MessageCircle, Scale, ShoppingBag, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { relativeTime } from "@/lib/format";
import type { AppNotification, NotificationKind } from "@/lib/types";

export const KIND: Record<NotificationKind, { label: string; Icon: LucideIcon }> = {
  booking: { label: "Sewaan", Icon: ShoppingBag },
  chat: { label: "Chat", Icon: MessageCircle },
  sengketa: { label: "Sengketa", Icon: Scale },
  papan: { label: "Papan permintaan", Icon: Megaphone },
  sistem: { label: "Sistem", Icon: Info },
  verifikasi: { label: "Verifikasi", Icon: BadgeCheck },
};

/** One notification. Tapping marks it read and opens its target (if any). */
export function NotificationItem({ n, now, onRead }: { n: AppNotification; now: number; onRead: (id: string) => void }) {
  const router = useRouter();
  const { label, Icon } = KIND[n.kind] ?? KIND.sistem;
  const open = () => {
    if (!n.read) onRead(n.id);
    if (n.href) router.push(n.href);
  };
  return (
    <li>
      <button
        type="button"
        onClick={open}
        className={cn("flex w-full items-start gap-3 rounded-[12px] px-2 py-3 text-left transition-colors hover:bg-soft-gray", !n.href && n.read && "cursor-default hover:bg-transparent")}
      >
        <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-full", n.read ? "bg-soft-gray text-graphite" : "bg-ink text-white")}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-micro font-medium uppercase tracking-[0.06em] text-smoke">{label}</span>
            <span className="ml-auto shrink-0 text-caption text-smoke">{relativeTime(n.at, now)}</span>
            {!n.read && (
              <span className="size-2 shrink-0 rounded-full bg-ink">
                <span className="sr-only">Belum dibaca</span>
              </span>
            )}
          </span>
          <span className={cn("mt-0.5 block text-body", n.read ? "font-medium text-graphite" : "font-semibold text-ink")}>{n.title}</span>
          <span className="mt-0.5 block text-body-sm text-smoke">{n.body}</span>
        </span>
        {n.href && <ChevronRight className="mt-3 size-4 shrink-0 text-ash" aria-hidden />}
      </button>
    </li>
  );
}
