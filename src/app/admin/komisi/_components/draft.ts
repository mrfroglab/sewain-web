// Form state for the commission settings (FR-K1–K6). Numbers are strings while editing.

import type { CommissionBearer, CommissionConfig, CommissionMode } from "@/lib/types";
import { fromNumber, toNumber } from "./NumberField";

export interface CommissionDraft {
  active: boolean;
  mode: CommissionMode;
  percent: string;
  flat: string;
  min: string;
  max: string;
  bearer: CommissionBearer;
  split: number; // % paid by penyewa when bearer = split
}

export type CommissionErrors = Partial<Record<"percent" | "flat" | "min" | "max", string>>;

export const toDraft = (c: CommissionConfig): CommissionDraft => ({
  active: c.active,
  mode: c.mode,
  percent: fromNumber(c.percent),
  flat: fromNumber(c.flat),
  min: fromNumber(c.min),
  max: fromNumber(c.max),
  bearer: c.bearer,
  split: c.splitRenterPercent,
});

export function validate(d: CommissionDraft): CommissionErrors {
  const e: CommissionErrors = {};
  const percent = toNumber(d.percent);
  const flat = toNumber(d.flat);
  const min = toNumber(d.min);
  const max = toNumber(d.max);
  if (d.mode === "persen" && percent == null) e.percent = "Isi persentase komisi.";
  else if (d.mode === "persen" && percent != null && percent > 100) e.percent = "Maksimal 100%.";
  if (d.mode === "flat" && flat == null) e.flat = "Isi nominal komisi per transaksi.";
  if (min != null && max != null && max < min) e.max = "Maksimum tidak boleh lebih kecil dari minimum.";
  return e;
}

/** Draft → config used for the live preview and for saving (invalid fields fall back to the saved value). */
export function fromDraft(d: CommissionDraft, saved: CommissionConfig): CommissionConfig {
  return {
    ...saved,
    active: d.active,
    mode: d.mode,
    percent: toNumber(d.percent) ?? saved.percent,
    flat: toNumber(d.flat) ?? saved.flat,
    min: toNumber(d.min),
    max: toNumber(d.max),
    bearer: d.bearer,
    splitRenterPercent: d.split,
  };
}

const KEYS = ["active", "mode", "percent", "flat", "min", "max", "bearer", "splitRenterPercent"] as const;

export const isSame = (a: CommissionConfig, b: CommissionConfig) => KEYS.every((k) => a[k] === b[k]);

export const patchOf = (c: CommissionConfig) => Object.fromEntries(KEYS.map((k) => [k, c[k]])) as Pick<CommissionConfig, (typeof KEYS)[number]>;
