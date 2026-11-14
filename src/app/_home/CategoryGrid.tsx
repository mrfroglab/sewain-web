import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/Layout";
import { CATEGORIES } from "@/lib/data/categories";

/**
 * Category cards (DESIGN.md › Category Card): landscape photo tile, name + descriptor on the left,
 * small circular arrow beneath. 4 columns on desktop, 2 on tablet/mobile. Static (no store needed).
 */
export function CategoryGrid() {
  return (
    <section aria-labelledby="kategori-title">
      <SectionHeading title={<span id="kategori-title">Kategori</span>} href="/cari" linkLabel="Lihat semua" />
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link
              href={`/cari?kategori=${c.id}`}
              className="group relative flex aspect-[1.45/1] flex-col justify-between overflow-hidden rounded-card bg-soft-gray p-3 sm:aspect-[1.8/1] sm:p-4"
            >
              <img
                src={c.image}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover object-right transition-transform duration-300 group-hover:scale-[1.03]"
              />
              {/* Subtle white veil on the text side keeps labels legible on any photo. */}
              <div aria-hidden className="absolute inset-0 bg-linear-to-r from-white/90 via-white/55 to-transparent" />
              <div className="relative max-w-[78%] sm:max-w-[62%]">
                <p className="text-[13px] font-semibold leading-tight text-ink sm:text-body">{c.name}</p>
                <p className="mt-0.5 line-clamp-2 text-caption text-graphite">{c.descriptor}</p>
              </div>
              <span
                aria-hidden
                className="relative grid size-7 place-items-center rounded-full bg-white text-ink shadow-floating transition-transform group-hover:translate-x-0.5 sm:size-8"
              >
                <ArrowRight className="size-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
