"use client";

import { AlertCircle, Clock, FileCheck2, Send, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { collateralLine } from "@/app/barang/[id]/_components/DetailSections";
import { ListingImage } from "@/components/listing/ListingImage";
import { Button } from "@/components/ui/Button";
import { KV, Notice } from "@/components/ui/Layout";
import { HANDOVER_LABEL } from "@/lib/data/categories";
import { formatDate, rupiah } from "@/lib/format";
import { collateralValue, computeCommission, depositCash, describeCommission } from "@/lib/pricing";
import { providerLabel, publicName } from "@/lib/selectors";
import { usePaymentMode } from "@/lib/config";
import { useAppStore } from "@/lib/store";
import type { CollateralOption, HandoverMethod, Listing, RentQuote, User } from "@/lib/types";

/** "Hemat (harga mingguan + diskon 10%)" — what the quote's discount consists of. */
function savingLabel(listing: Listing, quote: RentQuote): string {
  const parts = [
    listing.pricePerWeek && quote.days >= 7 ? "harga mingguan" : "",
    listing.durationDiscount && quote.days >= listing.durationDiscount.minDays ? `diskon ${listing.durationDiscount.percent}%` : "",
  ].filter(Boolean);
  return `Hemat (${parts.join(" + ") || "diskon"})`;
}

/** Label on the left, free-form (possibly multi-line) value on the right. */
function Line({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 py-2 text-body-sm sm:grid-cols-[120px_minmax(0,1fr)]">
      <dt className="text-smoke">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

/**
 * "Ringkasan kesepakatan sewa" (FR-R2, FR-J7, FR-K*): item, duration, price breakdown, collateral + value,
 * handover, late fee + cap, cancellation, special terms, reference condition, and the commission line.
 * The renter must tick the agreement box before sending; the store snapshots it (with a SHA-256) on submit.
 */
export function AgreementSummary({
  listing,
  owner,
  user,
  start,
  end,
  quote,
  handover,
  collateral,
  problem,
  agreed,
  onAgree,
  autoApprove,
  submitting,
  error,
  onSubmit,
}: {
  listing: Listing;
  owner: User;
  user: User;
  start: string;
  end: string;
  quote: RentQuote | null;
  handover: HandoverMethod;
  collateral?: CollateralOption;
  problem: string | null;
  agreed: boolean;
  onAgree: (v: boolean) => void;
  autoApprove: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  const commissionCfg = useAppStore((s) => s.commission);
  const paymentMode = usePaymentMode();
  const commission = quote ? computeCommission(quote.total, commissionCfg) : null;
  const deposit = collateral ? depositCash(collateral, listing.itemValue) : 0;
  const colValue = collateral ? collateralValue(collateral, listing.itemValue) : 0;
  const lateCap = Math.round((listing.itemValue * listing.rules.lateFeeCapPercent) / 100);
  const total = quote && commission ? quote.total + deposit + commission.renterPays : 0;

  return (
    <section className="rounded-card bg-white p-4 shadow-hairline sm:p-5" aria-labelledby="ringkasan-judul">
      <div className="flex items-start gap-2.5">
        <FileCheck2 className="mt-0.5 size-5 shrink-0 text-ink" />
        <div>
          <h2 id="ringkasan-judul" className="text-body-lg font-semibold tracking-[-0.2px] text-ink">
            Ringkasan kesepakatan sewa
          </h2>
          <p className="mt-0.5 text-caption text-smoke">Disimpan sebagai bukti (snapshot + kode hash) dan disetujui kedua pihak.</p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-border-gray border-y border-border-gray">
        <Line label="Barang">
          <span className="font-medium">{listing.title}</span>
          <span className="block text-caption text-smoke">
            Penyedia {providerLabel(owner)} · Penyewa {publicName(user)}
          </span>
        </Line>
        <Line label="Durasi">
          {quote ? (
            <>
              {formatDate(start)} → {formatDate(end)}
              <span className="block text-caption text-smoke">{quote.days} hari</span>
            </>
          ) : (
            <span className="text-ash">Pilih tanggal dulu</span>
          )}
        </Line>
        <Line label="Jaminan">
          {collateral ? (
            <>
              {collateralLine(collateral, listing.itemValue)}
              <span className="block text-caption text-smoke">
                Nilai jaminan {rupiah(colValue)}
                {colValue === 0 ? " (kartu identitas)" : ""}. Dikembalikan setelah barang kembali sesuai kondisi; kalau rusak, hilang, atau telat, potongan mengikuti
                kesepakatan ini atau hasil mediasi.
              </span>
            </>
          ) : (
            <span className="text-ash">Pilih jaminan</span>
          )}
        </Line>
        <Line label="Serah terima">
          {HANDOVER_LABEL[handover]}
          {listing.handoverHours && <span className="block text-caption text-smoke">Jam {listing.handoverHours}</span>}
        </Line>
        <Line label="Denda telat">
          {rupiah(listing.rules.lateFeePerDay)}/hari
          <span className="block text-caption text-smoke">
            Maksimal {rupiah(lateCap)} ({listing.rules.lateFeeCapPercent}% nilai barang {rupiah(listing.itemValue)})
          </span>
        </Line>
        <Line label="Pembatalan">{listing.rules.cancellation}</Line>
        {listing.rules.special && <Line label="Syarat khusus">{listing.rules.special}</Line>}
        <Line label="Kondisi referensi">
          {listing.conditionNotes || "Tidak ada catatan cacat."}
          <span className="mt-2 flex gap-1.5">
            {listing.photos.slice(0, 4).map((src, i) => (
              <span key={`${src}-${i}`} className="relative size-11 shrink-0 overflow-hidden rounded-[8px] bg-soft-gray">
                <ListingImage src={src} alt={`Foto referensi ${i + 1}`} />
              </span>
            ))}
          </span>
        </Line>
      </dl>

      {quote && commission ? (
        <div className="mt-3">
          <KV k={`${quote.days} hari × ${rupiah(listing.pricePerDay)}`} v={rupiah(quote.base)} />
          {quote.discount > 0 && <KV k={savingLabel(listing, quote)} v={<span className="text-sale-text">−{rupiah(quote.discount)}</span>} />}
          <KV k="Nilai sewa" v={rupiah(quote.total)} strong />
          {quote.discount > 0 && <p className="-mt-1 pb-1 text-caption text-smoke">{quote.breakdown}</p>}
          {commission.active ? (
            <>
              <KV k="Komisi Sewain" v={rupiah(commission.charged)} />
              <p className="-mt-1 pb-1 text-caption text-smoke">
                {describeCommission(commission)}. Bagianmu {rupiah(commission.renterPays)}
                {commission.providerPays > 0 ? `, penyedia ${rupiah(commission.providerPays)}` : ""}.
              </p>
            </>
          ) : (
            <>
              <KV k="Komisi Sewain" v="Rp0 (gratis selama pilot)" />
              <p className="-mt-1 pb-1 text-caption text-ash">
                Seandainya aktif: {rupiah(commission.amount)} ({describeCommission(commission)})
              </p>
            </>
          )}
          {deposit > 0 && <KV k="Deposit uang (kembali utuh)" v={rupiah(deposit)} />}
          <div className="mt-2 flex items-end justify-between gap-4 border-t border-border-gray pt-3">
            <div>
              <p className="text-body-sm font-semibold text-ink">Total estimasi</p>
              <p className="text-caption text-smoke">Sewa{deposit > 0 ? " + deposit" : ""} + komisi bagianmu</p>
            </div>
            <p className="text-[22px] font-bold leading-none tracking-[-0.5px] text-ink">{rupiah(total)}</p>
          </div>
          <p className="mt-2 text-caption text-smoke">
            {paymentMode === "simulated"
              ? "Belum bayar sekarang. Setelah disetujui, bayar ke penyedia saat serah terima atau lewat “Bayar via Sewain” (simulasi). Jangan transfer sebelum barang di tangan."
              : "Belum bayar sekarang. Bayar langsung ke penyedia setelah barang di tangan dan sudah kamu cek. Jangan transfer sebelum ketemu."}
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex items-start gap-3 rounded-[12px] border border-border-gray p-3.5 transition-colors has-[:checked]:border-ink">
        <input id="setuju-kesepakatan" type="checkbox" checked={agreed} onChange={(e) => onAgree(e.target.checked)} className="mt-0.5 size-4 shrink-0 cursor-pointer accent-ink" required />
        <label htmlFor="setuju-kesepakatan" className="min-w-0 flex-1 cursor-pointer text-body-sm font-semibold text-ink">
          Saya setuju dengan kesepakatan ini
          <span className="mt-0.5 block text-caption font-normal text-smoke">Termasuk jaminan, denda telat, pembatalan, dan syarat penyedia di atas.</span>
        </label>
      </div>

      <div className="mt-3">
        {autoApprove ? (
          <Notice icon={<Zap className="size-4" />}>
            Ratingmu memenuhi syarat persetujuan otomatis penyedia, jadi request bisa langsung disetujui. Kalau tidak, penyedia punya 24 jam untuk merespons.
          </Notice>
        ) : (
          <Notice icon={<Clock className="size-4" />}>Penyedia punya 24 jam untuk merespons. Kalau tidak direspons, request otomatis kadaluarsa.</Notice>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-3">
          <Notice tone="outline" icon={<AlertCircle className="size-4 text-ink" />} title="Request belum terkirim">
            {error}
          </Notice>
        </div>
      )}

      <Button block size="lg" className="mt-4" onClick={onSubmit} disabled={!!problem || !agreed} loading={submitting}>
        {!submitting && <Send className="size-4" />} Kirim request sewa
      </Button>
      {(problem || !agreed) && <p className="mt-2 text-center text-caption text-smoke">{problem ?? "Centang persetujuan dulu untuk mengirim."}</p>}
    </section>
  );
}
