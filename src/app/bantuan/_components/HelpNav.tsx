"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import { HELP_SECTIONS } from "./toc";

/**
 * In-page navigation. Phones: a swipeable pill row above the content.
 * Desktop: a sticky column of pills beside the content, highlighting the section in view.
 */
export function HelpNav() {
  const [active, setActive] = useState<string>(HELP_SECTIONS[0].id);

  useEffect(() => {
    const els = HELP_SECTIONS.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = HELP_SECTIONS.find((s) => visible.get(s.id));
        if (first) setActive(first.id);
      },
      // A band just below the sticky header: the topmost section crossing it is "current".
      { rootMargin: "-130px 0px -55% 0px" },
    );
    // The first callback fires right away, so deep links (/bantuan#komisi) highlight the right pill too.
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Daftar isi bantuan" className="lg:sticky lg:top-[124px] lg:self-start">
      <p className="mb-3 hidden text-caption font-semibold uppercase tracking-[0.08em] text-ink lg:block">Daftar isi</p>
      <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:items-start lg:overflow-visible lg:px-0 lg:pb-0">
        {HELP_SECTIONS.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              onClick={() => setActive(s.id)}
              className={cn(
                // Same look as the shared nav pill, but 36px tall on phones for comfortable tapping.
                "inline-flex h-9 items-center whitespace-nowrap rounded-control border px-3.5 text-nav font-medium transition-colors lg:h-8",
                active === s.id ? "border-ink bg-ink text-white" : "border-border-gray bg-white text-ink hover:border-ink",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
