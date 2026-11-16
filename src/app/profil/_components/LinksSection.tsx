"use client";

import { Bell, ChevronRight, Eye, Heart, LayoutDashboard, LifeBuoy, Megaphone, Package, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { useAppConfig } from "@/lib/config";
import type { User } from "@/lib/types";
import { ListBox, SectionTitle } from "./ui";

interface Item {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  count?: number;
}

/** Shortcuts to the rest of the app (mobile list style). */
export function LinksSection({ user, unread, openRentals }: { user: User; unread: number; openRentals: number }) {
  // F6.6 needs the v2 account endpoints; the v1 demo keeps its list as is.
  const fromServer = useAppConfig((s) => s.fromServer);
  const items: Item[] = [
    ...(user.role === "admin" ? [{ href: "/admin", label: "Panel admin", description: "Verifikasi, laporan, sengketa, komisi", icon: ShieldCheck }] : []),
    { href: "/sewaan", label: "Sewaan saya", description: openRentals ? `${openRentals} sedang berjalan` : "Riwayat sewa sebagai penyewa & penyedia", icon: Package, count: openRentals },
    { href: "/penyedia", label: "Dashboard penyedia", description: "Barangmu, request masuk, pendapatan", icon: LayoutDashboard },
    { href: "/favorit", label: "Favorit", description: "Barang yang kamu simpan", icon: Heart },
    { href: "/notifikasi", label: "Notifikasi", description: unread ? `${unread} belum dibaca` : "Semua sudah dibaca", icon: Bell, count: unread },
    { href: "/papan", label: "Papan permintaan", description: "“Ada yang punya…?” dari warga sekitar", icon: Megaphone },
    { href: `/u/${user.id}`, label: "Lihat profil publikku", description: "Seperti yang dilihat pengguna lain", icon: Eye },
    ...(fromServer ? [{ href: "/profil/pengaturan", label: "Pengaturan akun", description: "Sesi aktif, notifikasi, ekspor data, hapus akun", icon: Settings }] : []),
    { href: "/bantuan", label: "Bantuan", description: "Cara kerja, jaminan, sengketa, privasi", icon: LifeBuoy },
  ];

  return (
    <section className="mt-10" aria-labelledby="pintasan">
      <SectionTitle id="pintasan" title="Pintasan" />
      <ListBox>
        {items.map(({ href, label, description, icon: Icon, count }) => (
          <Link key={href} href={href} className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-soft-gray">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-soft-gray text-ink">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-semibold text-ink">{label}</span>
              <span className="block truncate text-caption text-smoke">{description}</span>
            </span>
            {count ? <Badge tone="ink">{count}</Badge> : null}
            <ChevronRight className="size-4 shrink-0 text-ash" />
          </Link>
        ))}
      </ListBox>
    </section>
  );
}
