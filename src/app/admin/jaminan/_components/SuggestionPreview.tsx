"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { CATEGORIES, categoryName } from "@/lib/data/categories";
import { rupiah } from "@/lib/format";
import { describeCollateral, isHighValue, suggestCollateral, type CollateralLevel } from "@/lib/pricing";
import type { CategoryId, CollateralRules } from "@/lib/types";
import { MoneyField, toNumber } from "../../komisi/_components/NumberField";

const SAMPLES: { name: string; value: number; category: CategoryId }[] = [
  { name: "Payung", value: 120_000, category: "musim-hujan" },
  { name: "Tenda", value: 1_200_000, category: "camping" },
  { name: "Kamera", value: 9_500_000, category: "kamera" },
  { name: "Motor", value: 12_000_000, category: "kendaraan" },
];

const LEVEL_LABEL: Record<CollateralLevel, string> = { rendah: "Nilai rendah", sedang: "Nilai sedang", tinggi: "Nilai tinggi", kendaraan: "Kendaraan" };

/** What a provider would be told for typical items, recomputed live from the draft (FR-J3, FR-J4). */
export function SuggestionPreview({ rules, saved }: { rules: CollateralRules; saved: CollateralRules }) {
  const [value, setValue] = useState("3500000");
  const [category, setCategory] = useState<CategoryId>("elektronik");
  const custom = toNumber(value);

  return (
    <div className="space-y-6">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SAMPLES.map((s) => (
          <SampleCard key={s.name} name={s.name} value={s.value} category={s.category} rules={rules} saved={saved} />
        ))}
      </ul>

      <div className="rounded-card bg-soft-gray p-4">
        <p className="text-body-sm font-semibold text-ink">Coba barang lain</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MoneyField label="Nilai barang" value={value} onChange={setValue} />
          <Select label="Kategori" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {custom ? (
          <ul className="mt-3">
            <SampleCard name="Barang uji" value={custom} category={category} rules={rules} saved={saved} />
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function SampleCard({ name, value, category, rules, saved }: { name: string; value: number; category: CategoryId; rules: CollateralRules; saved: CollateralRules }) {
  const s = suggestCollateral(value, category, rules);
  const before = suggestCollateral(value, category, saved);
  const changed = s.title !== before.title || s.minCoverage !== before.minCoverage || isHighValue(value, rules) !== isHighValue(value, saved);
  const presets = s.preset.map((p) => describeCollateral({ id: "preview", ...p }, value));

  return (
    <li className="rounded-card border border-border-gray bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-ink">{name}</p>
          <p className="text-caption text-smoke">
            {categoryName(category)} · {rupiah(value)}
          </p>
        </div>
        <Badge tone="soft">{LEVEL_LABEL[s.level]}</Badge>
      </div>
      <p className="mt-3 text-body-sm font-semibold text-ink">{s.title}</p>
      <p className="mt-0.5 text-caption text-graphite">{s.detail}</p>
      <p className="mt-2 text-caption text-smoke">Opsi siap pakai untuk penyedia: {presets.join(" · ")}</p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <Badge tone="outline">{s.minCoverage > 0 ? `Jaminan minimal ± ${rupiah(s.minCoverage)}` : "Tanpa minimal nominal"}</Badge>
        {isHighValue(value, rules) && <Badge tone="ink">Barang bernilai tinggi</Badge>}
      </div>
      {changed && (
        <p className="mt-2.5 border-t border-border-gray pt-2 text-caption text-smoke">
          Sebelumnya: {before.title}
          {before.minCoverage > 0 ? ` (± ${rupiah(before.minCoverage)})` : ""}
          {isHighValue(value, saved) ? ", badge bernilai tinggi" : ""}
        </p>
      )}
    </li>
  );
}
