"use client";

import { AlertTriangle, Bike, ChevronDown, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Notice } from "@/components/ui/Layout";
import { usePaymentMode } from "@/lib/config";
import { HANDOVER_LABEL, RISK_NOTES } from "@/lib/data/categories";
import { formatDate, rupiah } from "@/lib/format";
import { collateralValue, describeCollateral } from "@/lib/pricing";
import type { Category, CollateralOption, Listing, User, VehicleInfo } from "@/lib/types";

/** White accordion panel with a thin divider (DESIGN.md › Product Detail: description & details). */
export function Section({ title, children, id, open = true }: { title: ReactNode; children: ReactNode; id?: string; open?: boolean }) {
  return (
    <details id={id} open={open} className="group scroll-mt-32 border-t border-border-gray">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-body-lg font-semibold tracking-[-0.2px] text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 shrink-0 text-smoke transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border-gray py-3 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-body-sm text-smoke">{label}</dt>
      <dd className="text-body-sm text-ink">{children}</dd>
    </div>
  );
}

/** One collateral option with its monetary value when it has one. */
export function collateralLine(opt: CollateralOption, itemValue: number): string {
  const text = describeCollateral(opt, itemValue);
  const value = collateralValue(opt, itemValue);
  return opt.kind === "custom" && value > 0 ? `${text} (senilai ± ${rupiah(value)})` : text;
}

export function approvalText(listing: Listing): string {
  return listing.approval === "otomatis"
    ? `Otomatis untuk penyewa dengan rating ≥ ${(listing.autoApproveMinRating ?? 4.5).toFixed(1)}. Selain itu ditinjau manual (maks 24 jam).`
    : "Manual: penyedia cek profil & rating penyewa dulu, lalu menyetujui atau menolak dalam 24 jam.";
}

export function durationText(listing: Listing): string {
  const min = `Minimal ${listing.minDays ?? 1} hari`;
  return listing.maxDays ? `${min} · maksimal ${listing.maxDays} hari` : `${min} · tanpa batas maksimal`;
}

