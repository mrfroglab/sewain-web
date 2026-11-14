"use client";

import { ChevronDown, FileText } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { KV } from "@/components/ui/Layout";
import { CATEGORY_BY_ID, HANDOVER_LABEL } from "@/lib/data/categories";
import { formatDate, formatDateTime, rupiah } from "@/lib/format";
import { describeCollateral, describeCommission } from "@/lib/pricing";
import { shortHash } from "@/lib/sha256";
import type { BookingView } from "./shared";

/** "Kesepakatan sewa": the agreement snapshot both parties approved (FR-R2, FR-J7), incl. commission line (FR-K6). */
export function AgreementCard({ view, className }: { view: BookingView; className?: string }) {
  const a = view.b.agreement;
  const c = a.commission;
  const [fullHash, setFullHash] = useState(false);

  const commission = c.active ? (
    <>
      {rupiah(c.charged)}
      <span className="block text-caption text-smoke">
        {describeCommission(c)}
        {c.renterPays > 0 && ` · penyewa ${rupiah(c.renterPays)}`}
        {c.providerPays > 0 && ` · penyedia ${rupiah(c.providerPays)}`}
      </span>
    </>
  ) : (
    <>
      Rp0 · nonaktif selama pilot
      <span className="block text-caption text-smoke">
        Seandainya aktif: {rupiah(c.amount)} ({describeCommission(c)})
      </span>
    </>
  );

  return (
    <details className={cn("group rounded-card border border-border-gray bg-white", className)}>
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-soft-gray text-ink">
          <FileText className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold tracking-[-0.2px] text-ink">Kesepakatan sewa</span>
          <span className="block truncate text-caption text-smoke">
            {a.quote.days} hari · {rupiah(a.quote.total)} · {describeCollateral(a.collateral, a.itemValue)}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-graphite transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-border-gray px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
        <p className="py-2 text-caption text-smoke">
          Snapshot ini dikunci saat request dibuat dan disetujui kedua pihak. Perubahan aturan atau komisi setelahnya tidak mengubah kesepakatan ini.
        </p>
        <div className="divide-y divide-border-gray">
          <Group title="Tentang barang">
            <KV k="Barang" v={a.listingTitle} strong />
            <KV k="Kategori" v={CATEGORY_BY_ID[a.category]?.name ?? a.category} />
            <KV k="Nilai barang (estimasi)" v={rupiah(a.itemValue)} />
            <Block k="Kondisi referensi (cacat yang sudah ada)" v={a.conditionNotes || "-"} />
          </Group>
          <Group title="Pihak & jadwal">
            <KV k="Penyewa" v={a.renterName} />
            <KV k="Penyedia" v={a.providerName} />
            <KV k="Tanggal ambil" v={formatDate(a.startDate, true)} />
            <KV k="Tanggal kembali" v={formatDate(a.endDate, true)} />
            <KV k="Serah terima" v={HANDOVER_LABEL[a.handover]} />
          </Group>
          <Group title="Harga">
            <KV k="Rincian" v={a.quote.breakdown} />
            {a.quote.discount > 0 && <KV k="Diskon durasi" v={`−${rupiah(a.quote.discount)}`} />}
            <KV k="Nilai sewa" v={rupiah(a.quote.total)} strong />
            <Block k="Komisi Sewain" v={commission} />
          </Group>
          <Group title="Jaminan & aturan">
            <KV k="Jaminan" v={describeCollateral(a.collateral, a.itemValue)} />
            <KV k="Nilai jaminan" v={a.collateralValue > 0 ? rupiah(a.collateralValue) : "Kartu identitas (tanpa nilai uang)"} />
            <KV k="Denda telat" v={`${rupiah(a.lateFeePerDay)}/hari, maks ${rupiah(a.lateFeeCap)}`} />
            <Block k="Pembatalan" v={a.cancellation} />
            {a.special && <Block k="Syarat khusus" v={a.special} />}
            <Block k="Pengembalian jaminan" v="Dikembalikan utuh setelah check-in sesuai. Potongan hanya lewat kesepakatan kedua pihak atau rekomendasi mediator." />
          </Group>
          <Group title="Persetujuan">
            <KV k="Disetujui penyewa" v={a.renterAgreedAt ? formatDateTime(a.renterAgreedAt) : "Belum"} />
            <KV k="Disetujui penyedia" v={a.providerAgreedAt ? formatDateTime(a.providerAgreedAt) : "Belum"} />
            <div className="flex items-start justify-between gap-4 py-1.5 text-body-sm">
              <span className="shrink-0 text-smoke">Sidik SHA-256</span>
              <button
                type="button"
                onClick={() => setFullHash((v) => !v)}
                className="min-w-0 break-all text-right font-mono text-caption text-graphite underline decoration-dotted underline-offset-4"
                aria-label={fullHash ? "Ringkas hash" : "Tampilkan hash lengkap"}
              >
                {fullHash ? a.hash : shortHash(a.hash)}
              </button>
            </div>
          </Group>
        </div>
      </div>
    </details>
  );
}

/** Label above value, for long free-text fields. */
function Block({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="py-1.5 text-body-sm">
      <p className="text-smoke">{k}</p>
      <div className="mt-0.5 text-graphite">{v}</div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-2">
      <p className="pb-1 pt-1 text-micro font-semibold uppercase tracking-[0.06em] text-ash">{title}</p>
      {children}
    </div>
  );
}
