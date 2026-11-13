import { CATEGORY_BY_ID } from "./data/categories";
import { diffDays, rupiah } from "./format";
import type {
  CategoryId,
  CollateralOption,
  CollateralRules,
  CommissionConfig,
  CommissionSnapshot,
  Listing,
  RentQuote,
} from "./types";

const round1000 = (n: number) => Math.round(n / 1000) * 1000;

/* ------------------------------------------------------------------ rent */

export function quoteRent(listing: Pick<Listing, "pricePerDay" | "pricePerWeek" | "durationDiscount">, startIso: string, endIso: string): RentQuote {
  const days = diffDays(startIso, endIso);
  const base = days * listing.pricePerDay;
  let total = base;
  let breakdown = `${days} hari × ${rupiah(listing.pricePerDay)}`;
  if (listing.pricePerWeek && days >= 7) {
    const weeks = Math.floor(days / 7);
    const rest = days % 7;
    total = weeks * listing.pricePerWeek + rest * listing.pricePerDay;
    breakdown = `${weeks} minggu × ${rupiah(listing.pricePerWeek)}${rest ? ` + ${rest} hari × ${rupiah(listing.pricePerDay)}` : ""}`;
  }
  if (listing.durationDiscount && days >= listing.durationDiscount.minDays) {
    total = Math.round(total * (1 - listing.durationDiscount.percent / 100));
    breakdown += ` − diskon ${listing.durationDiscount.percent}%`;
  }
  return { days, base, discount: base - total, total, breakdown };
}

/* ------------------------------------------------------------ commission */

/**
 * Commission is computed from the rent value only, never the deposit (FR-K4).
 * "amount" is always computed so the pilot can record "komisi seandainya aktif" (FR-K6);
 * "charged" is 0 while the global switch is off.
 */
export function computeCommission(rentTotal: number, cfg: CommissionConfig): CommissionSnapshot {
  let amount = cfg.mode === "persen" ? Math.round((rentTotal * cfg.percent) / 100) : cfg.flat;
  if (cfg.min != null) amount = Math.max(amount, cfg.min);
  if (cfg.max != null) amount = Math.min(amount, cfg.max);
  amount = Math.max(0, Math.round(amount));
  const charged = cfg.active ? amount : 0;
  const renterShare = cfg.bearer === "penyewa" ? 1 : cfg.bearer === "penyedia" ? 0 : cfg.splitRenterPercent / 100;
  const renterPays = Math.round(charged * renterShare);
  return {
    active: cfg.active,
    mode: cfg.mode,
    rate: cfg.mode === "persen" ? cfg.percent : cfg.flat,
    min: cfg.min,
    max: cfg.max,
    bearer: cfg.bearer,
    splitRenterPercent: cfg.splitRenterPercent,
    amount,
    charged,
    renterPays,
    providerPays: charged - renterPays,
  };
}

export function describeCommission(c: Pick<CommissionSnapshot, "mode" | "rate" | "min" | "max" | "bearer" | "splitRenterPercent">): string {
  const base = c.mode === "persen" ? `${c.rate}% dari nilai sewa` : `${rupiah(c.rate)} per transaksi`;
  const limits = [c.min != null ? `min ${rupiah(c.min)}` : "", c.max != null ? `maks ${rupiah(c.max)}` : ""].filter(Boolean).join(", ");
  const bearer =
    c.bearer === "penyewa" ? "ditanggung penyewa" : c.bearer === "penyedia" ? "ditanggung penyedia" : `dibagi ${c.splitRenterPercent}:${100 - c.splitRenterPercent} (penyewa:penyedia)`;
  return `${base}${limits ? ` (${limits})` : ""}, ${bearer}`;
}

/* ------------------------------------------------------------ collateral */

/** Monetary coverage of one collateral option, in rupiah. Identity cards count as 0. */
export function collateralValue(opt: CollateralOption, itemValue: number): number {
  switch (opt.kind) {
    case "deposit":
      return opt.depositMode === "persen" ? round1000((itemValue * (opt.depositPercent ?? 0)) / 100) : opt.depositAmount ?? 0;
    case "barang":
    case "custom":
      return opt.estimatedValue ?? 0;
    default:
      return 0;
  }
}

/** Cash deposit the renter hands over (used in the payment simulation). */
export const depositCash = (opt: CollateralOption, itemValue: number) => (opt.kind === "deposit" ? collateralValue(opt, itemValue) : 0);

export function describeCollateral(opt: CollateralOption, itemValue?: number): string {
  const cards = opt.cards?.length ? opt.cards.join("/") : "kartu identitas";
  switch (opt.kind) {
    case "identitas":
      return `Titip ${cards}`;
    case "deposit": {
      const amount =
        opt.depositMode === "persen"
          ? `${opt.depositPercent}% nilai barang${itemValue ? ` (${rupiah(collateralValue(opt, itemValue))})` : ""}`
          : rupiah(opt.depositAmount ?? 0);
      return `${opt.withIdentity ? `Titip ${cards} + deposit` : "Deposit"} ${amount}`;
    }
    case "barang":
      return `Titip barang: ${opt.description ?? "barang lain"}${opt.estimatedValue ? ` (± ${rupiah(opt.estimatedValue)})` : ""}`;
    case "custom":
      return `Jaminan khusus: ${opt.description ?? "-"}`;
  }
}

