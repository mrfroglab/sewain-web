"use client";

import { ChevronRight, Search, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/Layout";
import { Tabs } from "@/components/ui/Tabs";
import { areaName } from "@/lib/data/areas";
import { maskPhone } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import type { User } from "@/lib/types";
import { AdminTitle } from "../../_components/AdminUi";
import { STATUS_LABEL, VERIFICATION_LABEL, accountLabel } from "./labels";
import { UserDetailSheet } from "./UserDetailSheet";

type Filter = "semua" | "belum" | "strike" | "suspend" | "blacklist";

const MATCH: Record<Filter, (u: User) => boolean> = {
  semua: () => true,
  belum: (u) => u.verification.status !== "terverifikasi",
  strike: (u) => u.strikes > 0,
  suspend: (u) => u.status === "suspend",
  blacklist: (u) => u.status === "blacklist",
};

const norm = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

const haystack = (u: User) => norm([u.name, u.nickname, u.store?.name, u.phone, u.email, u.verification.nikMasked, u.id, areaName(u.areaId)].filter(Boolean).join(" "));

const COLS = "lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_128px_56px_104px_16px]";

/** Admin user list: search + filters; the detail sheet is driven by ?u=<id> so other admin pages can deep-link. */
export function UserDirectory() {
  const users = useAppStore((s) => s.users);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("semua");

  const selected = users.find((u) => u.id === params.get("u"));
  const openUser = (id: string) => router.replace(`${pathname}?u=${encodeURIComponent(id)}`, { scroll: false });
  const close = useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);

  const counts = useMemo(() => {
    const c = {} as Record<Filter, number>;
    for (const f of Object.keys(MATCH) as Filter[]) c[f] = users.filter(MATCH[f]).length;
    return c;
  }, [users]);

  const list = useMemo(() => {
    const words = norm(q.trim()).split(/\s+/).filter(Boolean);
    return users
      .filter((u) => MATCH[filter](u) && (words.length === 0 || words.every((w) => haystack(u).includes(w))))
      .sort((a, b) => Number(a.role === "admin") - Number(b.role === "admin") || a.name.localeCompare(b.name, "id"));
  }, [users, q, filter]);

  return (
    <>
      <AdminTitle
        title="Pengguna"
        subtitle="Admin melihat nama lengkap dan NIK tersamar. Pengguna lain hanya melihat nama panggilan dan status Terverifikasi. Sanksi bertingkat: strike → suspend → blacklist NIK."
      />

      <div className="relative">
        <label htmlFor="cari-pengguna" className="sr-only">
          Cari pengguna
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-smoke" />
        <input
          id="cari-pengguna"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama, nama toko, nomor HP, atau NIK…"
          className="h-11 w-full rounded-control border border-border-gray bg-soft-gray pl-11 pr-4 text-body text-ink placeholder:text-smoke focus:border-ink focus:bg-white focus:outline-none"
        />
      </div>

      <Tabs
        value={filter}
        onChange={setFilter}
        className="-mx-4 mt-3 px-4 sm:mx-0 sm:px-0"
        items={[
          { value: "semua", label: "Semua", count: counts.semua },
          { value: "belum", label: "Belum terverifikasi", count: counts.belum },
          { value: "strike", label: "Ada strike", count: counts.strike },
          { value: "suspend", label: "Ditangguhkan", count: counts.suspend },
          { value: "blacklist", label: "Diblokir", count: counts.blacklist },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState className="mt-5" icon={<Users className="size-5" />} title="Tidak ada pengguna yang cocok" description="Coba kata kunci lain atau ganti filter." />
      ) : (
        <div className="mt-5">
          <div className={cn("hidden gap-4 border-b border-border-gray px-3 pb-2 text-caption font-medium text-smoke lg:grid", COLS)}>
            <span>Pengguna</span>
            <span>Tipe akun</span>
            <span>Verifikasi</span>
            <span>Strike</span>
            <span>Status</span>
            <span />
          </div>
          <ul className="divide-y divide-border-gray">
            {list.map((u) => (
              <li key={u.id}>
                <UserRow user={u} onOpen={() => openUser(u.id)} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-caption text-smoke">{list.length} pengguna ditampilkan.</p>
        </div>
      )}

      {selected && <UserDetailSheet key={selected.id} user={selected} onClose={close} />}
    </>
  );
}

function UserRow({ user: u, onOpen }: { user: User; onOpen: () => void }) {
  const verified = u.verification.status === "terverifikasi";
  return (
    <button type="button" onClick={onOpen} className={cn("grid w-full grid-cols-[minmax(0,1fr)_16px] items-center gap-4 rounded-[12px] px-3 py-3 text-left transition-colors hover:bg-soft-gray", COLS)}>
      <span className="flex min-w-0 items-center gap-3">
        <Avatar name={u.name} size={38} dark={u.role === "admin"} />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-body-sm font-semibold text-ink">{u.name}</span>
            {u.role === "admin" && <Badge tone="ink">Admin</Badge>}
          </span>
          <span className="block truncate text-caption text-smoke">
            {u.nickname ? `“${u.nickname}” · ` : ""}
            {maskPhone(u.phone)} · {areaName(u.areaId)}
          </span>
          {/* Phone: the table columns collapse into one badge line. */}
          <span className="mt-1.5 flex flex-wrap gap-1 lg:hidden">
            <Badge tone="outline">{accountLabel(u)}</Badge>
            <Badge tone={verified ? "soft" : "outline"}>{VERIFICATION_LABEL[u.verification.status]}</Badge>
            {u.strikes > 0 && <Badge tone="ink">{u.strikes} strike</Badge>}
            {u.status !== "aktif" && <Badge tone="ink">{STATUS_LABEL[u.status]}</Badge>}
          </span>
        </span>
      </span>
      <span className="hidden truncate text-body-sm text-graphite lg:block">{accountLabel(u)}</span>
      <span className="hidden lg:block">
        <Badge tone={verified ? "soft" : "outline"}>{VERIFICATION_LABEL[u.verification.status]}</Badge>
      </span>
      <span className={cn("hidden text-body-sm tabular-nums lg:block", u.strikes > 0 ? "font-semibold text-ink" : "text-ash")}>{u.strikes > 0 ? u.strikes : "–"}</span>
      <span className="hidden lg:block">
        <Badge tone={u.status === "aktif" ? "soft" : "ink"}>{STATUS_LABEL[u.status]}</Badge>
      </span>
      <ChevronRight className="size-4 text-ash" />
    </button>
  );
}
