"use client";

// Papan bukti mediator (FR-P9, PRD 9.8): referensi · check-out · check-in side by side per angle,
// collateral photos, problem photos, and every SHA-256 for integrity checks (PRD 13.1).

import { Fingerprint, Lock } from "lucide-react";
import { useMemo } from "react";
import { formatDateTime } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import { describeCollateral } from "@/lib/pricing";
import { useAppStore } from "@/lib/store";
import type { Booking, Dispute, Listing, PhotoRecord, PhotoStage } from "@/lib/types";
import { AdminSection } from "../../../_components/AdminUi";
import { EmptyNote, EvidenceTile, MissingTile, ReferenceTile, SOURCE_LABEL } from "./EvidenceTile";

const STAGE_LABEL: Partial<Record<PhotoStage, string>> = {
  checkout: "Check-out",
  checkin: "Check-in",
  jaminan: "Jaminan",
  masalah: "Masalah",
  chat: "Chat",
  sengketa: "Bukti sengketa",
  referensi: "Referensi",
};

export function EvidenceBoard({ booking, dispute, listing }: { booking: Booking; dispute: Dispute; listing?: Listing }) {
  const photos = useAppStore((s) => s.photos);
  const users = useAppStore((s) => s.users);

  const ev = useMemo(() => {
    const byId = new Map(photos.map((p) => [p.id, p]));
    const checkout = booking.checkout?.photoIds ?? [];
    const checkinAll = booking.checkin?.photoIds ?? [];
    const checkin = checkinAll.filter((id) => byId.get(id)?.stage !== "masalah");
    const problem = Array.from(new Set([...checkinAll.filter((id) => byId.get(id)?.stage === "masalah"), ...dispute.photoIds]));
    const refs = booking.agreement.referencePhotos?.length ? booking.agreement.referencePhotos : listing?.photos ?? [];
    const rows = Math.max(refs.length, checkout.length, checkin.length);
    const angles = Array.from({ length: rows }, (_, i) => byId.get(checkout[i])?.angle ?? byId.get(checkin[i])?.angle ?? `Sudut ${i + 1}`);
    const all = photos
      .filter((p) => p.bookingId === booking.id || dispute.photoIds.includes(p.id))
      .sort((a, b) => a.serverTimestamp - b.serverTimestamp);
    return { checkout, checkin, problem, refs, rows, angles, all, collateral: booking.checkout?.collateralPhotoIds ?? [] };
  }, [photos, booking, dispute.photoIds, listing]);

  const code = booking.code;
  const columns = [
    { label: "Referensi", sub: "Saat diiklankan" },
    { label: "Check-out", sub: booking.checkout ? formatDateTime(booking.checkout.submittedAt) : "Belum ada" },
    { label: "Check-in", sub: booking.checkin ? formatDateTime(booking.checkin.at) : "Belum ada" },
  ];

  return (
    <div className="space-y-10">
      <AdminSection title="Papan bukti" description="Referensi, check-out, dan check-in berdampingan per sudut. Ketuk foto untuk memperbesar; ketuk sidik sha256 untuk melihat hash lengkap.">
        {ev.rows === 0 ? (
          <EmptyNote>Belum ada foto untuk dibandingkan.</EmptyNote>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2 border-b border-border-gray pb-2 sm:gap-3">
              {columns.map((c) => (
                <div key={c.label} className="min-w-0">
                  <p className="text-caption font-semibold uppercase tracking-[0.06em] text-ink">{c.label}</p>
                  <p className="truncate text-micro text-smoke">{c.sub}</p>
                </div>
              ))}
            </div>
            {Array.from({ length: ev.rows }, (_, i) => (
              <div key={i}>
                <p className="mb-1.5 text-body-sm font-semibold text-ink">
                  <span className="mr-1.5 text-smoke">{i + 1}</span>
                  {ev.angles[i]}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {ev.refs[i] ? <ReferenceTile src={ev.refs[i]} /> : <MissingTile />}
                  {ev.checkout[i] ? <EvidenceTile id={ev.checkout[i]} bookingCode={code} /> : <MissingTile />}
                  {ev.checkin[i] ? <EvidenceTile id={ev.checkin[i]} bookingCode={code} /> : <MissingTile />}
                </div>
              </div>
            ))}
          </div>
        )}
        {booking.checkin?.result === "masalah" && (
          <p className="mt-4 rounded-[12px] bg-soft-gray p-3 text-body-sm text-graphite">
            <span className="font-semibold text-ink">Catatan check-in penyedia: {booking.checkin.problemType ?? "ada masalah"}.</span> {booking.checkin.problemNote}
          </p>
        )}
      </AdminSection>

      {(booking.checkout?.odometer || booking.checkin?.odometer) && (
        <AdminSection title="Odometer & BBM">
          <div className="grid grid-cols-2 gap-3 text-body-sm">
            <Reading label="Check-out" odometer={booking.checkout?.odometer} fuel={booking.checkout?.fuel} />
            <Reading label="Check-in" odometer={booking.checkin?.odometer} fuel={booking.checkin?.fuel} />
          </div>
        </AdminSection>
      )}

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <AdminSection title="Foto jaminan" description={describeCollateral(booking.agreement.collateral, booking.agreement.itemValue)}>
          {ev.collateral.length ? <TileGrid ids={ev.collateral} code={code} /> : <EmptyNote>Belum ada foto jaminan.</EmptyNote>}
          <p className="mt-2 flex items-center gap-1.5 text-caption text-smoke">
            <Lock className="size-3.5 shrink-0" /> Hanya terlihat oleh kedua pihak dan mediator (FR-J5).
          </p>
        </AdminSection>
        <AdminSection title={`Foto masalah${ev.problem.length ? ` (${ev.problem.length})` : ""}`} description="Dari check-in “ada masalah” dan laporan sengketa.">
          {ev.problem.length ? <TileGrid ids={ev.problem} code={code} /> : <EmptyNote>Tidak ada foto masalah.</EmptyNote>}
        </AdminSection>
      </div>

      <details className="group rounded-card border border-border-gray">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-body-sm font-semibold text-ink">
          <Fingerprint className="size-4 shrink-0" />
          <span className="flex-1">Sidik foto SHA-256 ({ev.all.length} foto)</span>
          <span className="text-caption font-normal text-smoke group-open:hidden">Tampilkan</span>
          <span className="hidden text-caption font-normal text-smoke group-open:inline">Sembunyikan</span>
        </summary>
        <div className="border-t border-border-gray px-4 pb-4">
          <p className="pt-3 text-caption text-smoke">
            Hash dan waktu dicatat saat unggah (produk: dihitung di server, FR-P2/P3). Foto tidak bisa dihapus atau diganti (FR-P4). Cocokkan hash ini dengan file yang diserahkan kalau ada keraguan.
          </p>
          <ul className="mt-3 divide-y divide-border-gray">
            {ev.all.map((p) => (
              <HashRow key={p.id} photo={p} uploader={publicName(users.find((u) => u.id === p.uploaderId))} />
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}

function TileGrid({ ids, code }: { ids: string[]; code: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-2">
      {ids.map((id) => (
        <EvidenceTile key={id} id={id} bookingCode={code} />
      ))}
    </div>
  );
}

function Reading({ label, odometer, fuel }: { label: string; odometer?: string; fuel?: string }) {
  return (
    <div className="rounded-[12px] bg-soft-gray p-3">
      <p className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">{label}</p>
      <p className="mt-1 text-ink">Odometer {odometer ? `${odometer} km` : "–"}</p>
      <p className="text-graphite">BBM {fuel ?? "–"}</p>
    </div>
  );
}

function HashRow({ photo, uploader }: { photo: PhotoRecord; uploader: string }) {
  return (
    <li className="py-2.5">
      <p className="flex flex-wrap items-center gap-x-2 text-caption">
        <span className="font-semibold text-ink">{STAGE_LABEL[photo.stage] ?? photo.stage}</span>
        {photo.angle && <span className="text-graphite">{photo.angle}</span>}
        <span className="text-smoke">
          {uploader} · {formatDateTime(photo.serverTimestamp)} · <span className={photo.source === "galeri" ? "font-semibold text-ink" : ""}>{SOURCE_LABEL[photo.source]}</span>
        </span>
      </p>
      <p className="mt-0.5 break-all font-mono text-[10px] leading-snug text-graphite">{photo.sha256}</p>
    </li>
  );
}
