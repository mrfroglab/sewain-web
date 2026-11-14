"use client";

import { useAppStore } from "@/lib/store";

/** Pending work per admin queue (numbers only, so no shallow compare is needed). */
export function useAdminCounts() {
  const verifikasi = useAppStore((s) => s.verifications.filter((v) => v.status === "menunggu").length);
  const laporan = useAppStore((s) => s.reports.filter((r) => r.status === "baru").length);
  const sengketa = useAppStore((s) => s.disputes.filter((d) => d.status === "mediasi").length);
  return { verifikasi, laporan, sengketa };
}

export type AdminCountKey = keyof ReturnType<typeof useAdminCounts>;
