import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Slim black band for providers. Black is the primary color, so it is the one allowed "loud" surface. */
export function ProviderCta() {
  return (
    <section aria-labelledby="sewakan-title" className="flex flex-col gap-4 rounded-hero bg-ink px-5 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
      <div className="min-w-0">
        <h2 id="sewakan-title" className="text-[18px] font-semibold leading-snug tracking-[-0.3px] sm:text-[20px]">
          Punya barang nganggur? Sewakan dengan aman.
        </h2>
        <p className="mt-1 text-body-sm text-white/70">Kamu yang atur harga, jaminan, dan radius jangkauan. Individu atau toko rental kecil, dua-duanya bisa.</p>
      </div>
      <Link
        href="/penyedia"
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-control bg-white px-5 text-[13px] font-semibold text-ink transition-colors hover:bg-soft-gray focus-visible:outline-white sm:self-auto"
      >
        Mulai menyewakan
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
