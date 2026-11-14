"use client";

import { useState } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { EvidencePhoto } from "@/components/photo/EvidencePhoto";
import { cn } from "@/components/ui/cn";
import { formatDateTime } from "@/lib/format";
import { usePhoto } from "@/lib/photos";
import { shortHash } from "@/lib/sha256";
import type { ID, PhotoRecord } from "@/lib/types";

export const SOURCE_LABEL: Record<PhotoRecord["source"], string> = {
  kamera: "Kamera",
  galeri: "Dari galeri",
  demo: "Foto contoh",
};

/**
 * Evidence photo for the mediator: watermark + "dari galeri" label from <EvidencePhoto>, plus the
 * SHA-256 that expands on tap (and shows on hover) so it can be checked against the stored hash (PRD 13.1).
 */
export function EvidenceTile({ id, bookingCode, className }: { id: ID; bookingCode?: string; className?: string }) {
  const photo = usePhoto(id);
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("min-w-0", className)}>
      <EvidencePhoto id={id} bookingCode={bookingCode} showMeta={false} />
      {photo && (
        <div className="mt-1">
          <p className={cn("truncate text-micro", photo.source === "galeri" ? "font-semibold text-ink" : "text-graphite")} title={formatDateTime(photo.serverTimestamp)}>
            {photo.angle ? `${photo.angle} · ` : ""}
            {SOURCE_LABEL[photo.source]}
          </p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            title={`SHA-256 ${photo.sha256}`}
            className="-my-1 block w-full py-1 text-left font-mono text-[9px] leading-tight text-ash hover:text-ink"
          >
            {open ? <span className="break-all text-ink">{photo.sha256}</span> : <span className="block truncate">sha256 {shortHash(photo.sha256)}</span>}
          </button>
        </div>
      )}
    </div>
  );
}

/** Listing reference photo from the agreement snapshot (not an evidence record: no watermark/hash). */
export function ReferenceTile({ src }: { src: string }) {
  return (
    <figure className="min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-image bg-soft-gray">
        <ListingImage src={src} alt="Foto referensi listing" />
        <span className="absolute left-1.5 top-1.5 rounded-control bg-white px-1.5 py-0.5 text-[9px] font-semibold text-ink shadow-hairline">referensi</span>
      </div>
      <figcaption className="mt-1 truncate text-micro text-smoke">Foto listing</figcaption>
    </figure>
  );
}

export function MissingTile({ label = "Tidak ada foto" }: { label?: string }) {
  return <div className="grid aspect-square place-items-center rounded-image border border-dashed border-border-gray bg-white p-2 text-center text-micro text-ash">{label}</div>;
}

/** Full-width placeholder when a whole evidence group is empty. */
export function EmptyNote({ children }: { children: string }) {
  return <p className="rounded-[12px] border border-dashed border-border-gray p-4 text-body-sm text-ash">{children}</p>;
}
