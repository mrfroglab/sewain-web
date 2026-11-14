"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ChoiceCard, TextField } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { CATEGORIES } from "@/lib/data/categories";
import { addDays, isoDate } from "@/lib/format";
import type { ListingFilters } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { Chip } from "./Chip";
import { FILTER_PARAMS, priceLabel, SORT_LABEL, type FilterKey, type ParamPatch, type SortKey } from "./searchParams";

interface Option {
  value: string | undefined;
  title: string;
  description?: string;
}

const SHEETS: Record<FilterKey, { title: string; description?: string }> = {
  kategori: { title: "Kategori" },
  harga: { title: "Harga sewa per hari" },
  tanggal: { title: "Tanggal sewa", description: "Hanya tampilkan barang yang belum dipesan orang lain di tanggal ini." },
  serah: { title: "Serah terima", description: "Cara barang berpindah tangan, diatur oleh penyedia." },
  jaminan: { title: "Jaminan", description: "Pilih bentuk jaminan yang sanggup kamu titipkan." },
  penyedia: { title: "Tipe penyedia" },
  urut: { title: "Urutkan" },
};

const OPTIONS: Partial<Record<FilterKey, Option[]>> = {
  kategori: [{ value: undefined, title: "Semua kategori" }, ...CATEGORIES.map((c) => ({ value: c.id, title: c.name, description: c.examples }))],
  serah: [
    { value: undefined, title: "Semua cara" },
    { value: "cod", title: "COD / ketemuan", description: "Ketemu di titik publik yang disepakati, mis. lobi perpustakaan." },
    { value: "jemput", title: "Ambil sendiri", description: "Kamu datang ke tempat penyedia." },
    { value: "kurir", title: "Kurir", description: "Dikirim pakai kurir, ongkosnya kamu yang urus." },
  ],
  jaminan: [
    { value: undefined, title: "Semua jaminan" },
    { value: "cukup-identitas", title: "Cukup titip kartu identitas", description: "KTM, SIM, atau kartu lain. Tanpa uang deposit." },
    { value: "deposit", title: "Uang deposit", description: "Dikembalikan utuh kalau barang kembali sesuai." },
    { value: "barang", title: "Titip barang lain", description: "Mis. titip HP atau laptop selama sewa." },
    { value: "custom", title: "Jaminan custom", description: "Mis. BPKB atau dokumen lain sesuai kesepakatan." },
  ],
  penyedia: [
    { value: undefined, title: "Semua penyedia" },
    { value: "individu", title: "Individu", description: "Mahasiswa atau warga sekitar yang menyewakan barang pribadi." },
    { value: "toko", title: "Toko rental", description: "Rental kecil, biasanya stoknya lebih dari satu." },
  ],
  urut: (Object.keys(SORT_LABEL) as SortKey[]).map((k) => ({ value: k === "jarak" ? undefined : k, title: SORT_LABEL[k], description: k === "jarak" ? "Bawaan: jarak dulu, lalu yang paling cocok." : undefined })),
};

/** Current value of a single-choice filter, as its URL value. */
function currentValue(key: FilterKey, f: ListingFilters): string | undefined {
  switch (key) {
    case "kategori":
      return f.category;
    case "serah":
      return f.handover;
    // "identitas" and "cukup-identitas" filter the same way; show them as one choice.
    case "jaminan":
      return f.collateral === "identitas" ? "cukup-identitas" : f.collateral;
    case "penyedia":
      return f.providerType;
    case "urut":
      return f.sort === "jarak" ? undefined : f.sort;
    default:
      return undefined;
  }
}

