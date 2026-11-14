"use client";

import { Fuel, Gauge } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { Select, TextField } from "@/components/ui/Field";
import { FUEL_LEVELS } from "./evidence";
import { RefTile } from "./Comparison";

/** Small section heading used inside the evidence pages. */
export function SectionTitle({ title, description, aside, className }: { title: ReactNode; description?: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-body-lg font-semibold tracking-[-0.2px] text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-body-sm text-smoke">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Numbered "what happens next" list. */
export function Steps({ items, className }: { items: { title: ReactNode; detail?: ReactNode }[]; className?: string }) {
  return (
    <ol className={cn("space-y-4", className)}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-micro font-semibold text-white">{i + 1}</span>
          <div className="min-w-0 pt-0.5">
            <p className="text-body-sm font-semibold text-ink">{it.title}</p>
            {it.detail && <div className="mt-0.5 text-body-sm text-smoke">{it.detail}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Big centered state block (success / waiting) with a black icon disc. */
export function StateHero({ icon, title, children, actions, tone = "soft" }: { icon: ReactNode; title: ReactNode; children?: ReactNode; actions?: ReactNode; tone?: "soft" | "plain" }) {
  return (
    <div className={cn("flex flex-col items-center rounded-card px-5 py-8 text-center sm:px-8 sm:py-10", tone === "soft" ? "bg-soft-gray" : "border border-border-gray")}>
      <span className="grid size-14 place-items-center rounded-full bg-ink text-white">{icon}</span>
      <h2 className="mt-4 text-[20px] font-semibold leading-tight tracking-[-0.4px] text-ink">{title}</h2>
      {children && <div className="mt-2 max-w-md text-body-sm text-graphite">{children}</div>}
      {actions && <div className="mt-5 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">{actions}</div>}
    </div>
  );
}

/** Listing reference photos + existing-condition notes (FR-L3), for comparing during handover. */
export function ReferencePanel({ photos, conditionNotes, title = "Foto referensi listing", description = "Kondisi barang saat diiklankan. Cocokkan dengan barang yang diserahkan." }: { photos: string[]; conditionNotes?: string; title?: string; description?: string }) {
  return (
    <section>
      <SectionTitle title={title} description={description} />
      <div className="grid grid-cols-3 gap-2">
        {photos.slice(0, 6).map((src, i) => (
          <RefTile key={`${src}-${i}`} src={src} caption="" />
        ))}
      </div>
      <div className="mt-3 rounded-[12px] bg-soft-gray p-3.5">
        <p className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">Kondisi yang sudah ada</p>
        <p className="mt-1 text-body-sm text-graphite">{conditionNotes?.trim() || "Penyedia tidak mencatat cacat apa pun."}</p>
      </div>
    </section>
  );
}

/** Odometer + fuel inputs for vehicles (PRD 10.1). */
export function VehicleFields({
  odometer,
  fuel,
  onOdometer,
  onFuel,
  before,
}: {
  odometer: string;
  fuel: string;
  onOdometer: (v: string) => void;
  onFuel: (v: string) => void;
  before?: { odometer?: string; fuel?: string };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        label="Odometer"
        inputMode="numeric"
        placeholder="mis. 12345"
        suffix="km"
        value={odometer}
        onChange={(e) => onOdometer(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
        help={before?.odometer ? `Saat serah terima: ${before.odometer} km` : "Angka di panel speedometer."}
      />
      <Select label="Indikator BBM" value={fuel} onChange={(e) => onFuel(e.target.value)} help={before?.fuel ? `Saat serah terima: ${before.fuel}` : "Posisi jarum bensin."}>
        <option value="">Pilih posisi</option>
        {FUEL_LEVELS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** Read-only odometer/BBM, optionally before → after. */
export function VehicleReadout({ out, back }: { out?: { odometer?: string; fuel?: string }; back?: { odometer?: string; fuel?: string } }) {
  if (!out?.odometer && !out?.fuel && !back?.odometer && !back?.fuel) return null;
  const km = (v?: string) => (v ? `${Number(v).toLocaleString("id-ID")} km` : "–");
  const driven = out?.odometer && back?.odometer ? Number(back.odometer) - Number(out.odometer) : null;
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-[12px] bg-soft-gray p-3.5">
        <p className="flex items-center gap-1.5 text-caption text-smoke">
          <Gauge className="size-3.5" /> Odometer
        </p>
        <p className="mt-1 text-body-sm font-semibold text-ink">
          {km(out?.odometer)}
          {back && ` → ${km(back.odometer)}`}
        </p>
        {driven != null && driven >= 0 && <p className="mt-0.5 text-caption text-smoke">Dipakai ± {driven.toLocaleString("id-ID")} km</p>}
      </div>
      <div className="rounded-[12px] bg-soft-gray p-3.5">
        <p className="flex items-center gap-1.5 text-caption text-smoke">
          <Fuel className="size-3.5" /> BBM
        </p>
        <p className="mt-1 text-body-sm font-semibold text-ink">
          {out?.fuel ?? "–"}
          {back && ` → ${back.fuel ?? "–"}`}
        </p>
      </div>
    </div>
  );
}

/** Bullet list of what is still missing before a submit button unlocks. */
export function MissingList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mb-3 space-y-1 text-caption text-smoke">
      {items.map((m) => (
        <li key={m} className="flex items-center gap-2">
          <span className="size-1 rounded-full bg-ash" aria-hidden />
          {m}
        </li>
      ))}
    </ul>
  );
}
