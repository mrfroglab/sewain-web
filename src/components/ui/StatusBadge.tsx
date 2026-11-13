import { STATUS_LABEL } from "@/lib/selectors";
import type { BookingStatus } from "@/lib/types";
import { cn } from "./cn";

/**
 * Booking status chip. Monochrome on purpose (DESIGN.md: no colored UI surfaces):
 * in-progress = black, waiting = outline, closed = soft gray. Overdue adds a black "Telat" chip.
 */
export function StatusBadge({ status, overdue, className }: { status: BookingStatus; overdue?: boolean; className?: string }) {
  const tone =
    status === "ACTIVE" || status === "DISPUTED"
      ? "bg-ink text-white"
      : status === "REQUESTED" || status === "ACCEPTED" || status === "RETURNED"
        ? "border border-ink bg-white text-ink"
        : "bg-soft-gray text-smoke";
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className={cn("inline-flex h-6 items-center rounded-control px-2.5 text-caption font-semibold", tone)}>{STATUS_LABEL[status]}</span>
      {overdue && <span className="inline-flex h-6 items-center rounded-control bg-ink px-2.5 text-caption font-semibold text-white">⏰ Telat</span>}
    </span>
  );
}
