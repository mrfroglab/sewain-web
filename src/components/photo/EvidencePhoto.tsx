"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { onPhotoLoadError, usePhoto, usePhotoSrc } from "@/lib/photos";
import { shortHash } from "@/lib/sha256";
import type { ID } from "@/lib/types";
import { cn } from "../ui/cn";

/**
 * Evidence photo tile (PRD 10): watermark with booking code + server time on the *display* (FR-P5),
 * "dari galeri" label (FR-P1), and the SHA-256 shown on demand (FR-P3). Click to enlarge.
 */
export function EvidencePhoto({ id, bookingCode, className, showMeta = true, aspect = "aspect-square" }: { id: ID; bookingCode?: string; className?: string; showMeta?: boolean; aspect?: string }) {
  const photo = usePhoto(id);
  const url = usePhotoSrc(photo?.src);
  const [open, setOpen] = useState(false);
  // A failed signed URL (expired/403): refetch the snapshot, then retry with the new src. `failed` holds the src
  // that broke, so a new src from the snapshot renders again automatically.
  const [failed, setFailed] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  if (!photo) return <div className={cn(aspect, "rounded-image bg-soft-gray", className)} />;
  const watermark = `${bookingCode ?? ""} · ${formatDateTime(photo.serverTimestamp)}`;
  return (
    <>
      <figure className={cn("min-w-0", className)}>
        <button type="button" onClick={() => url && setOpen(true)} className={cn("relative block w-full overflow-hidden rounded-image bg-soft-gray", aspect)} aria-label={`Perbesar foto ${photo.angle ?? ""}`}>
          {url ? (
            failed === url ? (
              <span className="absolute inset-0 grid place-items-center p-2 text-center text-micro text-ash">
                <span>
                  <ImageOff className="mx-auto mb-1 size-5" />
                  Foto belum bisa dimuat
                </span>
              </span>
            ) : (
              <img
                key={retry}
                src={url}
                alt={photo.angle ?? "Foto bukti"}
                className="absolute inset-0 size-full object-cover"
                loading="lazy"
                onError={() => {
                  if (onPhotoLoadError(photo.id, photo.src)) window.setTimeout(() => setRetry((n) => n + 1), 1500);
                  else setFailed(url);
                }}
              />
            )
          ) : url === null ? (
            <span className="absolute inset-0 grid place-items-center p-2 text-center text-micro text-ash">
              <span>
                <ImageOff className="mx-auto mb-1 size-5" />
                Foto tersimpan di perangkat pengunggah
              </span>
            </span>
          ) : (
            <span className="absolute inset-0 animate-pulse bg-soft-gray" />
          )}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 pb-1.5 pt-4 text-left font-mono text-[9px] leading-tight text-white/90">{watermark}</span>
          {photo.source !== "kamera" && (
            <span className="absolute left-1.5 top-1.5 rounded-control bg-white px-1.5 py-0.5 text-[9px] font-semibold text-ink shadow-hairline">{photo.source === "galeri" ? "dari galeri" : "demo"}</span>
          )}
        </button>
        {showMeta && (
          <figcaption className="mt-1 space-y-0.5">
            {photo.angle && <span className="block truncate text-micro font-medium text-graphite">{photo.angle}</span>}
            <span className="block truncate font-mono text-[9px] text-ash" title={`SHA-256 ${photo.sha256}`}>
              sha256 {shortHash(photo.sha256)}
            </span>
          </figcaption>
        )}
      </figure>
      {open && url && (
        <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Foto bukti" onClick={() => setOpen(false)}>
          <div className="relative max-h-full max-w-3xl">
            <img src={url} alt={photo.angle ?? "Foto bukti"} className="max-h-[80dvh] w-auto rounded-image object-contain" />
            <p className="mt-2 text-center font-mono text-[11px] text-white/80">
              {watermark} · {photo.source} · SHA-256 {photo.sha256}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

/** Responsive grid of evidence photos. */
export function EvidenceGrid({ ids, bookingCode, cols = 3 }: { ids: ID[]; bookingCode?: string; cols?: 2 | 3 | 4 }) {
  return (
    <div className={cn("grid gap-2", cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-4")}>
      {ids.map((id) => (
        <EvidencePhoto key={id} id={id} bookingCode={bookingCode} />
      ))}
    </div>
  );
}
