"use client";

import { ListingImage } from "@/components/listing/ListingImage";
import { EvidencePhoto } from "@/components/photo/EvidencePhoto";
import { cn } from "@/components/ui/cn";
import type { ID } from "@/lib/types";

export type CompareCell = { kind: "ref"; src: string } | { kind: "photo"; id: ID } | null | undefined;

export interface CompareColumn {
  label: string;
  cells: CompareCell[];
}

/**
 * Side-by-side evidence per angle (FR-P9): one row per angle, one column per photo moment.
 * Three columns scroll horizontally per row on phones; two columns always fit.
 */
export function ComparisonRows({ columns, rowLabels, bookingCode, minRows = 0 }: { columns: CompareColumn[]; rowLabels: string[]; bookingCode?: string; minRows?: number }) {
  const rows = Math.max(minRows, rowLabels.length, ...columns.map((c) => c.cells.length));
  const wide = columns.length >= 3;
  if (rows === 0) return <p className="rounded-[12px] bg-soft-gray p-4 text-body-sm text-smoke">Belum ada foto untuk dibandingkan.</p>;
  return (
    <div className="space-y-5">
      <div className={cn("hidden gap-3 sm:grid", wide ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {columns.map((c) => (
          <p key={c.label} className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">
            {c.label}
          </p>
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <p className="mb-2 text-body-sm font-semibold text-ink">{rowLabels[i] ?? `Sudut ${i + 1}`}</p>
          <div className={cn(wide ? "no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0" : "grid grid-cols-2 gap-2 sm:gap-3")}>
            {columns.map((c) => (
              <div key={c.label} className={cn("min-w-0", wide && "w-[42%] min-w-[132px] shrink-0 snap-start sm:w-auto sm:min-w-0")}>
                <p className="mb-1 text-micro font-semibold uppercase tracking-[0.06em] text-smoke sm:hidden">{c.label}</p>
                <Cell cell={c.cells[i]} bookingCode={bookingCode} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Cell({ cell, bookingCode }: { cell: CompareCell; bookingCode?: string }) {
  if (!cell)
    return (
      <div className="grid aspect-square place-items-center rounded-image border border-dashed border-border-gray bg-white p-2 text-center text-micro text-ash">Belum ada foto</div>
    );
  if (cell.kind === "photo") return <EvidencePhoto id={cell.id} bookingCode={bookingCode} />;
  return <RefTile src={cell.src} />;
}

/** Listing reference photo (not an evidence record: no watermark/hash, labelled "referensi"). */
export function RefTile({ src, caption = "Foto listing" }: { src: string; caption?: string }) {
  return (
    <figure className="min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-image bg-soft-gray">
        <ListingImage src={src} alt="Foto referensi listing" />
        <span className="absolute left-1.5 top-1.5 rounded-control bg-white px-1.5 py-0.5 text-[9px] font-semibold text-ink shadow-hairline">referensi</span>
      </div>
      {caption && <figcaption className="mt-1 truncate text-micro text-ash">{caption}</figcaption>}
    </figure>
  );
}
