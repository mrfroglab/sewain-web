"use client";

import type { ReactNode } from "react";
import { rupiah } from "@/lib/format";
import type { CollateralRules } from "@/lib/types";
import { MoneyField, PercentField } from "../../komisi/_components/NumberField";
import type { RuleKey, RulesDraft, RulesErrors } from "./draft";

/** Thresholds grouped per tier, each with the rule it produces written out in plain words (FR-J3). */
export function RulesForm({ draft, errors, rules, onChange }: { draft: RulesDraft; errors: RulesErrors; rules: CollateralRules; onChange: (patch: Partial<RulesDraft>) => void }) {
  const money = (k: RuleKey, label: string, help: string) => <MoneyField label={label} value={draft[k]} onChange={(v) => onChange({ [k]: v })} error={errors[k]} help={help} />;
  const percent = (k: RuleKey, label: string, help: string) => <PercentField label={label} value={draft[k]} onChange={(v) => onChange({ [k]: v })} error={errors[k]} help={help} />;

  return (
    <ol className="divide-y divide-border-gray border-y border-border-gray">
      <Tier n={1} title="Nilai rendah" rule={`Di bawah ${rupiah(rules.lowMax)}: titip kartu identitas (KTM/SIM) sudah cukup.`}>
        {money("lowMax", "Batas nilai rendah", "Barang di bawah nilai ini cukup titip identitas.")}
      </Tier>
      <Tier n={2} title="Nilai sedang" rule={`${rupiah(rules.lowMax)} sampai ${rupiah(rules.midMax)}: titip identitas + deposit ${rules.midDepositPercent}% nilai barang.`}>
        {money("midMax", "Batas nilai sedang", "Di atas nilai ini masuk kelompok bernilai tinggi.")}
        {percent("midDepositPercent", "Deposit nilai sedang", "Usulan awal PRD: 20–30%.")}
      </Tier>
      <Tier n={3} title="Nilai tinggi" rule={`Di atas ${rupiah(rules.midMax)}: deposit ${rules.highDepositPercent}% nilai barang, atau jaminan khusus yang senilai.`}>
        {percent("highDepositPercent", "Deposit nilai tinggi", "Usulan awal PRD: 30–50%.")}
      </Tier>
      <Tier n={4} title="Kendaraan" rule={`Semua kendaraan, berapa pun nilainya: titip identitas + deposit ${rules.vehicleDepositPercent}%, atau BPKB/jaminan khusus.`}>
        {percent("vehicleDepositPercent", "Deposit kendaraan", "Kategori berisiko tinggi (PRD 12.3).")}
      </Tier>
      <Tier n={5} title="Badge “Barang bernilai tinggi”" rule={`Listing di atas ${rupiah(rules.highValueBadge)} diberi badge, dan request-nya wajib disetujui manual oleh penyedia.`}>
        {money("highValueBadge", "Ambang badge", "PRD 11.4: supaya kedua pihak sadar risikonya.")}
      </Tier>
    </ol>
  );
}

function Tier({ n, title, rule, children }: { n: number; title: string; rule: string; children: ReactNode }) {
  return (
    <li className="py-5">
      <div className="flex gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-caption font-semibold text-white">{n}</span>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-body-sm text-graphite">{rule}</p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
        </div>
      </div>
    </li>
  );
}
