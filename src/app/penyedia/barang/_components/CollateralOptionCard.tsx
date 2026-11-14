"use client";

import { Banknote, FileText, IdCard, Package, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Toggle } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Layout";
import { Pill } from "@/components/ui/Pill";
import { ID_CARDS } from "@/lib/data/categories";
import { rupiah } from "@/lib/format";
import { collateralValue, describeCollateral } from "@/lib/pricing";
import type { CollateralKind, CollateralOption } from "@/lib/types";
import { cleanOption } from "./draft";
import { BigText, MoneyInput, NumberStepper } from "./fields";

export const KIND_META: Record<CollateralKind, { label: string; Icon: LucideIcon; hint: string }> = {
  identitas: { label: "Titip kartu identitas", Icon: IdCard, hint: "KTM, SIM, kartu pelajar" },
  deposit: { label: "Uang deposit", Icon: Banknote, hint: "Nominal tetap atau % nilai" },
  barang: { label: "Titip barang lain", Icon: Package, hint: "Mis. HP lain, laptop" },
  custom: { label: "Jaminan khusus", Icon: FileText, hint: "Mis. BPKB, surat tanah" },
};

function CardPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Kartu yang boleh dititipkan">
        {ID_CARDS.map((c) => {
          const on = value.includes(c);
          return (
            <Pill key={c} active={on} onClick={() => onChange(on ? value.filter((x) => x !== c) : [...value, c])} className="h-9 px-4">
              {c}
            </Pill>
          );
        })}
      </div>
      <p className={cn("mt-2 text-caption", value.includes("e-KTP") ? "font-medium text-ink" : "text-smoke")}>
        {value.includes("e-KTP")
          ? "e-KTP sebaiknya tidak ditahan orang lain. Lebih aman minta KTM atau SIM saja."
          : "Disarankan KTM atau SIM. e-KTP sebaiknya tidak ditahan orang lain."}
      </p>
    </div>
  );
}

/** Editor for one collateral option (FR-J1). The renter later picks exactly one of these (FR-J2). */
export function CollateralOptionCard({
  option,
  index,
  itemValue,
  error,
  onChange,
  onRemove,
}: {
  option: CollateralOption;
  index: number;
  itemValue: number;
  error?: string;
  onChange: (patch: Partial<CollateralOption>) => void;
  onRemove: () => void;
}) {
  const meta = KIND_META[option.kind];
  const o = option;
  return (
    <article data-field={`col:${o.id}`} data-error={error ? "true" : undefined} className={cn("rounded-card border bg-white p-4", error ? "border-sale-text" : "border-border-gray")}>
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-soft-gray text-ink">
          <meta.Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-micro font-medium uppercase tracking-wide text-smoke">Opsi {index + 1}</p>
          <p className="text-body font-semibold text-ink">{meta.label}</p>
        </div>
        <button type="button" onClick={onRemove} aria-label={`Hapus opsi ${index + 1}`} className="grid size-9 shrink-0 place-items-center rounded-full border border-border-gray text-graphite hover:border-ink hover:text-ink">
          <Trash2 className="size-4" />
        </button>
      </header>

      <div className="mt-4 space-y-4">
        {o.kind === "identitas" && <CardPicker value={o.cards ?? []} onChange={(cards) => onChange({ cards })} />}

        {o.kind === "deposit" && (
          <>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Bentuk deposit">
              {(["persen", "tetap"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={(o.depositMode ?? "persen") === m}
                  onClick={() => onChange({ depositMode: m })}
                  className={cn(
                    "h-11 rounded-control border text-body-sm font-semibold transition-colors",
                    (o.depositMode ?? "persen") === m ? "border-ink bg-ink text-white" : "border-border-gray bg-white text-ink hover:border-ink",
                  )}
                >
                  {m === "persen" ? "% nilai barang" : "Nominal tetap"}
                </button>
              ))}
            </div>
            {o.depositMode === "tetap" ? (
              <MoneyInput label="Nominal deposit" value={o.depositAmount} onChange={(v) => onChange({ depositAmount: v ?? undefined })} placeholder="200.000" />
            ) : (
              <NumberStepper
                label="Persen dari nilai barang"
                value={o.depositPercent ?? null}
                onChange={(v) => onChange({ depositPercent: v ?? undefined })}
                min={1}
                max={100}
                step={5}
                suffix="%"
                help={itemValue ? `≈ ${rupiah(collateralValue({ ...o, depositMode: "persen" }, itemValue))} dari nilai ${rupiah(itemValue)}` : undefined}
              />
            )}
            <Toggle checked={!!o.withIdentity} onChange={(v) => onChange({ withIdentity: v, cards: o.cards?.length ? o.cards : ["KTM", "SIM"] })} label="Plus titip kartu identitas" description="Penyewa menitipkan kartu dan uang deposit sekaligus." />
            {o.withIdentity && <CardPicker value={o.cards ?? []} onChange={(cards) => onChange({ cards })} />}
            <p className="text-caption text-smoke">Saat pilot, deposit dibayar langsung ke kamu dan dikembalikan saat barang kembali. Sewain tidak memegang uangnya.</p>
          </>
        )}

        {o.kind === "barang" && (
          <>
            <BigText label="Barang yang dititipkan" value={o.description ?? ""} onChange={(v) => onChange({ description: v })} placeholder="Mis. HP lain, laptop, jam tangan" maxLength={80} />
            <MoneyInput label="Perkiraan nilainya" value={o.estimatedValue} onChange={(v) => onChange({ estimatedValue: v ?? undefined })} placeholder="1.000.000" />
          </>
        )}

        {o.kind === "custom" && (
          <>
            <BigText label="Bentuk jaminan" value={o.description ?? ""} onChange={(v) => onChange({ description: v })} placeholder="Mis. BPKB motor asli, surat tanah, sertifikat" maxLength={100} />
            <MoneyInput label="Perkiraan nilai" optional value={o.estimatedValue} onChange={(v) => onChange({ estimatedValue: v ?? undefined })} placeholder="Kosongkan kalau tidak tahu" />
            <Notice>
              Dokumen asli jadi tanggung jawabmu selama dititipkan. Saat difoto, minta nomor penting (mis. NIK) ditutup sebagian.
            </Notice>
          </>
        )}
      </div>

      {error ? (
        <p className="mt-3 text-caption text-sale-text">{error}</p>
      ) : (
        <p className="mt-4 border-t border-border-gray pt-3 text-caption text-smoke">
          Tampil ke penyewa: <span className="font-medium text-ink">{describeCollateral(cleanOption(o), itemValue)}</span>
        </p>
      )}
    </article>
  );
}
