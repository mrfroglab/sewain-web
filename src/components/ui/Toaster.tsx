"use client";

import { Check, Info, X } from "lucide-react";
import { useToasts } from "@/lib/toast";
import { cn } from "./cn";

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom)+12px)] z-[1100] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={cn("animate-fade-up pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-[12px] bg-ink px-4 py-3 text-body-sm text-white shadow-floating")}
        >
          <span className="mt-0.5 shrink-0">{t.kind === "success" ? <Check className="size-4" /> : t.kind === "error" ? <X className="size-4" /> : <Info className="size-4" />}</span>
          <span className="flex-1">{t.message}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Tutup notifikasi" className="text-white/60 hover:text-white">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
