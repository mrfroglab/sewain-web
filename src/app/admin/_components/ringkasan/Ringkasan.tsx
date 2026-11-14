"use client";

import { BadgeCheck, Banknote, ChevronRight, Flag, IdCard, Package, Scale, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/components/ui/cn";
import { formatDateTime, number, rupiah, rupiahShort } from "@/lib/format";
import { describeCommission } from "@/lib/pricing";
import { useAppStore, useNow } from "@/lib/store";
import { AdminSection, AdminTitle, BarList, StatTile } from "../AdminUi";
import { useAdminCounts } from "../useAdminCounts";
import { DISPUTE_RATIO_TARGET, percent, summarize, type Summary } from "./metrics";

/** "/admin" — data summary (PRD 9.8) with the North Star metric (PRD 17). */
export function Ringkasan() {
  const now = useNow();
  const bookings = useAppStore((s) => s.bookings);
  const disputes = useAppStore((s) => s.disputes);
  const users = useAppStore((s) => s.users);
  const listings = useAppStore((s) => s.listings);
  const commission = useAppStore((s) => s.commission);
  const data = useMemo(() => summarize({ bookings, disputes, users, listings }, now), [bookings, disputes, users, listings, now]);
  const negotiating = disputes.filter((d) => d.status === "negosiasi").length;

  return (
    <>
      <AdminTitle title="Ringkasan" subtitle={`Kondisi seluruh Sewain per ${formatDateTime(now)} (jam demo). Semua angka dihitung langsung dari data demo.`} />

      <QueueLinks negotiating={negotiating} />

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <NorthStar data={data} />
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            icon={<Banknote className="size-3.5" />}
            label="Total nilai sewa"
            value={<span title={rupiah(data.rentValue)}>{rupiahShort(data.rentValue)}</span>}
            sub={`${rupiah(data.rentValue)} dari ${number(data.rentedCount)} booking (tanpa yang ditolak, kadaluarsa, atau batal)`}
          />
          <StatTile
            icon={<Scale className="size-3.5" />}
            label="Rasio sengketa"
            value={data.disputeRatio == null ? "–" : percent(data.disputeRatio)}
            sub={`${data.disputeCount} sengketa dari ${data.finished} sewa selesai · target < ${percent(DISPUTE_RATIO_TARGET)}`}
          />
          <StatTile icon={<BadgeCheck className="size-3.5" />} label="Pengguna terverifikasi" value={`${data.verified}/${data.members}`} sub={`${data.verifiedProviders} penyedia terverifikasi, ${data.tokoProviders} akun Toko`} />
          <StatTile icon={<Package className="size-3.5" />} label="Listing aktif" value={number(data.liveListings)} sub={`dari ${data.totalListings} listing · ${data.pausedListings} dijeda · ${data.removedListings} diturunkan`} />
          <StatTile label="Sengketa terbuka" value={number(data.disputesOpen)} sub={`${negotiating} negosiasi, ${data.disputesOpen - negotiating} di mediasi admin`} />
          <StatTile label="Booking telat kembali" value={number(data.overdue)} sub="Sedang disewa dan sudah lewat tanggal kembali" />
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
        <AdminSection title="Booking per status" description={`${number(data.totalBookings)} booking sejak pilot dimulai.`}>
          <BarList rows={data.statusRows} />
        </AdminSection>

        <div className="space-y-10">
          <AdminSection
            title="Komisi"
            description="Dihitung dari nilai sewa saja, bukan dari jaminan."
            action={
              <Link href="/admin/komisi" className="text-nav font-medium text-ink underline-offset-4 hover:underline">
                Atur komisi
              </Link>
            }
          >
            <BarList
              format={rupiah}
              rows={[
                { key: "if", label: "Seandainya aktif", value: data.commissionIf },
                { key: "charged", label: "Tertagih", value: data.commissionCharged },
              ]}
            />
            <p className="mt-3 rounded-[12px] bg-soft-gray p-3 text-caption text-graphite">
              {commission.active ? (
                <>
                  <span className="font-semibold text-ink">Komisi aktif:</span>{" "}
                  {describeCommission({ ...commission, rate: commission.mode === "persen" ? commission.percent : commission.flat })}. Booking lama tetap memakai nilai di kesepakatannya.
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink">Komisi nonaktif (pilot 0%).</span> Nilai &ldquo;seandainya aktif&rdquo; tetap dicatat di setiap kesepakatan untuk menentukan tarif nanti.
                </>
              )}
            </p>
          </AdminSection>

          <AdminSection title="Sengketa per kategori" description="Kategori barang dari kesepakatan sewa yang disengketakan.">
            {data.disputeRows.length ? (
              <BarList rows={data.disputeRows} />
            ) : (
              <p className="rounded-[12px] bg-soft-gray p-4 text-body-sm text-graphite">Belum ada sengketa. Mantap.</p>
            )}
          </AdminSection>
        </div>
      </div>
    </>
  );
}

function QueueLinks({ negotiating }: { negotiating: number }) {
  const counts = useAdminCounts();
  const items: { href: string; label: string; value: number; hint: string; Icon: LucideIcon }[] = [
    { href: "/admin/verifikasi", label: "Verifikasi menunggu", value: counts.verifikasi, hint: "Review manual KTP + selfie", Icon: IdCard },
    { href: "/admin/laporan", label: "Laporan baru", value: counts.laporan, hint: "Listing & pengguna yang dilaporkan", Icon: Flag },
    { href: "/admin/sengketa", label: "Sengketa di mediasi", value: counts.sengketa, hint: negotiating ? `${negotiating} lagi masih negosiasi` : "Butuh rekomendasi admin", Icon: Scale },
  ];
  return (
    <section aria-label="Antrean yang perlu ditinjau">
      <p className="mb-3 text-caption font-semibold uppercase tracking-[0.08em] text-smoke">Perlu ditinjau</p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map(({ href, label, value, hint, Icon }) => (
          <li key={href}>
            <Link href={href} className="group flex items-center gap-3 rounded-card border border-border-gray bg-white p-4 transition-colors hover:border-ink">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", value > 0 ? "bg-ink text-white" : "bg-soft-gray text-graphite")}>
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-semibold text-ink">{label}</span>
                <span className="block truncate text-caption text-smoke">{value > 0 ? hint : "Beres, tidak ada antrean"}</span>
              </span>
              <span className={cn("text-[22px] font-semibold tabular-nums", value > 0 ? "text-ink" : "text-ash")}>{value}</span>
              <ChevronRight className="size-4 shrink-0 text-ash transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** North Star (PRD 17): completed rentals per week, with a 6-week column chart. */
function NorthStar({ data }: { data: Summary }) {
  const max = Math.max(1, ...data.weeks.map((w) => w.value));
  const delta = data.northStar - data.northStarPrev;
  return (
    <section aria-labelledby="north-star" className="flex flex-col rounded-card bg-white p-5 shadow-hairline">
      <p id="north-star" className="text-caption font-semibold uppercase tracking-[0.08em] text-smoke">
        North Star
      </p>
      <h2 className="mt-1 text-body font-semibold text-ink">Sewa selesai per minggu</h2>
      <div className="mt-3 flex items-end gap-3">
        <span className="text-[40px] font-semibold leading-none tracking-[-1.2px] text-ink tabular-nums">{data.northStar}</span>
        <span className="pb-1 text-caption text-smoke">
          7 hari terakhir ·{" "}
          {delta === 0 ? "sama dengan minggu lalu" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} dibanding minggu lalu`}
        </span>
      </div>

      <div className="mt-6 grid h-40 grid-cols-6 gap-2" role="img" aria-label={`Sewa selesai per minggu: ${data.weeks.map((w) => `${w.label} ${w.value}`).join(", ")}`}>
        {data.weeks.map((w, i) => {
          const current = i === data.weeks.length - 1;
          return (
            <div key={w.key} className="flex min-w-0 flex-col items-center gap-1.5" title={`${w.label}: ${w.value} sewa selesai`}>
              <span className={cn("text-caption tabular-nums", current ? "font-semibold text-ink" : "text-smoke")}>{w.value}</span>
              <div className="relative w-full max-w-10 flex-1 overflow-hidden rounded-[6px] bg-soft-gray">
                <div className="absolute inset-x-0 bottom-0 rounded-[6px] bg-ink" style={{ height: w.value > 0 ? `max(${(w.value / max) * 100}%, 6px)` : 0 }} />
              </div>
              <span className={cn("min-h-[26px] w-full text-center text-micro leading-tight", current ? "font-semibold text-ink" : "text-smoke")}>{w.label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-caption text-smoke">Target pilot: 30 sewa selesai per minggu di minggu ke-8.</p>
    </section>
  );
}
