"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { rupiah } from "@/lib/format";
import type { Listing } from "@/lib/types";
import type { CtaState } from "./InfoPanel";

/**
 * Sticky bottom CTA bar on phones, sitting right above the tab bar.
 * Content is right-aligned: the floating "Demo" chip (DemoDock) lives at the bottom-left on phones.
 */
export function MobileCta({ listing, state }: { listing: Listing; state: CtaState }) {
  const ajukan = `/barang/${listing.id}/ajukan`;
  const cta =
    state === "owner" ? (
      <ButtonLink href={`/penyedia/barang/${listing.id}`}>
        Kelola listing
      </ButtonLink>
    ) : state === "unavailable" ? (
      <Button disabled>Tidak tersedia</Button>
    ) : state === "guest" ? (
      <ButtonLink href={`/masuk?next=${encodeURIComponent(ajukan)}`}>Masuk & ajukan</ButtonLink>
    ) : state === "unverified" ? (
      <ButtonLink href={`/verifikasi?next=${encodeURIComponent(ajukan)}`}>Verifikasi dulu</ButtonLink>
    ) : state === "restricted" ? (
      <Button disabled>Akun dibatasi</Button>
    ) : (
      <ButtonLink href={ajukan}>Ajukan sewa</ButtonLink>
    );

  return (
    <>
      {/* Spacer so the last section is never hidden behind the bar. */}
      <div className="h-20 lg:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-[540] border-t border-border-gray bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-end gap-3 pl-[116px] pr-4 sm:pr-6">
          <div className="min-w-0 text-right">
            <p className="truncate text-body font-bold leading-tight text-ink">
              {rupiah(listing.pricePerDay)}
              <span className="text-caption font-normal text-smoke"> /hari</span>
            </p>
            {listing.durationDiscount && (
              <p className="truncate text-micro font-medium text-sale-text">
                -{listing.durationDiscount.percent}% ≥ {listing.durationDiscount.minDays} hari
              </p>
            )}
          </div>
          {cta}
        </div>
      </div>
    </>
  );
}