/** Short chip text for cards: "Cukup titip KTM", "Deposit 25%" */
export function collateralChip(opts: CollateralOption[]): string {
  const id = opts.find((o) => o.kind === "identitas");
  if (id) return `Cukup titip ${id.cards?.[0] ?? "KTM"}`;
  const dep = opts.find((o) => o.kind === "deposit");
  if (dep) return dep.depositMode === "persen" ? `Deposit ${dep.depositPercent}%` : `Deposit ${rupiah(dep.depositAmount ?? 0)}`;
  return opts[0]?.kind === "barang" ? "Titip barang" : "Jaminan khusus";
}

export type CollateralLevel = "rendah" | "sedang" | "tinggi" | "kendaraan";

export interface CollateralSuggestion {
  level: CollateralLevel;
  title: string; // "Titip kartu identitas cukup"
  detail: string;
  /** minimum monetary coverage per option to avoid a warning */
  minCoverage: number;
  /** ready-made options the provider can apply with one tap */
  preset: Omit<CollateralOption, "id">[];
}

/** Automatic collateral suggestion (FR-J3). Thresholds come from admin settings. */
export function suggestCollateral(itemValue: number, category: CategoryId, rules: CollateralRules): CollateralSuggestion {
  const isVehicle = CATEGORY_BY_ID[category]?.risk === "kendaraan";
  const pct = (p: number) => round1000((itemValue * p) / 100);
  if (isVehicle) {
    return {
      level: "kendaraan",
      title: `Identitas + deposit ${rules.vehicleDepositPercent}% atau BPKB`,
      detail: `Kendaraan berisiko tinggi. Sarankan titip kartu identitas plus deposit ± ${rupiah(pct(rules.vehicleDepositPercent))}, atau jaminan khusus seperti BPKB.`,
      minCoverage: pct(rules.vehicleDepositPercent),
      preset: [
        { kind: "deposit", depositMode: "persen", depositPercent: rules.vehicleDepositPercent, withIdentity: true, cards: ["KTM", "SIM"] },
        { kind: "custom", description: "BPKB kendaraan penyewa (asli)", estimatedValue: itemValue },
      ],
    };
  }
  if (itemValue < rules.lowMax) {
    return {
      level: "rendah",
      title: "Titip kartu identitas sudah cukup",
      detail: `Nilai barang di bawah ${rupiah(rules.lowMax)}. Titip KTM/SIM sudah sepadan.`,
      minCoverage: 0,
      preset: [{ kind: "identitas", cards: ["KTM", "SIM", "Kartu pelajar"] }],
    };
  }
  if (itemValue <= rules.midMax) {
    return {
      level: "sedang",
      title: `Identitas + deposit ${rules.midDepositPercent}%`,
      detail: `Nilai barang ${rupiah(rules.lowMax)}–${rupiah(rules.midMax)}. Sarankan titip KTM/SIM plus deposit ± ${rupiah(pct(rules.midDepositPercent))}.`,
      minCoverage: pct(rules.midDepositPercent),
      preset: [{ kind: "deposit", depositMode: "persen", depositPercent: rules.midDepositPercent, withIdentity: true, cards: ["KTM", "SIM"] }],
    };
  }
  return {
    level: "tinggi",
    title: `Deposit ${rules.highDepositPercent}% atau jaminan senilai`,
    detail: `Barang bernilai tinggi (> ${rupiah(rules.midMax)}). Sarankan deposit ± ${rupiah(pct(rules.highDepositPercent))} atau jaminan khusus yang senilai.`,
    minCoverage: pct(rules.highDepositPercent),
    preset: [
      { kind: "deposit", depositMode: "persen", depositPercent: rules.highDepositPercent, withIdentity: true, cards: ["KTM", "SIM"] },
      { kind: "custom", description: "Barang/dokumen senilai (mis. laptop, BPKB)", estimatedValue: pct(rules.highDepositPercent) },
    ],
  };
}

/**
 * Warnings when the provider sets collateral below the suggestion (FR-J4). Never blocks.
 * Each option is checked separately because the renter picks exactly one (FR-J2).
 */
export function collateralWarnings(options: CollateralOption[], itemValue: number, category: CategoryId, rules: CollateralRules): string[] {
  if (options.length === 0) return ["Pilih minimal satu bentuk jaminan."];
  const s = suggestCollateral(itemValue, category, rules);
  const warnings: string[] = [];
  for (const opt of options) {
    const isUnpricedCustom = opt.kind === "custom" && opt.estimatedValue == null;
    if (isUnpricedCustom) continue;
    const value = collateralValue(opt, itemValue);
    if (value < s.minCoverage) {
      warnings.push(
        `"${describeCollateral(opt, itemValue)}" di bawah saran (${s.title}). Kalau barang rusak/hilang, jaminan ini mungkin tidak cukup menutup kerugian.`,
      );
    }
  }
  return warnings;
}

export const isHighValue = (itemValue: number, rules: CollateralRules) => itemValue > rules.highValueBadge;
