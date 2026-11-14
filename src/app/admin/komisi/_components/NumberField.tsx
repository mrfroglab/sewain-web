"use client";

import type { ComponentProps, ReactNode } from "react";
import { TextField } from "@/components/ui/Field";
import { number } from "@/lib/format";

// Numeric inputs for admin settings. Values are kept as raw strings in form state ("" = empty)
// so optional fields can be cleared and decimals can be typed; parse with toNumber() when saving.

/** "" → undefined, "12,5" → 12.5 */
export const toNumber = (s: string): number | undefined => {
  const t = s.trim().replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

/** number | undefined → form string */
export const fromNumber = (n?: number): string => (n == null ? "" : String(n));

type BaseProps = Omit<ComponentProps<typeof TextField>, "value" | "onChange" | "prefix" | "suffix" | "type"> & {
  value: string;
  onChange: (value: string) => void;
  label?: ReactNode;
};

/** Rupiah amount: digits only, shown with thousand separators ("15.000"). */
export function MoneyField({ value, onChange, placeholder = "0", ...rest }: BaseProps) {
  return (
    <TextField
      {...rest}
      inputMode="numeric"
      autoComplete="off"
      prefix="Rp"
      placeholder={placeholder}
      value={value ? number(Number(value)) : ""}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12))}
    />
  );
}

/** Percentage 0–100 with up to two decimals ("12,5"). */
export function PercentField({ value, onChange, placeholder = "0", ...rest }: BaseProps) {
  return (
    <TextField
      {...rest}
      inputMode="decimal"
      autoComplete="off"
      suffix="%"
      placeholder={placeholder}
      value={value.replace(".", ",")}
      onChange={(e) => {
        const v = e.target.value.replace(".", ",");
        if (/^\d{0,3}(,\d{0,2})?$/.test(v)) onChange(v.replace(",", "."));
      }}
    />
  );
}
