"use client";

import { House, MessageCircle, Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { totalUnreadMessages } from "@/lib/selectors";
import { useCurrentUser, useReady } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import { cn } from "../ui/cn";

const TABS = [
  { href: "/", label: "Beranda", Icon: House, match: (p: string) => p === "/" },
  { href: "/cari", label: "Cari", Icon: Search, match: (p: string) => p.startsWith("/cari") || p.startsWith("/barang") },
  { href: "/sewaan", label: "Sewaan", Icon: ShoppingBag, match: (p: string) => p.startsWith("/sewaan") && !p.endsWith("/chat") },
  { href: "/chat", label: "Chat", Icon: MessageCircle, match: (p: string) => p.startsWith("/chat") || p.endsWith("/chat") },
  { href: "/profil", label: "Akun", Icon: User, match: (p: string) => p.startsWith("/profil") || p.startsWith("/masuk") || p.startsWith("/penyedia") || p.startsWith("/admin") },
];

/** Mobile bottom navigation (PWA). White bar, black active state — no colored surfaces. Hidden on desktop. */
export function TabBar() {
  const path = usePathname();
  const ready = useReady();
  const user = useCurrentUser();
  const unread = useAppStore(useShallow((s) => (user ? totalUnreadMessages(s, user.id) : 0)));
  return (
    <nav aria-label="Navigasi bawah" className="fixed inset-x-0 bottom-0 z-[600] border-t border-border-gray bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid h-[var(--tabbar-h)] max-w-lg grid-cols-5">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative flex h-full flex-col items-center justify-center gap-1 text-[10px] font-medium", active ? "text-ink" : "text-ash")}>
                <span className={cn("relative grid h-7 w-12 place-items-center rounded-control transition-colors", active && "bg-soft-gray")}>
                  <Icon className="size-[19px]" strokeWidth={active ? 2.2 : 1.8} />
                  {href === "/chat" && ready && unread > 0 && <span className="absolute right-2 top-0.5 size-2 rounded-full bg-ink ring-2 ring-white" />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
