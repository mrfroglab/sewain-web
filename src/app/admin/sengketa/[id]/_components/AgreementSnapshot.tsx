"use client";

import { KV } from "@/components/ui/Layout";
import { HANDOVER_LABEL, categoryName } from "@/lib/data/categories";
import { formatDateRange, formatDateTime, rupiah } from "@/lib/format";
import { collateralValue, describeCollateral, describeCommission } from "@/lib/pricing";
import type { Booking } from "@/lib/types";
import { AdminSection } from "../../../_components/AdminUi";

/** Snapshot that both parties agreed to (FR-R2) — the mediator's reference for collateral, late fees and limits. */
export function AgreementSnapshot({ booking }: { booking: Booking }) {
  const a = booking.agreement;
  const c = a.commission;
  const coverage = collateralValue(a.collateral, a.itemValue);
  const time = (t?: number) => (t ? formatDateTime(t) : "Belum");

  return (
    <AdminSection title="Kesepakatan sewa" description="Snapshot yang disetujui kedua pihak. Perubahan pengaturan setelahnya tidak mengubah isi ini.">
      <div className="divide-y divide-border-gray border-y border-border-gray">
        <KV k="Barang" v={`${a.listingTitle} · ${categoryName(a.category)}`} />
        <KV k="Periode" v={`${formatDateRange(a.startDate, a.endDate)} (${a.quote.days} hari)`} />
        <KV k="Nilai sewa" v={`${rupiah(a.quote.total)} · ${a.quote.breakdown}`} strong />
        <KV k="Nilai barang (estimasi)" v={rupiah(a.itemValue)} />
        <KV k="Jaminan" v={describeCollateral(a.collateral, a.itemValue)} strong />
        <KV k="Nilai jaminan tercatat" v={coverage ? rupiah(coverage) : "Kartu identitas (tanpa nilai uang)"} />
        <KV k="Serah terima" v={HANDOVER_LABEL[a.handover]} />
        <KV k="Denda telat" v={`${rupiah(a.lateFeePerDay)} per hari`} />
        <KV k="Batas denda" v={rupiah(a.lateFeeCap)} />
        <KV k="Pembatalan" v={a.cancellation} />
        {a.special && <KV k="Syarat khusus" v={a.special} />}
        <KV k="Kondisi awal (FR-L3)" v={a.conditionNotes || "–"} />
        <KV
          k="Komisi"
          v={c.active ? `${rupiah(c.charged)} (penyewa ${rupiah(c.renterPays)}, penyedia ${rupiah(c.providerPays)})` : `Nonaktif saat pilot · seandainya ${rupiah(c.amount)}`}
        />
        <KV k="Aturan komisi" v={describeCommission(c)} />
        <KV k="Pembayaran" v={booking.payment.status === "lunas" ? `Lunas${booking.payment.method ? ` via ${booking.payment.method.toUpperCase()}` : ""} (simulasi)` : "Belum lewat Sewain"} />
        <KV k="Disetujui penyewa" v={time(a.renterAgreedAt)} />
        <KV k="Disetujui penyedia" v={time(a.providerAgreedAt)} />
        {booking.checkout && <KV k="Kondisi disetujui (check-out)" v={`Penyewa ${time(booking.checkout.renterAgreedAt)} · penyedia ${time(booking.checkout.providerAgreedAt)}`} />}
        {booking.returnedAt && <KV k="Barang kembali" v={formatDateTime(booking.returnedAt)} />}
        <div className="py-2">
          <p className="text-body-sm text-smoke">Hash kesepakatan (SHA-256)</p>
          <p className="mt-0.5 break-all font-mono text-caption text-ink">{a.hash}</p>
        </div>
      </div>
    </AdminSection>
  );
}