export function FilterSheet({ openKey, filters, onClose, update }: { openKey: FilterKey | null; filters: ListingFilters; onClose: () => void; update: (patch: ParamPatch) => void }) {
  const key = openKey ?? "kategori";
  const meta = SHEETS[key];
  const options = OPTIONS[key];
  const formId = `filter-${key}`;
  const apply = (patch: ParamPatch) => {
    update(patch);
    onClose();
  };
  const clearKey = () => {
    update(Object.fromEntries(FILTER_PARAMS[key].map((p) => [p, null])));
    onClose();
  };

  return (
    <Sheet
      open={openKey != null}
      onClose={onClose}
      title={meta.title}
      description={meta.description}
      footer={
        options ? undefined : (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={clearKey}>
              Hapus
            </Button>
            <Button type="submit" form={formId} className="flex-1">
              Terapkan
            </Button>
          </div>
        )
      }
    >
      {options ? (
        <div className="space-y-2" role="radiogroup" aria-label={meta.title}>
          {options.map((o) => (
            <ChoiceCard
              key={o.value ?? "semua"}
              selected={currentValue(key, filters) === o.value}
              title={o.title}
              description={o.description}
              onClick={() => {
                update({ [FILTER_PARAMS[key][0]]: o.value ?? null });
                onClose();
              }}
            />
          ))}
        </div>
      ) : key === "harga" ? (
        <PriceForm id={formId} filters={filters} onApply={apply} />
      ) : (
        <DateForm id={formId} filters={filters} onApply={apply} />
      )}
    </Sheet>
  );
}

const PRICE_PRESETS: { min?: number; max?: number }[] = [{ max: 15_000 }, { min: 15_000, max: 40_000 }, { min: 40_000, max: 100_000 }, { min: 100_000 }];

const digits = (v: string) => v.replace(/\D/g, "").slice(0, 9);

function PriceForm({ id, filters, onApply }: { id: string; filters: ListingFilters; onApply: (p: ParamPatch) => void }) {
  const [min, setMin] = useState(filters.minPrice != null ? String(filters.minPrice) : "");
  const [max, setMax] = useState(filters.maxPrice != null ? String(filters.maxPrice) : "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    let lo = min ? Number(min) : null;
    let hi = max ? Number(max) : null;
    if (lo != null && hi != null && lo > hi) [lo, hi] = [hi, lo];
    onApply({ min: lo, max: hi });
  };

  return (
    <form id={id} onSubmit={submit}>
      <div className="flex flex-wrap gap-2">
        {PRICE_PRESETS.map((p) => {
          const active = String(p.min ?? "") === min && String(p.max ?? "") === max;
          return (
            <Chip
              key={priceLabel(p.min, p.max)}
              active={active}
              onClick={() => {
                setMin(p.min != null ? String(p.min) : "");
                setMax(p.max != null ? String(p.max) : "");
              }}
            >
              {priceLabel(p.min, p.max)}
            </Chip>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <TextField label="Paling murah" prefix="Rp" inputMode="numeric" placeholder="0" value={min} onChange={(e) => setMin(digits(e.target.value))} />
        <TextField label="Paling mahal" prefix="Rp" inputMode="numeric" placeholder="Bebas" value={max} onChange={(e) => setMax(digits(e.target.value))} />
      </div>
      <p className="mt-3 text-caption text-smoke">Harga sewa per hari, belum termasuk jaminan.</p>
    </form>
  );
}

function DateForm({ id, filters, onApply }: { id: string; filters: ListingFilters; onApply: (p: ParamPatch) => void }) {
  const today = isoDate(useAppStore.getState().now());
  const [start, setStart] = useState(filters.start ?? "");
  const [end, setEnd] = useState(filters.end ?? "");
  const invalid = !!start && !!end && end < start;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    const s = start || end;
    const t = end || start;
    onApply({ mulai: s || null, selesai: t || null });
  };

  const quick = [
    { label: "Besok", start: addDays(today, 1), end: addDays(today, 1) },
    { label: "3 hari mulai besok", start: addDays(today, 1), end: addDays(today, 3) },
    { label: "Minggu depan", start: addDays(today, 7), end: addDays(today, 13) },
  ];

  return (
    <form id={id} onSubmit={submit}>
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <Chip
            key={q.label}
            active={start === q.start && end === q.end}
            onClick={() => {
              setStart(q.start);
              setEnd(q.end);
            }}
          >
            {q.label}
          </Chip>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <TextField label="Ambil" type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} />
        <TextField label="Kembali" type="date" min={start || today} value={end} onChange={(e) => setEnd(e.target.value)} error={invalid && "Tanggal kembali harus setelah tanggal ambil."} />
      </div>
    </form>
  );
}
