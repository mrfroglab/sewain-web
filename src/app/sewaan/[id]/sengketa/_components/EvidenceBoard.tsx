"use client";

import { Lock, MessageCircle } from "lucide-react";
import { EvidenceGrid } from "@/components/photo/EvidencePhoto";
import { ButtonLink } from "@/components/ui/Button";
import { KV } from "@/components/ui/Layout";
import { formatDateRange, formatDateTime, rupiah } from "@/lib/format";
import { describeCollateral } from "@/lib/pricing";
import { shortHash } from "@/lib/sha256";
import type { Dispute } from "@/lib/types";
import type { BookingCtx } from "../../serah-terima/_shared/BookingFrame";
import { ComparisonRows } from "../../serah-terima/_shared/Comparison";
import { referencePhotos, useBookingEvidence } from "../../serah-terima/_shared/evidence";
import { SectionTitle, VehicleReadout } from "../../serah-terima/_shared/ui";

/** Papan bukti (FR-P9, PRD 9.8): referensi · check-out · check-in per angle, collateral, problem photos, agreement, chat. */
export function EvidenceBoard({ ctx, dispute }: { ctx: BookingCtx; dispute?: Dispute }) {
  const { booking, listing } = ctx;
  const ev = useBookingEvidence(booking, dispute?.photoIds);
  const refs = referencePhotos(booking, listing);
  const a = booking.agreement;
  const angles = ev.angles.length ? ev.angles : refs.map((_, i) => `Sudut ${i + 1}`);

  return (
    <section className="space-y-10 border-t border-border-gray pt-10">
      <div>
        <SectionTitle
          title="Papan bukti"
          description="Referensi (saat diiklankan), check-out (serah terima), dan check-in (pengembalian) berdampingan per sudut. Foto tidak bisa dihapus atau diganti."
        />
        <ComparisonRows
          rowLabels={angles}
          bookingCode={booking.code}
          columns={[
            { label: "Referensi", cells: refs.map((src) => ({ kind: "ref" as const, src })) },
            { label: "Check-out", cells: ev.checkout.map((id) => ({ kind: "photo" as const, id })) },
            { label: "Check-in", cells: ev.checkin.map((id) => ({ kind: "photo" as const, id })) },
          ]}
        />
      </div>

      {(booking.checkout?.odometer || booking.checkin?.odometer) && (
        <div>
          <SectionTitle title="Odometer & BBM" />
          <VehicleReadout out={{ odometer: booking.checkout?.odometer, fuel: booking.checkout?.fuel }} back={booking.checkin ? { odometer: booking.checkin.odometer, fuel: booking.checkin.fuel } : undefined} />
        </div>
      )}

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <SectionTitle title="Foto jaminan" description={describeCollateral(booking.collateral, a.itemValue)} />
          {ev.collateral.length ? <EvidenceGrid ids={ev.collateral} bookingCode={booking.code} cols={3} /> : <Empty>Belum ada foto jaminan.</Empty>}
          <p className="mt-2 flex items-center gap-1.5 text-caption text-smoke">
            <Lock className="size-3.5 shrink-0" /> Hanya terlihat oleh kedua pihak dan mediator.
          </p>
        </div>
        <div>
          <SectionTitle title={`Foto masalah & bukti${ev.problem.length ? ` (${ev.problem.length})` : ""}`} description={booking.checkin?.problemType ? `Saat pengembalian: ${booking.checkin.problemType}` : undefined} />
          {ev.problem.length ? <EvidenceGrid ids={ev.problem} bookingCode={booking.code} cols={3} /> : <Empty>Belum ada foto masalah atau bukti tambahan.</Empty>}
        </div>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <SectionTitle title="Kesepakatan sewa" description="Snapshot yang disetujui kedua pihak." />
          <div className="divide-y divide-border-gray">
            <KV k="Periode" v={formatDateRange(a.startDate, a.endDate)} />
            <KV k="Nilai sewa" v={rupiah(a.quote.total)} />
            <KV k="Nilai barang" v={rupiah(a.itemValue)} />
            <KV k="Jaminan" v={describeCollateral(a.collateral, a.itemValue)} />
            <KV k="Denda telat" v={`${rupiah(a.lateFeePerDay)}/hari, maks ${rupiah(a.lateFeeCap)}`} />
            <KV k="Kondisi awal" v={a.conditionNotes || "–"} />
            {booking.activeAt && <KV k="Serah terima" v={formatDateTime(booking.activeAt)} />}
            {booking.returnedAt && <KV k="Pengembalian" v={formatDateTime(booking.returnedAt)} />}
            <KV k="Sidik kesepakatan" v={<span className="font-mono text-caption">{shortHash(a.hash)}</span>} />
          </div>
        </div>
        <div>
          <SectionTitle title="Riwayat chat" />
          <div className="rounded-card bg-soft-gray p-4">
            <p className="text-body-sm text-graphite">
              Mediator membaca chat sewa di Sewain. <span className="font-semibold text-ink">Bukti di luar Sewain (mis. WhatsApp) tidak bisa dipakai mediator.</span>
            </p>
            <ButtonLink href={`/sewaan/${booking.id}/chat`} variant="secondary" className="mt-3">
              <MessageCircle className="size-4" /> Buka chat sewa
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="rounded-[12px] border border-dashed border-border-gray p-4 text-body-sm text-ash">{children}</p>;
}
