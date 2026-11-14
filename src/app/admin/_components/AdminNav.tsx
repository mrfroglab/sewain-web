"use client";

import { Ban, Flag, IdCard, LayoutDashboard, Percent, Scale, ScrollText, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/components/ui/cn";
import { type AdminCountKey, useAdminCounts } from "./useAdminCounts";

interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  count?: AdminCountKey;
}

/** Admin sections (PRD 9.8). Order is fixed: queues first, then settings, then the audit log. */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Ringkasan", Icon: LayoutDashboard },
  { href: "/admin/verifikasi", label: "Verifikasi", Icon: IdCard, count: "verifikasi" },
  { href: "/admin/laporan", label: "Laporan", Icon: Flag, count: "laporan" },
  { href: "/admin/sengketa", label: "Sengketa", Icon: Scale, count: "sengketa" },
  { href: "/admin/pengguna", label: "Pengguna", Icon: Users },
  { href: "/admin/komisi", label: "Komisi", Icon: Percent },
  { href: "/admin/jaminan", label: "Saran jaminan", Icon: ShieldCheck },
  { href: "/admin/kata-terlarang", label: "Kata terlarang", Icon: Ban },
  { href: "/admin/audit", label: "Log audit", Icon: ScrollText },
];

const COUNT_LABEL: Record<AdminCountKey, string> = {
  verifikasi: "verifikasi menunggu",
  laporan: "laporan baru",
  sengketa: "sengketa dalam mediasi",
};

const isActive = (path: string, href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));

function CountBadge({ n, label, inverted }: { n: number; label: string; inverted: boolean }) {
  if (n <= 0) return null;
  return (
    <span
      aria-label={`${n} ${label}`}
      title={`${n} ${label}`}
      className={cn("grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums", inverted ? "bg-white text-ink" : "bg-ink text-white")}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

/**
 * Admin navigation. `side` = vertical list for the 220px desktop column,
 * `pills` = horizontally scrollable pill row for phones (the active pill is scrolled into view).
 */
export function AdminNav({ variant, className }: { variant: "side" | "pills"; className?: string }) {
  const path = usePathname();
  const counts = useAdminCounts();
  const scroller = useRef<HTMLUListElement>(null);
  const activeItem = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (variant !== "pills") return;
    const ul = scroller.current;
    const li = activeItem.current;
    // Scroll horizontally only (scrollIntoView could also move the page vertically).
    if (ul && li) ul.scrollLeft = Math.max(0, li.offsetLeft - (ul.clientWidth - li.clientWidth) / 2);
  }, [path, variant]);

  if (variant === "pills")
    return (
      <nav aria-label="Menu admin" className={cn("-mx-4 sm:-mx-6", className)}>
        <ul ref={scroller} className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth px-4 py-0.5 sm:px-6">
          {ADMIN_NAV.map(({ href, label, Icon, count }) => {
            const active = isActive(path, href);
            return (
              <li key={href} ref={active ? activeItem : undefined} className="shrink-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-control border px-3.5 text-nav font-medium transition-colors",
                    active ? "border-ink bg-ink text-white" : "border-border-gray bg-white text-ink hover:border-ink",
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={2} />
                  {label}
                  {count && <CountBadge n={counts[count]} label={COUNT_LABEL[count]} inverted={active} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );

  return (
    <nav aria-label="Menu admin" className={className}>
      <ul className="space-y-0.5">
        {ADMIN_NAV.map(({ href, label, Icon, count }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-control px-3.5 text-body-sm font-medium transition-colors",
                  active ? "bg-ink text-white" : "text-graphite hover:bg-soft-gray hover:text-ink",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {count && <CountBadge n={counts[count]} label={COUNT_LABEL[count]} inverted={active} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
