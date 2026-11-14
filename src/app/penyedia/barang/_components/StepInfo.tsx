"use client";

import { Bike, Camera, CookingPot, Dumbbell, Info, Lock, Projector, Shirt, ShieldAlert, Tent, Umbrella, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ChoiceCard } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Layout";
import { CATEGORIES, CATEGORY_BY_ID, FORBIDDEN_CATEGORIES, RISK_NOTES } from "@/lib/data/categories";
import { formatDate } from "@/lib/format";
import type { CategoryId } from "@/lib/types";
import { isVehicle, maskPlate } from "./draft";
import { BigText, BigTextArea, Block, FieldShell } from "./fields";
import type { ListingForm } from "./useListingForm";

const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  camping: Tent,
  kamera: Camera,
  "pakaian-acara": Shirt,
  elektronik: Projector,
  "alat-masak": CookingPot,
  "musim-hujan": Umbrella,
  kendaraan: Bike,
  olahraga: Dumbbell,
};

/** Step 2 — judul, kategori (forbidden ones locked, FR-L4), deskripsi, keyword filter, vehicle fields (FR-L6). */
export function StepInfo({ form, banned }: { form: ListingForm; banned: string[] }) {
  const { draft, set, visibleErrors: e } = form;
  const category = draft.category ? CATEGORY_BY_ID[draft.category] : null;
  const vehicle = isVehicle(draft.category);
  const masked = draft.plate.trim() ? maskPlate(draft.plate) : null;

  return (
    <div className="space-y-8">
      <Block>
        <BigText
          label="Judul"
          anchor="title"
          value={draft.title}
          onChange={(v) => set({ title: v })}
          placeholder="Mis. Panci besar 40 liter"
          maxLength={70}
          counter
          error={e.title}
          help="Sebut nama barang + ukuran/kapasitas. Singkat saja."
        />
      </Block>

      <Block title="Kategori" description="Pilih yang paling cocok. Kategori menentukan saran jaminan dan aturan tambahan.">
        <div data-field="category" data-error={e.category ? "true" : undefined}>
          <div role="radiogroup" aria-label="Kategori" className="grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c.id];
              return (
                <ChoiceCard
                  key={c.id}
                  selected={draft.category === c.id}
                  onClick={() => set({ category: c.id, ...(c.risk === "kendaraan" ? { approval: "manual" as const } : {}) })}
                  icon={<Icon className="size-5" />}
                  title={c.name}
                  description={c.examples}
                  className="min-h-[60px]"
                />
              );
            })}
          </div>
          {e.category && <p className="mt-1.5 text-caption text-sale-text">{e.category}</p>}
        </div>

        {category?.risk && (
          <Notice icon={<ShieldAlert className="size-4" />} title="Kategori berisiko tinggi" tone="outline">
            {RISK_NOTES[category.risk]}
          </Notice>
        )}

        <div className="rounded-[12px] bg-soft-gray p-3.5">
          <p className="flex items-center gap-2 text-body-sm font-semibold text-ink">
            <Lock className="size-4 shrink-0" /> Kategori terlarang · tidak bisa dipilih
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Kategori terlarang, tidak bisa dipilih">
            {FORBIDDEN_CATEGORIES.map((f) => (
              <li
                key={f}
                title="Tidak bisa dipilih"
                className="inline-flex max-w-full cursor-not-allowed items-start gap-1.5 rounded-[10px] border border-border-gray bg-white px-2.5 py-1.5 text-caption text-ash"
              >
                <Lock className="mt-px size-3 shrink-0" />
                <span className="min-w-0">{f}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-caption text-smoke">
            Dokumen seperti BPKB tetap boleh jadi <i>jaminan</i>, yang dilarang adalah menyewakannya.{" "}
            <Link href="/bantuan#larangan" className="font-medium text-ink underline underline-offset-2">
              Baca aturannya
            </Link>
          </p>
        </div>
      </Block>

      <Block title="Deskripsi">
        <BigTextArea
          label="Ceritakan barangnya"
          anchor="description"
          value={draft.description}
          onChange={(v) => set({ description: v })}
          placeholder="Ukuran, kelengkapan (tutup, kabel, tas), cocok untuk acara apa, cara pakai singkat."
          maxLength={600}
          rows={5}
          error={e.description}
          help={`${draft.description.trim().length} huruf · minimal 20`}
        />
        {banned.length > 0 && (
          <div data-field="banned" data-error="true">
            <Notice icon={<Info className="size-4" />} title="Ada kata yang tidak diizinkan" tone="ink">
              Kata {banned.map((w) => `“${w}”`).join(", ")} termasuk daftar terlarang di Sewain. Hapus kata itu dari judul atau deskripsi untuk lanjut.
              Kalau barangmu memang termasuk barang terlarang, barang itu tidak bisa disewakan.
            </Notice>
          </div>
        )}
      </Block>

      {vehicle && (
        <Block title="Data kendaraan" description="Wajib untuk kendaraan bermotor. Nomor polisi tampil disamarkan ke publik.">
          <BigText
            label="Nomor polisi"
            anchor="plate"
            value={draft.plate}
            onChange={(v) => set({ plate: v.toUpperCase() })}
            placeholder={draft.plateMasked ? `Tersimpan: ${draft.plateMasked}` : "AB 1234 XY"}
            maxLength={12}
            error={e.plate}
            help={
              masked
                ? `Tampil ke publik sebagai: ${masked}`
                : draft.plateMasked
                  ? `Tersimpan sebagai ${draft.plateMasked}. Isi lagi hanya kalau ganti kendaraan.`
                  : "Hanya versi samaran yang disimpan, mis. AB 4*** **."
            }
          />
          <FieldShell label="STNK berlaku sampai" htmlFor="stnk" anchor="stnk" error={e.stnk} help={draft.stnkValidUntil ? `Berlaku sampai ${formatDate(draft.stnkValidUntil, true)}` : "Lihat tanggal di lembar STNK."}>
            <input
              id="stnk"
              type="date"
              value={draft.stnkValidUntil}
              onChange={(ev) => set({ stnkValidUntil: ev.target.value })}
              className="h-12 w-full rounded-[12px] border border-border-gray bg-white px-4 text-body-lg text-ink hover:border-ash focus:border-ink focus:outline-none"
            />
          </FieldShell>
          <FieldShell label="Penyewa wajib punya SIM" anchor="simClass" error={e.simClass}>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceCard selected={draft.simClass === "C"} onClick={() => set({ simClass: "C" })} title="SIM C" description="Motor" />
              <ChoiceCard selected={draft.simClass === "A"} onClick={() => set({ simClass: "A" })} title="SIM A" description="Mobil" />
            </div>
          </FieldShell>
          <Notice title="Saat serah terima">Foto odometer dan BBM wajib diambil saat serah terima dan pengembalian. Persetujuan otomatis tidak berlaku untuk kendaraan.</Notice>
        </Block>
      )}
    </div>
  );
}
