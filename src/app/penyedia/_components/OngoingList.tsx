import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ListingImage } from "@/components/listing/ListingImage";
import { SectionHeading } from "@/components/ui/Layout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateRange } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import type { OngoingRow } from "./useProviderData";

/** "Sedang berjalan": ACCEPTED / ACTIVE / RETURNED / DISPUTED, with what to do next. */
export function OngoingList({ rows }: { rows: OngoingRow[] }) {
  return (
    <section id="berjalan" className="scroll-mt-24">
      <SectionHeading title="Sedang berjalan" description="Serah terima, barang di penyewa, dan pengembalian jaminan." />
      {rows.length === 0 ? (
        <p className="rounded-card bg-soft-gray p-4 text-body-sm text-smoke">Belum ada sewa yang berjalan.</p>
      ) : (
        <ul className="divide-y divide-border-gray rounded-card border border-border-gray bg-white">
          {rows.map(({ b, listing, renter, action }) => (
            <li key={b.id}>
              <Link href={`/sewaan/${b.id}`} className="flex items-center gap-3 p-3 transition-colors hover:bg-soft-gray sm:p-4">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-[10px] bg-soft-gray">
                  <ListingImage src={listing?.photos[0]} alt={b.agreement.listingTitle} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-semibold text-ink">{b.agreement.listingTitle}</span>
                  <span className="block truncate text-caption text-smoke">
                    {publicName(renter)} · {formatDateRange(b.startDate, b.endDate)}
                  </span>
                  <StatusBadge status={b.status} overdue={b.overdue} className="mt-1.5" />
                  {action && <span className="mt-1 block text-caption font-semibold text-ink">Perlu: {action}</span>}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ash" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
