"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Back / Next bar. On phones it is fixed right above the tab bar (reachable with one thumb) and its
 * content is right-aligned, because the floating "Demo" chip lives at the bottom-left. On desktop it
 * sticks to the bottom of the form column.
 */
export function WizardNav({
  canBack,
  onBack,
  onNext,
  nextLabel,
  final,
  busy,
}: {
  canBack: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  final?: boolean;
  busy?: boolean;
}) {
  return (
    <>
      <div className="h-20 lg:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-[540] border-t border-border-gray bg-white/95 backdrop-blur lg:sticky lg:bottom-0 lg:mt-8 lg:bg-white">
        <div className="flex h-16 items-center justify-end gap-2 pl-[132px] pr-4 sm:pr-6 lg:justify-between lg:px-0">
          {canBack ? (
            <Button variant="secondary" size="lg" onClick={onBack} aria-label="Kembali ke langkah sebelumnya">
              <ArrowLeft className="size-4" />
              <span className="hidden min-[400px]:inline lg:inline">Kembali</span>
            </Button>
          ) : (
            <span className="hidden lg:block" />
          )}
          <Button size="lg" onClick={onNext} loading={busy} className="min-w-0 flex-1 sm:flex-none sm:min-w-44">
            {nextLabel}
            {!busy && (final ? <Check className="size-4" /> : <ArrowRight className="size-4" />)}
          </Button>
        </div>
      </div>
    </>
  );
}
