"use client";

import { ChevronDown, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { ListingFilters } from "@/lib/selectors";
import { activeLabel, type FilterKey } from "./searchParams";

const PILLS: { key: FilterKey; label: string }[] = [
  { key: "kategori", label: "Kategori" },
  { key: "harga", label: "Harga" },
  { key: "tanggal", label: "Tanggal" },
  { key: "serah", label: "Serah terima" },
  { key: "jaminan", label: "Jaminan" },
  { key: "penyedia", label: "Penyedia" },
  { key: "urut", label: "Urutkan" },
];

const pill = "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border text-nav font-medium transition-colors";

/**
 * Row of filter pills (FR-S4). Idle = outlined pill that opens its sheet; active = black pill showing the value,
 * with its own × to clear. Scrolls sideways on phones instead of wrapping.
 */
export function FilterBar({ filters, onOpen, onClear }: { filters: ListingFilters; onOpen: (key: FilterKey) => void; onClear: (key: FilterKey) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="toolbar" aria-label="Filter pencarian">
      {PILLS.map(({ key, label }) => {
        const value = activeLabel(key, filters);
        if (!value)
          return (
            <button key={key} type="button" onClick={() => onOpen(key)} className={cn(pill, "border-border-gray bg-white px-3.5 text-ink hover:border-ink")}>
              {label}
              <ChevronDown className="size-3.5 text-smoke" aria-hidden />
            </button>
          );
        return (
          <span key={key} className={cn(pill, "border-ink bg-ink pl-3.5 pr-1 text-white")}>
            <button type="button" onClick={() => onOpen(key)} className="max-w-[180px] truncate" aria-label={`${label}: ${value}. Ubah`}>
              {value}
            </button>
            <button type="button" onClick={() => onClear(key)} aria-label={`Hapus filter ${label}`} className="grid size-7 place-items-center rounded-full hover:bg-white/15">
              <X className="size-3.5" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
