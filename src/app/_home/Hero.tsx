import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";

/**
 * Hero banner (DESIGN.md › Hero Banner): soft-gray stage, text left, photo right (~2.3:1 on desktop).
 * Static markup on purpose: it is part of the first HTML and never waits for the demo data.
 * The photo is decorative (alt=""), so while /img/hero.webp is missing the gray stage simply stays empty.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative grid rounded-hero bg-image-gray md:aspect-[2/1] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:aspect-[2.3/1]">
      <div className="relative z-10 flex flex-col justify-center px-5 pb-6 pt-7 sm:px-8 md:py-10 md:pl-10 md:pr-4 lg:pl-14">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-graphite">Pilot kampus UGM · Yogyakarta</p>
        <h1 id="hero-title" className="mt-3 text-balance text-[30px] font-bold leading-[1.08] tracking-[-0.9px] text-ink sm:text-[34px] lg:text-hero-heading xl:text-[40px]">
          Sewa barang dekat kos,
          <br />
          tanpa harus beli.
        </h1>
        <p className="mt-3 max-w-[360px] text-body text-smoke">
          Tenda, kamera, kebaya, sampai proyektor dari tetangga yang identitasnya sudah terverifikasi. Jaminan tercatat, kondisi barang difoto saat serah terima.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/cari" className={buttonClass({ size: "lg" })}>
            Cari barang di sekitarmu
          </Link>
          <Link href="/penyedia" className="group inline-flex h-10 items-center gap-1.5 text-[13px] font-semibold text-ink underline-offset-4 hover:underline">
            Sewakan barangmu
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="relative aspect-[16/11] overflow-hidden rounded-b-hero sm:aspect-[16/9] md:aspect-auto md:rounded-bl-none md:rounded-r-hero">
        <img
          src="/img/hero.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-[70%_35%]"
        />
        {/* Soft blend into the gray stage so the photo never looks pasted on. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-image-gray to-transparent md:hidden" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-28 bg-linear-to-r from-image-gray to-transparent md:block" />
      </div>
    </section>
  );
}
