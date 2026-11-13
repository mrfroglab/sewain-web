"use client";

import { ArrowRight, Bell, BookOpen, ClipboardList, Gauge, Heart, House, LayoutGrid, LogIn, LogOut, Megaphone, MessageCircle, Plus, Search, Shield, ShoppingBag, Store, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CATEGORIES } from "@/lib/data/categories";
import { publicName } from "@/lib/selectors";
import { useCurrentUser, useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { Avatar } from "../ui/Avatar";
import { LogoMark } from "../ui/Logo";

export function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useCurrentUser();
  const signOut = useSession((s) => s.signOut);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;

  const item = (href: string, label: string, Icon: typeof House) => (
    <Link href={href} onClick={onClose} className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-body-sm font-medium text-ink hover:bg-soft-gray">
      <Icon className="size-4 text-graphite" /> {label}
    </Link>
  );

  return createPortal(
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside className="animate-fade-up absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-white p-4 shadow-floating">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-[17px] font-bold">
            <LogoMark /> Sewain
          </span>
          <button type="button" onClick={onClose} aria-label="Tutup menu" className="grid size-9 place-items-center rounded-full hover:bg-soft-gray">
            <X className="size-4" />
          </button>
        </div>
        {user ? (
          <Link href="/profil" onClick={onClose} className="mb-3 flex items-center gap-3 rounded-[12px] bg-soft-gray p-3">
            <Avatar name={user.name} size={40} dark={user.role === "admin"} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body-sm font-semibold">{publicName(user)}</span>
              <span className="block text-caption text-smoke">{user.verification.status === "terverifikasi" ? "Terverifikasi" : "Belum verifikasi"} · {user.accountType === "toko" ? "Akun Toko" : "Individu"}</span>
            </span>
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <Link href="/masuk" onClick={onClose} className="mb-3 flex items-center gap-3 rounded-[12px] bg-ink p-3 text-white">
            <LogIn className="size-4" /> <span className="text-body-sm font-semibold">Masuk / daftar</span>
          </Link>
        )}
        <nav className="space-y-0.5" aria-label="Menu utama">
          {item("/", "Beranda", House)}
          {item("/cari", "Cari barang", Search)}
          {item("/papan", "Papan permintaan", Megaphone)}
          {user && item("/sewaan", "Sewaan saya", ShoppingBag)}
          {user && item("/chat", "Chat", MessageCircle)}
          {user && item("/notifikasi", "Notifikasi", Bell)}
          {user && item("/favorit", "Favorit", Heart)}
        </nav>
        <p className="mb-1 mt-4 px-3 text-micro font-semibold uppercase tracking-wide text-ash">Penyedia</p>
        <nav className="space-y-0.5">
          {item("/penyedia", "Dashboard penyedia", Gauge)}
          {item("/penyedia/barang/baru", "Sewakan barang baru", Plus)}
          {item("/penyedia#aturan", "Aturan sewa saya", ClipboardList)}
        </nav>
        {user?.role === "admin" && (
          <>
            <p className="mb-1 mt-4 px-3 text-micro font-semibold uppercase tracking-wide text-ash">Admin</p>
            <nav className="space-y-0.5">{item("/admin", "Panel admin", Shield)}</nav>
          </>
        )}
        <p className="mb-1 mt-4 px-3 text-micro font-semibold uppercase tracking-wide text-ash">Kategori</p>
        <nav className="space-y-0.5">
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={`/cari?kategori=${c.id}`} onClick={onClose} className="flex items-center gap-3 rounded-[10px] px-3 py-2 text-body-sm text-graphite hover:bg-soft-gray">
              <LayoutGrid className="size-3.5 text-ash" /> {c.name}
            </Link>
          ))}
        </nav>
        <div className="mt-4 space-y-0.5 border-t border-border-gray pt-3">
          {item("/bantuan", "Cara kerja & bantuan", BookOpen)}
          {item("/profil", "Akun", User)}
          {user && (
            <button
              type="button"
              onClick={() => {
                signOut();
                toast("Kamu sudah keluar.");
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-body-sm font-medium text-ink hover:bg-soft-gray"
            >
              <LogOut className="size-4 text-graphite" /> Keluar
            </button>
          )}
          {!user && item("/penyedia", "Buka toko rental", Store)}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
