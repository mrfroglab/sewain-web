"use client";

import { Camera, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { EvidenceGrid, EvidencePhoto } from "@/components/photo/EvidencePhoto";
import { cn } from "@/components/ui/cn";
import { Notice } from "@/components/ui/Layout";
import { formatDateTime } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import type { BookingView } from "./shared";

/** Desktop comparison grid: label column + one column per stage (static classes for Tailwind). */
const COMPARE_COLS: Record<number, string> = {
  1: "grid-cols-[88px_minmax(0,1fr)]",
  2: "grid-cols-[88px_repeat(2,minmax(0,1fr))]",
  3: "grid-cols-[88px_repeat(3,minmax(0,1fr))]",
};

/**
 * "Foto bukti" (PRD 10): reference (listing) → check-out (+ jaminan) → check-in.
 * Phones: stacked per stage. Desktop: side by side per angle (FR-P9).
 */
export function EvidenceSection({ view, className }: { view: BookingView; className?: string }) {
  const { b } = view;
  const photos = useAppStore((s) => s.photos);
  const ref = b.agreement.referencePhotos;
  const co = b.checkout?.photoIds ?? [];
  const col = b.checkout?.collateralPhotoIds ?? [];
  const ci = b.checkin?.photoIds ?? [];
  const angleOf = (id?: string) => (id ? photos.find((p) => p.id === id)?.angle : undefined);

  const stages = [
    { key: "ref", label: "Referensi", sub: "Foto listing" },
    ...(co.length ? [{ key: "co", label: "Check-out", sub: b.checkout ? formatDateTime(b.checkout.submittedAt) : "" }] : []),
    ...(ci.length ? [{ key: "ci", label: "Check-in", sub: b.checkin ? formatDateTime(b.checkin.at) : "" }] : []),
  ];
  const rows = Math.max(ref.length, co.length, ci.length);
  // Side-by-side only makes sense once there is something to compare against the reference photos.
  const compare = stages.length > 1;
  const cellFor = (stage: string, i: number): ReactNode => {
    if (stage === "ref") return ref[i] ? <RefPhoto src={ref[i]} alt={`Referensi ${i + 1}`} aspect="aspect-[4/3]" /> : <EmptyCell />;
    const id = stage === "co" ? co[i] : ci[i];
    return id ? <EvidencePhoto id={id} bookingCode={b.code} aspect="aspect-[4/3]" /> : <EmptyCell />;
  };

  return (
    <section className={className} aria-labelledby="judul-foto">
      <div className="flex items-end justify-between gap-3">
        <h2 id="judul-foto" className="text-[17px] font-semibold tracking-[-0.2px] text-ink">
          Foto bukti
        </h2>
        <p className="text-caption text-smoke">Kode {b.code}</p>
      </div>
      <p className="mt-1 text-body-sm text-smoke">Setiap foto diberi cap waktu, kode booking, dan sidik SHA-256. Foto tidak bisa dihapus atau diganti, hanya ditambah.</p>

      {/* Phones / tablets: stacked by stage */}
      <div className={cn("mt-4 space-y-5", compare && "lg:hidden")}>
        <Stage title="Referensi" sub="Foto dari listing penyedia">
          <div className="grid grid-cols-3 gap-2">
            {ref.map((src, i) => (
              <RefPhoto key={`${src}-${i}`} src={src} alt={`Referensi ${i + 1}`} />
            ))}
          </div>
        </Stage>
        {co.length > 0 && (
          <Stage title="Check-out · serah terima" sub={b.checkout ? formatDateTime(b.checkout.submittedAt) : undefined}>
            <EvidenceGrid ids={co} bookingCode={b.code} />
          </Stage>
        )}
        {ci.length > 0 && (
          <Stage title="Check-in · pengembalian" sub={b.checkin ? formatDateTime(b.checkin.at) : undefined}>
            <EvidenceGrid ids={ci} bookingCode={b.code} />
          </Stage>
        )}
      </div>

      {/* Desktop: side by side per angle */}
      {compare && (
        <div className="mt-4 hidden lg:block">
          <div className={cn("grid max-w-[760px] items-start gap-3", COMPARE_COLS[stages.length])}>
            <span />
            {stages.map((s) => (
              <p key={s.key} className="text-body-sm font-semibold text-ink">
                {s.label}
                {s.sub && <span className="block text-caption font-normal text-smoke">{s.sub}</span>}
              </p>
            ))}
            {Array.from({ length: rows }, (_, i) => (
              <Row key={i} label={angleOf(co[i]) ?? angleOf(ci[i]) ?? `Sudut ${i + 1}`}>
                {stages.map((s) => (
                  <div key={s.key}>{cellFor(s.key, i)}</div>
                ))}
              </Row>
            ))}
          </div>
        </div>
      )}

      {col.length > 0 && (
        <Stage className="mt-5" title="Jaminan" sub="Hanya terlihat oleh kalian berdua dan mediator" icon={<ShieldCheck className="size-4" />}>
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
            {col.map((id) => (
              <EvidencePhoto key={id} id={id} bookingCode={b.code} />
            ))}
          </div>
        </Stage>
      )}

      {co.length === 0 && (
        <Notice className="mt-4" icon={<Camera className="size-4" />}>
          Foto check-out diambil saat serah terima: minimal 3 sudut barang plus foto jaminan. Saat pengembalian, foto check-in dibandingkan berdampingan dengan foto ini.
        </Notice>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <p className="pt-2 text-caption font-medium text-graphite">{label}</p>
      {children}
    </>
  );
}

function Stage({ title, sub, icon, className, children }: { title: string; sub?: string; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <p className="mb-2 flex flex-wrap items-center gap-x-1.5 text-body-sm font-semibold text-ink">
        {icon}
        {title}
        {sub && <span className="font-normal text-smoke">· {sub}</span>}
      </p>
      {children}
    </div>
  );
}

function RefPhoto({ src, alt, aspect = "aspect-square" }: { src: string; alt: string; aspect?: string }) {
  return (
    <figure className="min-w-0">
      <div className={cn("relative overflow-hidden rounded-image bg-soft-gray", aspect)}>
        <ListingImage src={src} alt={alt} />
      </div>
    </figure>
  );
}

function EmptyCell() {
  return <div className="grid aspect-[4/3] place-items-center rounded-image border border-dashed border-border-gray text-caption text-ash">Tidak ada</div>;
}
