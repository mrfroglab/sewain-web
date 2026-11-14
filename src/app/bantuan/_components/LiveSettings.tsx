"use client";

// Admin-configurable values shown on the help page. They read the store, so the page always explains
// the rules that are actually in force (an admin change in /admin/komisi shows up here immediately).

import { relativeTime, rupiah } from "@/lib/format";
import { computeCommission, describeCommission } from "@/lib/pricing";
import { useAppStore, useNow } from "@/lib/store";
import { Rows } from "./ui";

const EXAMPLE_RENT = 75_000;

/** Current commission config (FR-K1–K7) with a worked example. */
export function CommissionNow() {
  const cfg = useAppStore((s) => s.commission);
  const now = useNow();
  const example = computeCommission(EXAMPLE_RENT, cfg);
  const rule = describeCommission(example);

  return (
    <div className="rounded-card bg-soft-gray p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-6 items-center rounded-control bg-ink px-2.5 text-micro font-semibold text-white">
          {cfg.active ? "Komisi aktif" : "Komisi nonaktif · 0%"}
        </span>
        <span className="text-caption text-smoke">Diubah admin {relativeTime(cfg.updatedAt, now)}</span>
      </div>
      <dl className="mt-3 space-y-2 text-body-sm">
        <div>
          <dt className="text-smoke">{cfg.active ? "Aturan yang berlaku" : "Aturan kalau nanti diaktifkan"}</dt>
          <dd className="font-medium text-ink first-letter:uppercase">{rule}</dd>
        </div>
        <div>
          <dt className="text-smoke">Contoh, sewa {rupiah(EXAMPLE_RENT)}</dt>
          <dd className="font-medium text-ink">
            {cfg.active ? (
              <>
                Komisi {rupiah(example.charged)}
                {example.charged > 0 && cfg.bearer === "split" && ` (penyewa ${rupiah(example.renterPays)}, penyedia ${rupiah(example.providerPays)})`}
              </>
            ) : (
              <>
                Ditagih {rupiah(0)}. Tercatat “seandainya aktif”: {rupiah(example.amount)}
              </>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Automatic collateral suggestion thresholds (FR-J3), as currently set by the admin. */
export function CollateralRulesNow() {
  const r = useAppStore((s) => s.collateralRules);
  return (
    <Rows
      termWidth="sm:grid-cols-[220px_minmax(0,1fr)]"
      rows={[
        { term: `Nilai barang < ${rupiah(r.lowMax)}`, detail: "Titip kartu identitas (KTM/SIM) sudah cukup." },
        { term: `${rupiah(r.lowMax)} – ${rupiah(r.midMax)}`, detail: `Titip kartu identitas + deposit ± ${r.midDepositPercent}% dari nilai barang.` },
        { term: `Di atas ${rupiah(r.midMax)}`, detail: `Deposit ± ${r.highDepositPercent}% dari nilai barang, atau jaminan lain yang senilai.` },
        { term: "Kendaraan bermotor", detail: `Titip kartu identitas + deposit ± ${r.vehicleDepositPercent}%, atau BPKB / jaminan custom.` },
      ]}
    />
  );
}

/** "Rp2.000.000" — the "Barang bernilai tinggi" badge threshold. Inline, for use inside sentences. */
export function HighValueThreshold() {
  const v = useAppStore((s) => s.collateralRules.highValueBadge);
  return <>{rupiah(v)}</>;
}
