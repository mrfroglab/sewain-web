"use client";

import { Flag } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/Layout";
import { Tabs } from "@/components/ui/Tabs";
import { publicName } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Report, User } from "@/lib/types";
import { useAdmin } from "../../_components/AdminContext";
import { AdminTitle } from "../../_components/AdminUi";
import { ReasonSheet } from "../../_components/ReasonSheet";
import { StrikeSheet } from "../../_components/StrikeSheet";
import { ReportCard } from "./ReportCard";

type Tab = Report["status"];
type Decision = "ditindak" | "ditolak";

const RESOLUTION_PRESETS: Record<Decision, string[]> = {
  ditindak: [
    "Listing sudah diturunkan karena melanggar aturan Sewain. Terima kasih sudah melapor.",
    "Pemilik listing sudah diberi strike dan peringatan. Terima kasih sudah melapor.",
    "Pengguna sudah diberi strike. Terima kasih sudah melapor.",
  ],
  ditolak: ["Sudah kami cek, tidak ditemukan pelanggaran.", "Bukti belum cukup. Laporan ditutup, tapi akun tetap kami pantau."],
};

const EMPTY: Record<Tab, string> = {
  baru: "Tidak ada laporan baru. Laporan dari tombol Lapor dan filter kata kunci muncul di sini.",
  ditindak: "Belum ada laporan yang ditindak.",
  ditolak: "Belum ada laporan yang ditolak.",
};

/** FR-L4: moderation queue for reported listings and users. */
export function ReportQueue() {
  const admin = useAdmin();
  const now = useNow();
  const reports = useAppStore((s) => s.reports);
  const users = useAppStore((s) => s.users);
  const listings = useAppStore((s) => s.listings);
  const resolveReport = useAppStore((s) => s.resolveReport);
  const [tab, setTab] = useState<Tab>("baru");
  const [striking, setStriking] = useState<{ user: User; reason: string } | null>(null);
  const [resolving, setResolving] = useState<{ report: Report; status: Decision } | null>(null);
  // Stable: the Sheet re-focuses itself whenever onClose changes (this page re-renders on the clock tick).
  const closeStrike = useCallback(() => setStriking(null), []);
  const closeResolve = useCallback(() => setResolving(null), []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { baru: 0, ditindak: 0, ditolak: 0 };
    for (const r of reports) c[r.status] += 1;
    return c;
  }, [reports]);

  const list = useMemo(() => {
    const rows = reports.filter((r) => r.status === tab);
    return tab === "baru" ? rows.sort((a, b) => a.createdAt - b.createdAt) : rows.sort((a, b) => (b.resolvedAt ?? b.createdAt) - (a.resolvedAt ?? a.createdAt));
  }, [reports, tab]);

  // A sensible default message for the reporter, based on what the admin already did.
  const initialResolution = (r: Report, status: Decision) => {
    if (status === "ditolak") return RESOLUTION_PRESETS.ditolak[0];
    const listing = r.targetType === "listing" ? listings.find((l) => l.id === r.targetId) : undefined;
    if (listing?.status === "diturunkan") return RESOLUTION_PRESETS.ditindak[0];
    return r.targetType === "listing" ? RESOLUTION_PRESETS.ditindak[1] : RESOLUTION_PRESETS.ditindak[2];
  };

  const reporter = resolving ? users.find((u) => u.id === resolving.report.reporterId) : undefined;

  return (
    <>
      <AdminTitle
        title="Laporan"
        subtitle="Listing dan pengguna yang dilaporkan, termasuk yang tertangkap filter kata kunci. Turunkan listing, beri strike, lalu tutup laporannya."
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "baru", label: "Baru", count: counts.baru },
          { value: "ditindak", label: "Ditindak", count: counts.ditindak },
          { value: "ditolak", label: "Ditolak", count: counts.ditolak },
        ]}
      />

      <div className="mt-5 space-y-3">
        {list.length === 0 ? (
          <EmptyState icon={<Flag className="size-5" />} title="Kosong" description={EMPTY[tab]} />
        ) : (
          list.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              now={now}
              onStrike={(user) => setStriking({ user, reason: r.reason })}
              onResolve={(status) => setResolving({ report: r, status })}
            />
          ))
        )}
      </div>

      <StrikeSheet
        open={!!striking}
        onClose={closeStrike}
        adminId={admin.id}
        // Read the live user so the "sekarang N strike" line is current.
        user={striking ? users.find((u) => u.id === striking.user.id) : undefined}
        defaultReason={striking?.reason}
      />

      <ReasonSheet
        open={!!resolving}
        onClose={closeResolve}
        title={resolving?.status === "ditolak" ? "Tolak laporan" : "Tandai sudah ditindak"}
        description={
          reporter && reporter.role !== "admin"
            ? `Pesan ini dikirim ke ${publicName(reporter)} sebagai hasil laporannya.`
            : "Hasil ini dicatat di log audit."
        }
        presets={resolving ? RESOLUTION_PRESETS[resolving.status] : undefined}
        initial={resolving ? initialResolution(resolving.report, resolving.status) : undefined}
        label="Hasil tinjauan"
        confirmLabel={resolving?.status === "ditolak" ? "Tolak laporan" : "Simpan tindakan"}
        onConfirm={(resolution) =>
          resolving
            ? toastResult(
                resolveReport(admin.id, resolving.report.id, resolving.status, resolution),
                resolving.status === "ditolak" ? "Laporan ditolak. Pelapor sudah diberi tahu." : "Laporan ditandai sudah ditindak.",
              )
            : false
        }
      />
    </>
  );
}
