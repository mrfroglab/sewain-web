// Form state for "Saran jaminan" thresholds (FR-J3). Numbers are strings while editing.

import type { CollateralRules } from "@/lib/types";
import { fromNumber, toNumber } from "../../komisi/_components/NumberField";

export const RULE_KEYS = ["lowMax", "midMax", "midDepositPercent", "highDepositPercent", "vehicleDepositPercent", "highValueBadge"] as const;
export type RuleKey = (typeof RULE_KEYS)[number];
export type RulesDraft = Record<RuleKey, string>;
export type RulesErrors = Partial<Record<RuleKey, string>>;

export const toDraft = (r: CollateralRules): RulesDraft => Object.fromEntries(RULE_KEYS.map((k) => [k, fromNumber(r[k])])) as RulesDraft;

const PERCENT_KEYS: RuleKey[] = ["midDepositPercent", "highDepositPercent", "vehicleDepositPercent"];

export function validate(d: RulesDraft): RulesErrors {
  const e: RulesErrors = {};
  for (const k of RULE_KEYS) {
    const v = toNumber(d[k]);
    if (v == null) e[k] = "Wajib diisi.";
    else if (PERCENT_KEYS.includes(k) && v > 100) e[k] = "Maksimal 100%.";
    else if (!PERCENT_KEYS.includes(k) && v <= 0) e[k] = "Harus lebih dari Rp0.";
  }
  const low = toNumber(d.lowMax);
  const mid = toNumber(d.midMax);
  if (!e.midMax && low != null && mid != null && mid <= low) e.midMax = "Harus lebih besar dari batas nilai rendah.";
  return e;
}

/** Draft → rules for the live preview and saving (invalid fields fall back to the saved value). */
export const fromDraft = (d: RulesDraft, saved: CollateralRules): CollateralRules =>
  ({ ...saved, ...Object.fromEntries(RULE_KEYS.map((k) => [k, toNumber(d[k]) ?? saved[k]])) }) as CollateralRules;

export const isSame = (a: CollateralRules, b: CollateralRules) => RULE_KEYS.every((k) => a[k] === b[k]);

export const patchOf = (r: CollateralRules) => Object.fromEntries(RULE_KEYS.map((k) => [k, r[k]])) as Pick<CollateralRules, RuleKey>;