/** "Aturan penyedia" — everything the renter must know BEFORE requesting (PRD 8.1 step 3, 9.3). */
export function ProviderRules({ listing, owner }: { listing: Listing; owner?: User }) {
  const paymentMode = usePaymentMode();
  const cap = Math.round((listing.itemValue * listing.rules.lateFeeCapPercent) / 100);
  const hasDocument = listing.collateralOptions.some((o) => o.kind === "identitas" || o.withIdentity || o.kind === "custom");
  return (
    <dl>
      <Row label="Jaminan (pilih salah satu)">
        <ul className="space-y-1.5">
          {listing.collateralOptions.map((o) => (
            <li key={o.id} className="flex gap-2">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink" aria-hidden />
              <span>{collateralLine(o, listing.itemValue)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-caption text-smoke">
          Nilai barang (estimasi penyedia): <span className="font-medium text-graphite">{rupiah(listing.itemValue)}</span>. Jaminan difoto saat serah terima dan dikembalikan setelah barang kembali.
          {hasDocument ? " Titip KTM/SIM lebih disarankan daripada e-KTP; tutup sebagian nomor penting saat difoto." : ""}
        </p>
      </Row>
      <Row label="Serah terima">
        {listing.handover.map((h) => HANDOVER_LABEL[h]).join(" · ")}
        {listing.handoverHours && <span className="block text-caption text-smoke">Jam serah terima: {listing.handoverHours}</span>}
        <span className="block text-caption text-smoke">Titik temu detail dibagikan setelah request disetujui.</span>
      </Row>
      <Row label="Denda telat">
        {rupiah(listing.rules.lateFeePerDay)}/hari
        <span className="block text-caption text-smoke">
          Maksimal {listing.rules.lateFeeCapPercent}% nilai barang ({rupiah(cap)}).
        </span>
      </Row>
      <Row label="Pembatalan">{listing.rules.cancellation}</Row>
      {listing.rules.special && <Row label="Syarat khusus">{listing.rules.special}</Row>}
      <Row label="Durasi sewa">{durationText(listing)}</Row>
      {owner?.accountType === "toko" && (
        <Row label="Stok">
          {listing.stock} unit
          <span className="block text-caption text-smoke">Beberapa penyewa bisa menyewa di tanggal yang sama sampai stok habis.</span>
        </Row>
      )}
      <Row label="Persetujuan">{approvalText(listing)}</Row>
      <Row label="Pembayaran">
        {paymentMode === "simulated"
          ? "Bayar langsung ke penyedia saat serah terima, atau lewat “Bayar via Sewain” (simulasi) setelah disetujui."
          : "Bayar langsung ke penyedia setelah barang di tangan. Tidak ada pembayaran di aplikasi selama pilot."}
        <span className="block text-caption text-smoke">Info pembayaran penyedia baru muncul setelah request disetujui.</span>
      </Row>
    </dl>
  );
}

/** Existing condition (FR-L3) + how reference photos are used as evidence (PRD 10). */
export function ConditionNotes({ listing }: { listing: Listing }) {
  return (
    <div className="space-y-3">
      <p className="text-body text-ink">{listing.conditionNotes || "Penyedia tidak mencatat cacat atau lecet."}</p>
      <p className="text-body-sm text-smoke">
        {listing.photos.length} foto di galeri adalah <span className="font-medium text-graphite">foto referensi kondisi</span> dari penyedia. Saat serah terima dan
        pengembalian, barang difoto ulang lalu dibandingkan berdampingan dengan foto ini, jadi lecet lama tidak bisa dibebankan ke kamu.{" "}
        <Link href="/bantuan#foto-bukti" className="font-medium text-ink underline underline-offset-2">
          Cara kerja foto bukti
        </Link>
      </p>
    </div>
  );
}

const RISK_TITLE: Record<NonNullable<Category["risk"]>, string> = {
  kendaraan: "Kendaraan bermotor: ada syarat tambahan",
  elektronik: "Elektronik bernilai tinggi",
  keselamatan: "Alat keselamatan & olahraga",
  listrik: "Alat masak bertekanan / listrik",
};

export function RiskNotice({ risk }: { risk: NonNullable<Category["risk"]> }) {
  return (
    <Notice tone="outline" icon={<AlertTriangle className="size-4 text-ink" />} title={RISK_TITLE[risk]}>
      {RISK_NOTES[risk]}
    </Notice>
  );
}

/** Vehicle facts (FR-L6): masked plate, STNK validity, required SIM class. */
export function VehicleInfoBlock({ vehicle, today }: { vehicle: VehicleInfo; today: string }) {
  const expired = vehicle.stnkValidUntil < today;
  return (
    <div className="rounded-card bg-soft-gray p-4">
      <p className="mb-3 flex items-center gap-2 text-body-sm font-semibold text-ink">
        <Bike className="size-4" /> Info kendaraan
      </p>
      <dl>
        <Row label="Nomor polisi">
          <span className="font-mono">{vehicle.plateMasked}</span>
          <span className="block text-caption text-smoke">Disamarkan untuk publik. Nomor lengkap terlihat saat serah terima.</span>
        </Row>
        <Row label="STNK berlaku sampai">
          {formatDate(vehicle.stnkValidUntil, true)}
          {expired && <span className="block text-caption font-medium text-ink">Masa berlaku STNK sudah lewat. Tanyakan ke penyedia sebelum menyewa.</span>}
        </Row>
        <Row label="SIM penyewa">Wajib punya SIM {vehicle.simClass} yang masih berlaku (ditunjukkan saat serah terima).</Row>
        <Row label="Saat serah terima">Foto odometer + indikator BBM saat ambil dan kembali.</Row>
        <Row label="Tanggung jawab">Tilang, kerusakan, dan kehilangan selama masa sewa ditanggung penyewa sesuai kesepakatan.</Row>
      </dl>
    </div>
  );
}

/** PRD 12.1 anti-fraud reminder. */
export function AntiFraudNotice() {
  const paymentMode = usePaymentMode();
  return (
    <Notice tone="ink" icon={<ShieldAlert className="size-4" />} title="Jangan transfer sebelum barang di tangan">
      Bayar setelah ketemu langsung dan barang sudah kamu cek{paymentMode === "simulated" ? ", atau lewat Sewain" : ""}. Ada yang minta DP/transfer duluan lewat WhatsApp? Itu tanda bahaya, laporkan.
      Chat di Sewain jadi bukti kalau nanti ada sengketa.{" "}
      <Link href="/bantuan#aman" className="font-medium text-white underline underline-offset-2">
        Tips aman menyewa
      </Link>
    </Notice>
  );
}
