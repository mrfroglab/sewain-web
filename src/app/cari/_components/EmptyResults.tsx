"use client";

import { Expand, Megaphone, SearchX } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Layout";

/** FR-S5: nothing found → offer a wider radius and a post on the wanted board. */
export function EmptyResults({
  query,
  radiusKm,
  nextRadius,
  nextRadiusCount,
  hasFilters,
  onWiden,
  onReset,
}: {
  query?: string;
  radiusKm: number;
  nextRadius?: number;
  nextRadiusCount: number;
  hasFilters: boolean;
  onWiden: () => void;
  onReset: () => void;
}) {
  const board = `/papan?buat=1${query ? `&q=${encodeURIComponent(query)}` : ""}`;
  const hint =
    nextRadius && nextRadiusCount > 0
      ? ` Ada ${nextRadiusCount} barang kalau radiusnya ${nextRadius} km.`
      : " Coba perluas radius, atau tulis di papan permintaan supaya penyedia sekitar tahu ada yang butuh.";
  return (
    <EmptyState
      icon={<SearchX className="size-5" />}
      title={query ? `Belum ada “${query}” di sekitarmu` : "Belum ada barang yang cocok"}
      description={`Tidak ada hasil dalam radius ${radiusKm} km${hasFilters ? " dengan filter ini" : ""}.${hint}`}
      action={
        <>
          {nextRadius && (
            <Button onClick={onWiden}>
              <Expand className="size-4" /> Perluas radius ke {nextRadius} km
            </Button>
          )}
          <ButtonLink href={board} variant="secondary">
            <Megaphone className="size-4" /> Buat permintaan di papan
          </ButtonLink>
          {hasFilters && (
            <Button variant="ghost" onClick={onReset}>
              Hapus semua filter
            </Button>
          )}
        </>
      }
    />
  );
}
