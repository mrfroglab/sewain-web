"use client";

import { Label, Toggle } from "@/components/ui/Field";
import type { CommissionBearer, CommissionMode } from "@/lib/types";
import { chipClass } from "../../_components/AdminUi";
import type { CommissionDraft, CommissionErrors } from "./draft";
import { MoneyField, PercentField } from "./NumberField";

const MODES: { value: CommissionMode; label: string }[] = [
  { value: "persen", label: "Persen" },
  { value: "flat", label: "Flat" },
];

const BEARERS: { value: CommissionBearer; label: string }[] = [
  { value: "penyewa", label: "Penyewa" },
  { value: "penyedia", label: "Penyedia" },
  { value: "split", label: "Dibagi" },
];

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className={chipClass(value === o.value, "min-w-20 justify-center")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** FR-K1 mode + value, FR-K2 min/max, FR-K3 bearer, FR-K6 global switch. */
export function CommissionForm({ draft, errors, onChange }: { draft: CommissionDraft; errors: CommissionErrors; onChange: (patch: Partial<CommissionDraft>) => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-[12px] border border-border-gray p-4">
        <Toggle
          checked={draft.active}
          onChange={(active) => onChange({ active })}
          label={draft.active ? "Komisi aktif" : "Komisi nonaktif (pilot 0%)"}
          description={
            draft.active
              ? "Komisi ditagih di setiap booking baru sesuai pengaturan di bawah."
              : "Booking baru tidak ditagih komisi, tapi nilai “seandainya aktif” tetap dicatat di kesepakatan untuk analisis (FR-K6)."
          }
        />
      </div>

      <Segmented label="Bentuk komisi" value={draft.mode} options={MODES} onChange={(mode) => onChange({ mode })} />

      {draft.mode === "persen" ? (
        <PercentField
          label="Persentase dari nilai sewa"
          value={draft.percent}
          onChange={(percent) => onChange({ percent })}
          error={errors.percent}
          help="Mis. 10% dari nilai sewa. Dihitung dari sewa saja, bukan jaminan/deposit (FR-K4)."
          className="max-w-xs"
        />
      ) : (
        <MoneyField
          label="Nominal per transaksi"
          value={draft.flat}
          onChange={(flat) => onChange({ flat })}
          error={errors.flat}
          help="Mis. Rp3.000 per transaksi, berapa pun nilai sewanya."
          className="max-w-xs"
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MoneyField label="Minimum" optional placeholder="Tanpa batas" value={draft.min} onChange={(min) => onChange({ min })} error={errors.min} help="Supaya transaksi kecil tetap layak." />
        <MoneyField label="Maksimum" optional placeholder="Tanpa batas" value={draft.max} onChange={(max) => onChange({ max })} error={errors.max} help="Supaya sewa besar tidak terasa mahal." />
      </div>

      <div>
        <Segmented label="Siapa yang menanggung" value={draft.bearer} options={BEARERS} onChange={(bearer) => onChange({ bearer })} />
        {draft.bearer === "split" && (
          <div className="mt-4 rounded-[12px] border border-border-gray p-4">
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className="font-semibold text-ink">Penyewa {draft.split}%</span>
              <span className="text-graphite">Penyedia {100 - draft.split}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={draft.split}
              onChange={(e) => onChange({ split: Number(e.target.value) })}
              aria-label="Bagian komisi yang ditanggung penyewa"
              aria-valuetext={`Penyewa ${draft.split} persen, penyedia ${100 - draft.split} persen`}
              className="mt-3 h-9 w-full cursor-pointer accent-ink"
            />
            <div className="flex justify-between text-micro text-ash">
              <span>Semua penyedia</span>
              <span>50:50</span>
              <span>Semua penyewa</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
