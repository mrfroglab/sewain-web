"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, relativeTime } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import type { AuditEntry } from "@/lib/types";
import { auditLabel } from "./labels";

/**
 * Audit entries: when, who, what, target, old → new (FR-K7). Used by the full log and by the
 * "Riwayat perubahan" blocks on the settings pages (pass `limit` + `moreHref` there).
 */
export function AuditList({ entries, limit, moreHref, empty = "Belum ada catatan." }: { entries: AuditEntry[]; limit?: number; moreHref?: string; empty?: string }) {
  const users = useAppStore((s) => s.users);
  const now = useNow();
  const sorted = [...entries].sort((a, b) => b.at - a.at);
  const shown = limit ? sorted.slice(0, limit) : sorted;

  if (!shown.length) return <p className="rounded-[12px] border border-dashed border-border-gray p-4 text-body-sm text-ash">{empty}</p>;

  return (
    <div>
      <ul className="divide-y divide-border-gray border-y border-border-gray">
        {shown.map((e) => (
          <li key={e.id} className="grid grid-cols-1 gap-1.5 py-3.5 md:grid-cols-[150px_minmax(0,1fr)] md:gap-6">
            <div className="flex items-baseline justify-between gap-3 md:block">
              <p className="text-caption font-medium tabular-nums text-ink" title={relativeTime(e.at, now)}>
                {formatDateTime(e.at)}
              </p>
              <p className="truncate text-caption text-smoke">oleh {publicName(users.find((u) => u.id === e.actorId))}</p>
            </div>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Badge tone="soft">{auditLabel(e.action)}</Badge>
                <span className="min-w-0 text-body-sm font-semibold text-ink">{e.target}</span>
                <span className="font-mono text-micro text-ash">{e.action}</span>
              </p>
              {(e.oldValue || e.newValue) && (
                <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-body-sm">
                  {e.oldValue && (
                    <>
                      <dt className="text-smoke">Lama</dt>
                      <dd className="break-words text-graphite">{e.oldValue}</dd>
                    </>
                  )}
                  {e.newValue && (
                    <>
                      <dt className="text-smoke">{e.oldValue ? "Baru" : "Detail"}</dt>
                      <dd className="break-words text-ink">{e.newValue}</dd>
                    </>
                  )}
                </dl>
              )}
            </div>
          </li>
        ))}
      </ul>
      {moreHref && sorted.length > shown.length && (
        <Link href={moreHref} className="mt-3 inline-flex h-9 items-center gap-1.5 text-nav font-medium text-ink underline-offset-4 hover:underline">
          Lihat {sorted.length - shown.length} catatan lain di log audit <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
