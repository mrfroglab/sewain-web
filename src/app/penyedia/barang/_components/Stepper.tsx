"use client";

import { Check } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { PREVIEW, STEPS } from "./draft";

/** Progress bar + 5 numbered steps. Steps already reached can be tapped to jump back. */
export function Stepper({ step, maxStep, onGo }: { step: number; maxStep: number; onGo: (s: number) => void }) {
  const total = STEPS.length + 1; // + pratinjau
  const pct = Math.round(((step + 1) / total) * 100);
  const current = step === PREVIEW ? "Pratinjau" : STEPS[step].label;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-body-sm font-semibold text-ink">
          {step === PREVIEW ? "Langkah terakhir" : `Langkah ${step + 1} dari ${STEPS.length}`}
          <span className="font-normal text-smoke"> · {current}</span>
        </p>
        <span className="text-caption font-medium text-smoke">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-image-gray" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progres membuat listing">
        <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-4 grid grid-cols-5 gap-1">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const reachable = i <= maxStep && !active;
          return (
            <li key={s.key} className="min-w-0">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onGo(i)}
                aria-current={active ? "step" : undefined}
                className="flex w-full flex-col items-center gap-1.5 rounded-[10px] py-1 text-center disabled:cursor-default"
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-full border text-body-sm font-semibold transition-colors",
                    done ? "border-ink bg-ink text-white" : active ? "border-ink bg-white text-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-border-gray bg-white text-ash",
                  )}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span className={cn("line-clamp-2 text-micro leading-tight sm:text-caption", active ? "font-semibold text-ink" : done ? "text-graphite" : "text-ash")}>{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
