import { SectionHeading, Skeleton } from "@/components/ui/Layout";
import { cn } from "@/components/ui/cn";
import { HOME_COPY } from "./copy";

// Loading placeholders shown while the demo data hydrates from localStorage.
// They mirror the live layouts (same headings, columns and card ratios) to avoid layout shift.

/** Inline (span) placeholder: safe inside the <p> of SectionHeading's description. */
function LineSkeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block h-3.5 animate-pulse rounded-[10px] bg-soft-gray align-middle", className)} />;
}

function CardSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="aspect-[4/5] w-full rounded-image" />
      <Skeleton className="mt-2.5 h-3.5 w-4/5" />
      <Skeleton className="mt-2 h-3 w-1/3" />
      <Skeleton className="mt-2 h-3.5 w-1/2" />
      <Skeleton className="mt-2 h-3 w-2/3" />
    </div>
  );
}

export function NewNearbySkeleton() {
  return (
    <section aria-busy="true" aria-label={`${HOME_COPY.newNearby}, memuat`}>
      <SectionHeading title={HOME_COPY.newNearby} description={<LineSkeleton className="w-32" />} href="/cari?urut=terbaru" />
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 sm:px-0 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={cn("w-[44%] shrink-0 sm:w-auto", i >= 3 && "sm:hidden lg:block")}>
            <CardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PopularSkeleton() {
  return (
    <section aria-busy="true" aria-label={`${HOME_COPY.popular}, memuat`}>
      <SectionHeading title={HOME_COPY.popular} description={<LineSkeleton className="w-56 max-w-full" />} href="/cari" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function TestimonialsSkeleton() {
  return (
    <section aria-busy="true" aria-label={`${HOME_COPY.testimonials}, memuat`}>
      <SectionHeading title={HOME_COPY.testimonials} description={HOME_COPY.testimonialsDescription} />
      <div className="-mx-4 flex gap-4 overflow-hidden px-4 sm:mx-0 sm:px-0">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} aria-hidden className="w-[86%] shrink-0 rounded-card p-5 shadow-hairline sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-32px)/3)]">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="mt-1.5 h-2.5 w-16" />
              </div>
            </div>
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-11/12" />
            <Skeleton className="mt-2 h-3 w-2/3" />
            <Skeleton className="mt-6 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </section>
  );
}
