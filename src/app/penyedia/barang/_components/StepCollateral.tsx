"use client";

import { Check, Gem, Plus, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Layout";
import { rupiah } from "@/lib/format";
import { collateralWarnings, describeCollateral, isHighValue, suggestCollateral } from "@/lib/pricing";
import type { CollateralKind, CollateralOption, CollateralRules } from "@/lib/types";
import { CollateralOptionCard, KIND_META } from "./CollateralOptionCard";
import { cleanOption } from "./draft";
import { Block } from "./fields";
import type { ListingForm } from "./useListingForm";

const signature = (opts: Omit<CollateralOption, "id">[]) => JSON.stringify(opts.map((o) => ({ ...cleanOption({ ...o, id: "" } as CollateralOption), id: "" })));

/** Step 4 — jaminan (FR-J1..J4): automatic suggestion, multi-option editor, non-blocking warnings. */
export function StepCollateral({ form, rules }: { form: ListingForm; rules: CollateralRules }) {
  const { draft, dispatch, visibleErrors: e } = form;
  const itemValue = draft.itemValue ?? 0;
  const category = draft.category;

  const suggestion = useMemo(() => (category && itemValue ? suggestCollateral(itemValue, category, rules) : null), [category, itemValue, rules]);
  const warnings = useMemo(
    () => (category && itemValue && draft.collateral.length ? collateralWarnings(draft.collateral.map(cleanOption), itemValue, category, rules) : []),
    [draft.collateral, category, itemValue, rules],
  );
  const applied = !!suggestion && signature(suggestion.preset) === signature(draft.collateral);
  const highValue = isHighValue(itemValue, rules);

  return (
    <div className="space-y-8">
      {suggestion && (
        <section className="rounded-card bg-ink p-4 text-white sm:p-5" aria-labelledby="saran-jaminan">
          <p className="flex items-center gap-1.5 text-caption font-medium text-white/70">
            <Sparkles className="size-3.5" /> Saran Sewain untuk barang senilai {rupiah(itemValue)}
          </p>
          <h3 id="saran-jaminan" className="mt-1.5 text-[18px] font-semibold leading-snug tracking-[-0.2px]">
            {suggestion.title}
          </h3>
          <p className="mt-1 text-body-sm text-white/75">{suggestion.detail}</p>
          <ul className="mt-3 space-y-1.5">
            {suggestion.preset.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm">
                <Check className="mt-0.5 size-4 shrink-0" />
                {describeCollateral({ ...p, id: "" }, itemValue)}
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            className="mt-4"
            disabled={applied}
            onClick={() => dispatch({ type: "applyPreset", preset: suggestion.preset })}
          >
            {applied ? (
              <>
                <Check className="size-4" /> Saran sudah dipakai
              </>
            ) : (
              "Pakai saran ini"
            )}
          </Button>
          <p className="mt-3 text-caption text-white/60">
            Saran dihitung dari nilai barang dan kategori. Keputusan akhir tetap di kamu.{" "}
            <Link href="/bantuan#jaminan" className="underline underline-offset-2">
              Cara kerja jaminan
            </Link>
          </p>
        </section>
      )}

      {highValue && (
        <Notice icon={<Gem className="size-4" />} title="Barang bernilai tinggi" tone="outline">
          Nilainya di atas {rupiah(rules.highValueBadge)}, jadi listing diberi label “Bernilai tinggi” dan persetujuan otomatis tidak berlaku. Kamu selalu cek penyewa dulu.
        </Notice>
      )}

      <Block title="Jaminan yang kamu minta" description="Boleh lebih dari satu opsi. Penyewa memilih salah satu saat mengajukan sewa.">
        <div data-field="collateral" data-error={e.collateral ? "true" : undefined} className="space-y-3">
          {draft.collateral.map((o, i) => (
            <CollateralOptionCard
              key={o.id}
              option={o}
              index={i}
              itemValue={itemValue}
              error={e[`col:${o.id}`]}
              onChange={(patch) => dispatch({ type: "updateOption", id: o.id, patch })}
              onRemove={() => dispatch({ type: "removeOption", id: o.id })}
            />
          ))}
          {draft.collateral.length === 0 && (
            <p className="rounded-card border border-dashed border-ash p-4 text-center text-body-sm text-smoke">Belum ada jaminan. Tambah minimal satu di bawah, atau pakai saran Sewain.</p>
          )}
          {e.collateral && <p className="text-caption text-sale-text">{e.collateral}</p>}
        </div>

        <div>
          <p className="mb-2 text-body-sm font-semibold text-ink">Tambah opsi jaminan</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(KIND_META) as CollateralKind[]).map((k) => {
              const m = KIND_META[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => dispatch({ type: "addOption", kind: k, rules })}
                  disabled={draft.collateral.length >= 4}
                  className="flex min-h-[60px] items-start gap-2.5 rounded-[12px] border border-border-gray bg-white p-3 text-left transition-colors hover:border-ink disabled:opacity-40"
                >
                  <Plus className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-ink">{m.label}</span>
                    <span className="block text-caption text-smoke">{m.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {draft.collateral.length >= 4 && <p className="mt-2 text-caption text-smoke">Maksimal 4 opsi supaya penyewa tidak bingung.</p>}
        </div>

        {warnings.length > 0 && (
          <div className="space-y-2" aria-live="polite">
            {warnings.map((w) => (
              <Notice key={w} icon={<TriangleAlert className="size-4" />} title="Di bawah saran" tone="outline">
                {w} Kamu tetap boleh lanjut.
              </Notice>
            ))}
          </div>
        )}
      </Block>
    </div>
  );
}
