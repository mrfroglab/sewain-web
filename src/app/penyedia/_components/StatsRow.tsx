"use client";

import type { ReactNode } from "react";
import { Stars } from "@/components/ui/Stars";
import { rupiah } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import type { ProviderData } from "./useProviderData";

function Stat({ label, value, note, href, className }: { label: string; value: ReactNode; note?: ReactNode; href?: string; className?: string }) {
  const body = (
    <>
      <p className="text-caption font-medium text-smoke">{label}</p>
      <div className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.5px] text-ink">{value}</div>
      {note && <div className="mt-1 text-caption text-smoke">{note}</div>}
    </>
  );
  const cls = `block rounded-card bg-soft-gray p-4 ${className ?? ""}`;
  return href ? (
    <a href={href} className={`${cls} transition-colors hover:bg-image-gray`}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Listing aktif · request menunggu · sedang disewa · pendapatan bulan ini (P1) · rating. */
export function StatsRow({ data }: { data: ProviderData }) {
  const { stats } = data;
  const commissionActive = useAppStore((s) => s.commission.active);
  const month = new Date(data.now).toLocaleDateString("id-ID", { month: "long" });
  return (
    <section aria-label="Ringkasan" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
      <Stat
        className="col-span-2 sm:col-span-4 lg:col-span-1"
        label={`Pendapatan ${month}`}
        value={rupiah(stats.income)}
        note={`${stats.incomeCount} sewa · ${commissionActive ? "sebelum komisi" : "komisi 0% selama pilot"}`}
      />
      <Stat label="Request menunggu" value={stats.waiting} note={stats.waiting ? "Respons sebelum 24 jam" : "Belum ada"} href="#request" />
      <Stat label="Sedang disewa" value={stats.renting} note="Barang di tangan penyewa" href="#berjalan" />
      <Stat label="Listing aktif" value={stats.activeListings} note="Tampil di pencarian" href="#listing" />
      <Stat
        label="Rating kamu"
        value={stats.rating.rating ? stats.rating.rating.toFixed(1) : "Baru"}
        note={<Stars rating={stats.rating.rating} count={stats.rating.count} showScore={false} />}
      />
    </section>
  );
}
