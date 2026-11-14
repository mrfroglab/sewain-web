"use client";

import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { SectionTitle } from "../_shared/ui";

/** Checklist fungsi per kategori (PRD 10.3, P1). Informative: photos can't show internal damage. */
export function FunctionChecklist({ items, checked, onChange }: { items: string[]; checked: string[]; onChange: (v: string[]) => void }) {
  const toggle = (item: string) => onChange(checked.includes(item) ? checked.filter((c) => c !== item) : [...checked, item]);
  return (
    <div>
      <SectionTitle
        title="Checklist fungsi"
        description="Cek bareng penyewa. Tidak wajib, tapi kerusakan di dalam (mesin, elektronik) sering tidak kelihatan di foto."
        aside={
          <span className="text-caption font-medium text-smoke">
            {checked.length}/{items.length}
          </span>
        }
      />
      <ul className="divide-y divide-border-gray rounded-card border border-border-gray">
        {items.map((item) => {
          const on = checked.includes(item);
          return (
            <li key={item}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(item)} className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left">
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-[6px] border", on ? "border-ink bg-ink text-white" : "border-ash bg-white")}>
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className={cn("text-body-sm", on ? "font-medium text-ink" : "text-graphite")}>{item}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-caption text-smoke">Hasil checklist dikirim ke chat sewa sebagai catatan.</p>
    </div>
  );
}
