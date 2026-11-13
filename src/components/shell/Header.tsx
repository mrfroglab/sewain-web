"use client";

import { Bell, ChevronDown, Menu, MapPin, MessageCircle, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { CATEGORIES } from "@/lib/data/categories";
import { isOpenBooking, publicName, totalUnreadMessages, unreadNotifications } from "@/lib/selectors";
import { useCurrentUser, useReady } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import { Avatar } from "../ui/Avatar";
import { cn } from "../ui/cn";
import { Logo } from "../ui/Logo";
import { PillLink, pillClass } from "../ui/Pill";
import { LocationSheet, useSearchLabel } from "./LocationSheet";
import { MenuDrawer } from "./MenuDrawer";

function CountDot({ n }: { n: number }) {
  if (!n) return null;
  return <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[9px] font-semibold text-white ring-2 ring-white">{n > 9 ? "9+" : n}</span>;
}

function SearchField({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/cari${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
      }}
    >
      <label htmlFor="global-search" className="sr-only">
        Cari barang
      </label>
      <input
        id="global-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari tenda, kamera, kebaya, proyektor…"
        className="h-10 w-full rounded-control border border-border-gray bg-soft-gray pl-4 pr-11 text-body-sm text-ink placeholder:text-smoke focus:border-ink focus:bg-white focus:outline-none"
      />
      <button type="submit" aria-label="Cari" className="absolute right-1 top-1 grid size-8 place-items-center rounded-full text-ink hover:bg-white">
        <Search className="size-4" />
      </button>
    </form>
  );
}

export function Header() {
  const ready = useReady();
  const user = useCurrentUser();
  const path = usePathname();
  const counts = useAppStore(
    useShallow((s) => {
      if (!user) return { notif: 0, chat: 0, open: 0 };
      return {
        notif: unreadNotifications(s, user.id),
        chat: totalUnreadMessages(s, user.id),
        open: s.bookings.filter((b) => (b.renterId === user.id || b.providerId === user.id) && isOpenBooking(b)).length,
      };
    }),
  );
  const [menu, setMenu] = useState(false);
  const [loc, setLoc] = useState(false);
  const [cats, setCats] = useState(false);
  const label = useSearchLabel();
  const show = ready && !!user;

  return (
    <header className="sticky top-0 z-[500] border-b border-border-gray bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* Row 1: menu · logo (centered) · utilities */}
        <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setMenu(true)} aria-label="Buka menu" className="-ml-2 grid size-9 place-items-center rounded-full hover:bg-soft-gray">
              <Menu className="size-5" />
            </button>
            <nav className="hidden items-center gap-5 text-nav font-medium text-graphite lg:flex" aria-label="Utama">
              <Link href="/cari" className={cn("hover:text-ink", path.startsWith("/cari") && "text-ink")}>Cari barang</Link>
              <Link href="/papan" className={cn("hover:text-ink", path.startsWith("/papan") && "text-ink")}>Papan permintaan</Link>
              <Link href="/bantuan" className={cn("hover:text-ink", path.startsWith("/bantuan") && "text-ink")}>Cara kerja</Link>
            </nav>
          </div>
          <Logo />
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <Link href="/penyedia" className="mr-2 hidden text-nav font-medium text-graphite hover:text-ink lg:inline">
              Sewakan barang
            </Link>
            {show && (
              <>
                <Link href="/chat" aria-label={`Chat${counts.chat ? `, ${counts.chat} belum dibaca` : ""}`} className="relative hidden size-9 place-items-center rounded-full hover:bg-soft-gray sm:grid">
                  <MessageCircle className="size-5" />
                  <CountDot n={counts.chat} />
                </Link>
                <Link href="/notifikasi" aria-label={`Notifikasi${counts.notif ? `, ${counts.notif} baru` : ""}`} className="relative grid size-9 place-items-center rounded-full hover:bg-soft-gray">
                  <Bell className="size-5" />
                  <CountDot n={counts.notif} />
                </Link>
              </>
            )}
            <Link href="/sewaan" aria-label="Sewaan saya" className="relative grid size-9 place-items-center rounded-full hover:bg-soft-gray">
              <ShoppingBag className="size-5" />
              {show && <CountDot n={counts.open} />}
            </Link>
            {ready && (
              user ? (
                <Link href="/profil" className="ml-1 hidden items-center gap-2 rounded-control border border-border-gray py-1 pl-1 pr-3 hover:border-ink sm:inline-flex">
                  <Avatar name={user.name} size={26} dark={user.role === "admin"} />
                  <span className="max-w-24 truncate text-nav font-medium">{publicName(user)}</span>
                </Link>
              ) : (
                <Link href={`/masuk?next=${encodeURIComponent(path)}`} className={pillClass(false, "ml-1 hidden sm:inline-flex")}>
                  Masuk
                </Link>
              )
            )}
          </div>
        </div>

        {/* Row 2: categories · location/radius · search · quick filters */}
        <div className="flex items-center gap-2 pb-3">
          <div className="relative hidden lg:block">
            <button type="button" className={pillClass(cats)} aria-expanded={cats} onClick={() => setCats((v) => !v)}>
              Kategori <ChevronDown className="size-3.5" />
            </button>
            {cats && (
              <div className="absolute left-0 top-10 z-10 w-64 rounded-[12px] bg-white p-2 shadow-floating ring-1 ring-black/5" onMouseLeave={() => setCats(false)}>
                {CATEGORIES.map((c) => (
                  <Link key={c.id} href={`/cari?kategori=${c.id}`} onClick={() => setCats(false)} className="block rounded-[8px] px-3 py-2 hover:bg-soft-gray">
                    <span className="block text-body-sm font-medium">{c.name}</span>
                    <span className="block text-caption text-smoke">{c.examples}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => setLoc(true)} className={pillClass(false, "max-w-[42%] sm:max-w-none")} aria-label={`Lokasi pencarian: ${ready ? label : "memuat"}`}>
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{ready ? label : "Kampus UGM · 3 km"}</span>
          </button>
          <SearchField className="min-w-0 flex-1 lg:max-w-xl" />
          <div className="no-scrollbar hidden min-w-0 gap-2 overflow-x-auto xl:flex">
            <PillLink href="/cari?jaminan=cukup-identitas">Cukup titip KTM</PillLink>
            <PillLink href="/cari?penyedia=toko">Toko rental</PillLink>
            <PillLink href="/cari?serah=cod">Bisa COD</PillLink>
          </div>
        </div>
      </div>
      <MenuDrawer open={menu} onClose={() => setMenu(false)} />
      <LocationSheet open={loc} onClose={() => setLoc(false)} />
    </header>
  );
}
