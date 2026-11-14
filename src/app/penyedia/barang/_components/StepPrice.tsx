"use client";

import { Store } from "lucide-react";
import { useMemo } from "react";
import { Toggle } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Layout";
import { CATEGORY_BY_ID } from "@/lib/data/categories";
import { addDays, rupiah, rupiahShort } from "@/lib/format";
import { quoteRent } from "@/lib/pricing";
import { useAppStore } from "@/lib/store";
import { Block, MoneyInput, NumberStepper } from "./fields";
import type { ListingForm } from "./useListingForm";

/** Step 3 — harga (FR-L1/L2), nilai barang, diskon durasi, durasi min/maks, stok (akun Toko, FR-A7). */
export function StepPrice({ form, isToko, storeName }: { form: ListingForm; isToko: boolean; storeName?: string }) {
  const { draft, set, visibleErrors: e } = form;
  const listings = useAppStore((s) => s.listings);

  // "Barang serupa di sekitar": price range of live listings in the same category.
  const range = useMemo(() => {
    if (!draft.category) return null;
    const prices = listings.filter((l) => l.category === draft.category && l.status === "aktif").map((l) => l.pricePerDay);
    if (prices.length < 2) return null;
    return { min: Math.min(...prices), max: Math.max(...prices), n: prices.length };
  }, [listings, draft.category]);

  const weekTooHigh = !!(draft.pricePerWeek && draft.pricePerDay && draft.pricePerWeek >= draft.pricePerDay * 7);
  const example =
    draft.discountOn && draft.pricePerDay && draft.discountMinDays && draft.discountPercent
      ? quoteRent(
          { pricePerDay: draft.pricePerDay, pricePerWeek: draft.pricePerWeek ?? undefined, durationDiscount: { minDays: draft.discountMinDays, percent: draft.discountPercent } },
          "2026-01-05",
          addDays("2026-01-05", draft.discountMinDays),
        )
      : null;

  return (
    <div className="space-y-8">
      <Block title="Harga sewa">
        <MoneyInput
          label="Harga per hari"
          anchor="pricePerDay"
          value={draft.pricePerDay}
          onChange={(v) => set({ pricePerDay: v })}
          suffix="/hari"
          placeholder="25.000"
          error={e.pricePerDay}
          help={
            range
              ? `Barang ${CATEGORY_BY_ID[draft.category!].name.toLowerCase()} lain di Sewain: ${rupiahShort(range.min)}–${rupiahShort(range.max)}/hari.`
              : "Harga yang dibayar penyewa untuk 1 hari (24 jam)."
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyInput label="Harga per jam" optional value={draft.pricePerHour} onChange={(v) => set({ pricePerHour: v })} suffix="/jam" placeholder="Kosongkan" />
          <MoneyInput
            label="Harga per minggu"
            optional
            value={draft.pricePerWeek}
            onChange={(v) => set({ pricePerWeek: v })}
            suffix="/minggu"
            placeholder="Kosongkan"
            help={weekTooHigh ? "Lebih mahal dari 7× harga harian, jadi penyewa tidak untung. Coba turunkan." : "Dipakai otomatis untuk sewa 7 hari atau lebih."}
          />
        </div>
      </Block>

      <Block title="Diskon sewa lama" description="Opsional. Bikin penyewa betah sewa lebih lama.">
        <Toggle checked={draft.discountOn} onChange={(v) => set({ discountOn: v })} label="Kasih diskon untuk sewa beberapa hari" description="Tampil sebagai label diskon di kartu barang." />
        {draft.discountOn && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <NumberStepper label="Mulai dari" anchor="discountMinDays" value={draft.discountMinDays} onChange={(v) => set({ discountMinDays: v })} min={2} max={60} suffix="hari" error={e.discountMinDays} />
              <NumberStepper label="Potongan" anchor="discountPercent" value={draft.discountPercent} onChange={(v) => set({ discountPercent: v })} min={1} max={90} step={5} suffix="%" error={e.discountPercent} />
            </div>
            {example && (
              <p className="text-caption text-smoke">
                Contoh: sewa {example.days} hari jadi <b className="font-semibold text-ink">{rupiah(example.total)}</b> (hemat {rupiah(example.discount)}).
              </p>
            )}
          </>
        )}
      </Block>

      <Block title="Lama sewa" description="Opsional. Kosongkan kalau bebas.">
        <div className="grid grid-cols-2 gap-3">
          <NumberStepper label="Minimal" optional value={draft.minDays} onChange={(v) => set({ minDays: v })} min={1} max={60} suffix="hari" emptyLabel="Bebas" />
          <NumberStepper label="Maksimal" optional anchor="maxDays" value={draft.maxDays} onChange={(v) => set({ maxDays: v })} min={1} max={90} suffix="hari" emptyLabel="Bebas" error={e.maxDays} />
        </div>
      </Block>

      <Block title="Nilai barang">
        <MoneyInput
          label="Nilai barang saat ini (perkiraan)"
          anchor="itemValue"
          value={draft.itemValue}
          onChange={(v) => set({ itemValue: v })}
          placeholder="450.000"
          error={e.itemValue}
          help="Kira-kira harga kalau beli bekas hari ini. Dipakai untuk saran jaminan dan batas denda telat, tidak ada batas maksimal."
        />
      </Block>

      {isToko && (
        <Block title="Stok" description={`Akun Toko${storeName ? ` · ${storeName}` : ""} bisa menyewakan beberapa unit sekaligus.`}>
          <NumberStepper label="Jumlah unit yang sama" anchor="stock" value={draft.stock} onChange={(v) => set({ stock: v ?? 1 })} min={1} max={99} suffix="unit" error={e.stock} />
          <Notice icon={<Store className="size-4" />}>Jadwal sewa dihitung per unit: barang tetap bisa dipesan selama masih ada unit kosong di tanggal itu.</Notice>
        </Block>
      )}
    </div>
  );
}
