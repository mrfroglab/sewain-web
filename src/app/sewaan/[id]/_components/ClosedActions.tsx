"use client";

import { PackageOpen, Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import { ActionButtons, ActionHead } from "./ActionBits";
import type { BookingView } from "./shared";

/** DECLINED / EXPIRED / CANCELLED: why it ended + a way forward. */
export function ClosedActions({ view }: { view: BookingView }) {
  const { b, role, renter, provider } = view;
  const by = b.cancelledBy === b.renterId ? `${publicName(renter)} (penyewa)` : b.cancelledBy === b.providerId ? `${publicName(provider)} (penyedia)` : "salah satu pihak";

  const info =
    b.status === "DECLINED"
      ? { title: "Request ditolak", reason: b.declineReason ?? "Penyedia tidak memberi alasan.", at: b.declinedAt, by: `${publicName(provider)} (penyedia)` }
      : b.status === "EXPIRED"
        ? { title: "Request kadaluarsa", reason: "Penyedia tidak merespons dalam 24 jam, jadi request ditutup otomatis.", at: b.expiresAt, by: "Sistem" }
        : { title: "Sewa dibatalkan", reason: b.cancelReason ?? "-", at: b.cancelledAt, by };

  return (
    <>
      <ActionHead
        title={info.title}
        description={role === "penyewa" ? "Tidak ada biaya yang terpotong. Masih banyak barang serupa di sekitarmu." : role === "penyedia" ? "Barangmu tetap tersedia untuk penyewa lain." : undefined}
      />
      <div className="mt-4 rounded-[12px] bg-soft-gray p-3.5 text-body-sm">
        <p className="text-caption text-smoke">
          {info.by}
          {info.at ? ` · ${formatDateTime(info.at)}` : ""}
        </p>
        <p className="mt-1 text-graphite">{info.reason}</p>
      </div>
      <ActionButtons>
        {role === "penyewa" && (
          <ButtonLink href={`/cari?kategori=${b.agreement.category}`} size="lg">
            <Search className="size-4" /> Cari barang serupa
          </ButtonLink>
        )}
        {role === "penyedia" && (
          <ButtonLink href={`/penyedia/barang/${b.listingId}`} variant="secondary">
            <PackageOpen className="size-4" /> Kelola barang ini
          </ButtonLink>
        )}
      </ActionButtons>
    </>
  );
}
