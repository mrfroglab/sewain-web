"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import type { Strike } from "@/lib/types";
import { ListBox, SectionTitle } from "./ui";

/** Strikes given by admin (PRD 11.2 L3: strike → suspend → blacklist). */
export function StrikesSection({ strikes }: { strikes: Strike[] }) {
  return (
    <section className="mt-10" aria-labelledby="strike">
      <SectionTitle id="strike" title="Strike" description="Diberikan admin untuk pelanggaran, mis. tidak datang atau batal sepihak. Strike berulang bisa berujung penangguhan atau blokir akun." />
      {strikes.length ? (
        <ListBox>
          {strikes.map((s) => (
            <div key={s.id} className="flex gap-3 px-4 py-3">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-ink" />
              <div className="min-w-0 flex-1">
                <p className="text-body-sm text-ink">{s.reason}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-smoke">
                  <Badge tone={s.severity === "berat" ? "ink" : "soft"}>{s.severity === "berat" ? "Berat" : "Ringan"}</Badge>
                  {formatDateTime(s.at)}
                  {s.bookingId && (
                    <Link href={`/sewaan/${s.bookingId}`} className="font-medium text-ink underline underline-offset-2">
                      Lihat sewaan
                    </Link>
                  )}
                </p>
              </div>
            </div>
          ))}
        </ListBox>
      ) : (
        <p className="rounded-card bg-soft-gray p-4 text-body-sm text-graphite">Rincian strike belum tersedia. Hubungi admin lewat halaman Bantuan untuk penjelasan.</p>
      )}
    </section>
  );
}
