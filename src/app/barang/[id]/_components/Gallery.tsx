"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { ListingImage } from "@/components/listing/ListingImage";
import { cn } from "@/components/ui/cn";

/**
 * Product gallery (DESIGN.md › Product Detail): large 4:5 rounded stage + 1:1 thumbnails.
 * The stage is a CSS scroll-snap strip, so it is swipeable on phones; thumbnails / arrows scroll it on desktop.
 */
export function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const strip = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const list = photos.length ? photos : [""];

  const go = (i: number) => {
    const el = strip.current;
    if (!el) return;
    const next = (i + list.length) % list.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setActive(next);
  };

  const onScroll = () => {
    const el = strip.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      <div className="relative min-w-0 flex-1">
        <div
          ref={strip}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-image bg-soft-gray"
          aria-roledescription="galeri"
          aria-label={`Foto ${title}`}
        >
          {list.map((src, i) => (
            <div key={`${src}-${i}`} className="relative aspect-[4/5] w-full shrink-0 snap-center snap-always" aria-label={`Foto ${i + 1} dari ${list.length}`} role="group">
              <ListingImage src={src || undefined} alt={`${title} — foto ${i + 1}`} priority={i === 0} />
            </div>
          ))}
        </div>
        {list.length > 1 && (
          <>
            <span className="pointer-events-none absolute bottom-3 right-3 hidden rounded-control bg-white px-2 py-0.5 text-micro font-semibold text-ink shadow-hairline lg:block">
              {active + 1}/{list.length}
            </span>
            <div className="pointer-events-none absolute inset-x-0 bottom-3.5 flex justify-center gap-1.5 lg:hidden" aria-hidden>
              {list.map((_, i) => (
                <span key={i} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-4 bg-ink" : "w-1.5 bg-white/90 shadow-hairline")} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="Foto sebelumnya"
              className="absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-floating hover:bg-soft-gray lg:grid"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Foto berikutnya"
              className="absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-floating hover:bg-soft-gray lg:grid"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto p-0.5 lg:w-[76px] lg:shrink-0 lg:flex-col lg:overflow-visible" role="tablist" aria-label="Pilih foto">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Lihat foto ${i + 1}`}
              onClick={() => go(i)}
              className={cn(
                "relative aspect-square w-16 shrink-0 overflow-hidden rounded-[10px] bg-soft-gray transition-opacity lg:w-full",
                i === active ? "ring-2 ring-ink" : "opacity-70 hover:opacity-100",
              )}
            >
              <ListingImage src={src || undefined} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
