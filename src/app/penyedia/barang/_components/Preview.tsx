"use client";

import { BadgeCheck, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { Badge } from "@/components/ui/Badge";
import { KV } from "@/components/ui/Layout";
import { Stars } from "@/components/ui/Stars";
import { AREA_BY_ID } from "@/lib/data/areas";
import { CATEGORY_BY_ID, HANDOVER_LABEL } from "@/lib/data/categories";
import { formatDate, rupiah } from "@/lib/format";
import { collateralChip, describeCollateral, isHighValue } from "@/lib/pricing";
import { providerLabel } from "@/lib/selectors";
import type { CollateralRules, User } from "@/lib/types";
import { STEPS, autoApprovalBlocked, cleanOption, handoverHoursOf, isVehicle, lateFeeOf, maskPlate, type ListingDraft } from "./draft";

/** Listing-card look-alike built from the draft (cover photo, title, rating, price, area, jaminan chip). */
export function PreviewListingCard({ draft, photoSrcs, owner, rules, compact }: { draft: ListingDraft; photoSrcs: string[]; owner: User; rules: CollateralRules; compact?: boolean }) {
  const area = AREA_BY_ID[draft.areaId];
  const collateral = draft.collateral.map(cleanOption);
  const highValue = isHighValue(draft.itemValue ?? 0, rules);
  return (
    <div className={compact ? "" : "grid grid-cols-[minmax(0,140px)_1fr] gap-4 sm:grid-cols-[180px_1fr]"}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-image bg-soft-gray">
        {photoSrcs[0] ? <ListingImage src={photoSrcs[0]} alt={draft.title || "Foto sampul"} /> : <div className="absolute inset-0 grid place-items-center text-caption text-ash">Belum ada foto</div>}
        {(owner.accountType === "toko" || highValue) && (
          <div className="absolute left-2 top-2">
            <Badge tone="white">{owner.accountType === "toko" ? "Toko" : "Bernilai tinggi"}</Badge>
          </div>
        )}
        {draft.discountOn && draft.discountPercent && draft.discountMinDays ? (
          <div className="absolute bottom-2 left-2">
            <Badge tone="sale">
              -{draft.discountPercent}% ≥{draft.discountMinDays} hari
            </Badge>
          </div>
        ) : null}
      </div>
      <div className={compact ? "mt-2.5 space-y-1" : "min-w-0 space-y-1 self-center"}>
        <p className="text-micro font-medium uppercase tracking-wide text-smoke">{draft.category ? CATEGORY_BY_ID[draft.category].name : "Kategori"}</p>
        <h3 className="line-clamp-2 text-product-title font-semibold text-ink">{draft.title.trim() || "Judul barang"}</h3>
        <Stars rating={0} />
        <p className="text-product-title font-semibold text-ink">
          {draft.pricePerDay ? rupiah(draft.pricePerDay) : "Rp–"}
          <span className="font-normal text-smoke"> /hari</span>
        </p>
        <p className="truncate text-caption text-smoke">{area?.name}</p>
        <p className="flex items-center gap-1 truncate text-caption text-graphite">
          <BadgeCheck className="size-3 shrink-0" aria-label="Penyedia terverifikasi" />
          {collateral.length ? collateralChip(collateral) : "Jaminan belum diatur"}
        </p>
        {!compact && <p className="pt-1 text-caption text-smoke">oleh {providerLabel(owner)}</p>}
      </div>
    </div>
  );
}

function Section({ title, step, onEdit, children }: { title: string; step: number; onEdit: (s: number) => void; children: ReactNode }) {
  return (
    <section className="border-t border-border-gray py-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-body font-semibold text-ink">{title}</h3>
        <button type="button" onClick={() => onEdit(step)} className="inline-flex h-8 items-center gap-1.5 rounded-control px-2.5 text-nav font-medium text-ink hover:bg-soft-gray">
          <Pencil className="size-3.5" /> Ubah
        </button>
      </div>
      {children}
    </section>
  );
}

/** "Pratinjau": the card plus every rule the renter will agree to, each with a jump back to its step. */
export function PreviewSummary({
  draft,
  photoSrcs,
  owner,
  rules,
  isToko,
  onEdit,
}: {
  draft: ListingDraft;
  photoSrcs: string[];
  owner: User;
  rules: CollateralRules;
  isToko: boolean;
  onEdit: (s: number) => void;
}) {
  const itemValue = draft.itemValue ?? 0;
  const vehicle = isVehicle(draft.category);
  const capPct = draft.lateFeeCapPercent ?? 100;
  const hours = handoverHoursOf(draft);
  const approval = autoApprovalBlocked(draft, rules) ? "manual" : draft.approval;
  const plate = draft.plate.trim() ? maskPlate(draft.plate) : draft.plateMasked;

  return (
    <div>
      <div className="pb-5">
        <PreviewListingCard draft={draft} photoSrcs={photoSrcs} owner={owner} rules={rules} />
      </div>

      <Section title={STEPS[0].label} step={0} onEdit={onEdit}>
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {photoSrcs.map((src, i) => (
            <div key={`${src}-${i}`} className="relative size-16 shrink-0 overflow-hidden rounded-[10px] bg-soft-gray">
              <ListingImage src={src} alt={`Foto ${i + 1}`} />
            </div>
          ))}
        </div>
        <KV k="Kondisi" v={draft.conditionNotes.trim()} />
      </Section>

      <Section title={STEPS[1].label} step={1} onEdit={onEdit}>
        <p className="line-clamp-4 whitespace-pre-line text-body-sm text-graphite">{draft.description.trim()}</p>
        {vehicle && (
          <div className="mt-2">
            <KV k="Nomor polisi" v={plate || "-"} />
            <KV k="STNK berlaku" v={draft.stnkValidUntil ? formatDate(draft.stnkValidUntil, true) : "-"} />
            <KV k="SIM penyewa" v={draft.simClass ? `SIM ${draft.simClass}` : "-"} />
          </div>
        )}
      </Section>

      <Section title={STEPS[2].label} step={2} onEdit={onEdit}>
        <KV k="Harga" v={`${rupiah(draft.pricePerDay ?? 0)}/hari`} strong />
        {draft.pricePerHour ? <KV k="Per jam" v={rupiah(draft.pricePerHour)} /> : null}
        {draft.pricePerWeek ? <KV k="Per minggu" v={rupiah(draft.pricePerWeek)} /> : null}
        {draft.discountOn && draft.discountPercent ? <KV k="Diskon" v={`${draft.discountPercent}% untuk sewa ≥ ${draft.discountMinDays} hari`} /> : null}
        {draft.minDays || draft.maxDays ? <KV k="Lama sewa" v={[draft.minDays && `min ${draft.minDays} hari`, draft.maxDays && `maks ${draft.maxDays} hari`].filter(Boolean).join(", ")} /> : null}
        <KV k="Nilai barang" v={rupiah(itemValue)} />
        {isToko && <KV k="Stok" v={`${draft.stock} unit`} />}
      </Section>

      <Section title={STEPS[3].label} step={3} onEdit={onEdit}>
        <p className="text-caption text-smoke">Penyewa memilih salah satu:</p>
        <ul className="mt-1.5 space-y-1">
          {draft.collateral.map((o) => (
            <li key={o.id} className="text-body-sm text-ink">
              • {describeCollateral(cleanOption(o), itemValue)}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={STEPS[4].label} step={4} onEdit={onEdit}>
        <KV k="Serah terima" v={draft.handover.map((h) => HANDOVER_LABEL[h]).join(", ")} />
        {draft.meetingPoint.trim() && <KV k="Titik temu" v={draft.meetingPoint.trim()} />}
        {hours && <KV k="Jam" v={hours} />}
        <KV k="Lokasi" v={`${AREA_BY_ID[draft.areaId]?.name} · jangkauan ${draft.radiusKm.toLocaleString("id-ID")} km`} />
        <KV k="Denda telat" v={`${rupiah(lateFeeOf(draft))}/hari, maks ${capPct}% nilai (${rupiah(Math.round((itemValue * capPct) / 100))})`} />
        <KV k="Pembatalan" v={draft.cancellation.trim()} />
        {draft.special.trim() && <KV k="Syarat khusus" v={draft.special.trim()} />}
        <KV k="Persetujuan" v={approval === "otomatis" ? `Otomatis untuk rating ≥ ${draft.autoApproveMinRating.toLocaleString("id-ID")}` : "Manual"} />
      </Section>
    </div>
  );
}
