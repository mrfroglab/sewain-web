"use client";

import { Ban, Check, EyeOff, Flag, Package, RotateCcw, ShieldAlert, UserRound, X } from "lucide-react";
import Link from "next/link";
import { ListingImage } from "@/components/listing/ListingImage";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { formatDateTime, relativeTime } from "@/lib/format";
import { bannedWordsIn, publicName } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { Listing, Report, User } from "@/lib/types";
import { useAdmin } from "../../_components/AdminContext";

export const LISTING_STATUS_LABEL: Record<Listing["status"], string> = {
  aktif: "Tampil di pencarian",
  jeda: "Dijeda",
  diturunkan: "Diturunkan admin",
};

const USER_STATUS_LABEL: Record<User["status"], string> = { aktif: "Akun aktif", suspend: "Ditangguhkan", blacklist: "Diblokir (NIK)" };

const REPORT_STATUS_LABEL: Record<Report["status"], string> = { baru: "Baru", ditindak: "Ditindak", ditolak: "Ditolak" };

export function ReportCard({
  report,
  now,
  onStrike,
  onResolve,
}: {
  report: Report;
  now: number;
  onStrike: (user: User) => void;
  onResolve: (status: "ditindak" | "ditolak") => void;
}) {
  const admin = useAdmin();
  const listing = useAppStore((s) => (report.targetType === "listing" ? s.listings.find((l) => l.id === report.targetId) : undefined));
  const targetUserId = report.targetType === "user" ? report.targetId : listing?.ownerId;
  const targetUser = useAppStore((s) => s.users.find((u) => u.id === targetUserId));
  const reporter = useAppStore((s) => s.users.find((u) => u.id === report.reporterId));
  const resolver = useAppStore((s) => s.users.find((u) => u.id === report.resolvedBy));
  const banned = useAppStore((s) => s.bannedKeywords);
  const setListingStatus = useAppStore((s) => s.setListingStatus);

  const hits = listing ? bannedWordsIn(`${listing.title} ${listing.description}`, banned) : [];
  const reporterLabel = !reporter ? "Pengguna" : reporter.role === "admin" ? "Admin / filter kata kunci otomatis" : `${publicName(reporter)} (${reporter.name})`;

  const takeDown = () =>
    listing && toastResult(setListingStatus(admin.id, listing.id, "diturunkan"), "Listing diturunkan dan tidak tampil lagi di pencarian.");
  const restore = () =>
    listing &&
    toastResult(
      setListingStatus(admin.id, listing.id, "aktif"),
      targetUser?.status === "aktif" ? "Listing dipulihkan dan tampil lagi di pencarian." : "Listing dipulihkan, tapi baru tampil setelah akun pemiliknya aktif lagi.",
    );

  return (
    <article className="rounded-card border border-border-gray bg-white p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-soft-gray text-ink">
          {report.targetType === "listing" ? <Package className="size-[18px]" /> : <UserRound className="size-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-caption text-smoke">
            {report.targetType === "listing" ? "Listing" : "Pengguna"} dilaporkan · {relativeTime(report.createdAt, now)}
          </p>
          <h3 className="mt-0.5 text-body font-semibold text-ink">{report.reason}</h3>
        </div>
        <span
          className={cn(
            "inline-flex h-6 shrink-0 items-center rounded-control px-2.5 text-caption font-semibold",
            report.status === "baru" ? "border border-ink bg-white text-ink" : "bg-soft-gray text-smoke",
          )}
        >
          {REPORT_STATUS_LABEL[report.status]}
        </span>
      </header>

      {report.detail && <p className="mt-3 text-body-sm text-graphite">&ldquo;{report.detail}&rdquo;</p>}

      {/* Target */}
      <div className="mt-3 flex items-center gap-3 rounded-[12px] bg-soft-gray p-3">
        {report.targetType === "listing" ? (
          <>
            <div className="relative size-14 shrink-0 overflow-hidden rounded-[10px] bg-image-gray">
              <ListingImage src={listing?.photos[0]} alt={listing?.title ?? "Listing"} />
            </div>
            <div className="min-w-0 flex-1">
              {listing ? (
                <Link href={`/barang/${listing.id}`} className="line-clamp-2 text-body-sm font-semibold text-ink underline-offset-2 hover:underline">
                  {listing.title}
                </Link>
              ) : (
                <p className="text-body-sm font-semibold text-ink">Listing sudah tidak ada</p>
              )}
              <p className="mt-0.5 text-caption text-smoke">
                {listing && <span className={cn(listing.status !== "aktif" && "font-semibold text-ink")}>{LISTING_STATUS_LABEL[listing.status]}</span>}
                {targetUser && (
                  <>
                    {" · "}Pemilik:{" "}
                    <Link href={`/admin/pengguna?u=${targetUser.id}`} className="font-medium text-ink underline-offset-2 hover:underline">
                      {targetUser.name}
                    </Link>
                    {(targetUser.strikes ?? 0) > 0 && ` · ${(targetUser.strikes ?? 0)} strike`}
                  </>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
            <Avatar name={targetUser?.name ?? "?"} size={44} />
            <div className="min-w-0 flex-1">
              {targetUser ? (
                <Link href={`/admin/pengguna?u=${targetUser.id}`} className="text-body-sm font-semibold text-ink underline-offset-2 hover:underline">
                  {publicName(targetUser)} <span className="font-normal text-smoke">({targetUser.name})</span>
                </Link>
              ) : (
                <p className="text-body-sm font-semibold text-ink">Akun tidak ditemukan</p>
              )}
              {targetUser && (
                <p className="mt-0.5 text-caption text-smoke">
                  <span className={cn(targetUser.status !== "aktif" && "font-semibold text-ink")}>{USER_STATUS_LABEL[targetUser.status]}</span> · {(targetUser.strikes ?? 0)} strike
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {hits.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-caption text-graphite">
          <Ban className="size-3.5 text-ink" /> Kata terlarang terdeteksi:
          {hits.map((w) => (
            <span key={w} className="rounded-control bg-ink px-2 py-0.5 text-micro font-semibold text-white">
              {w}
            </span>
          ))}
        </p>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-caption text-smoke">
        <Flag className="size-3.5" /> Pelapor: <span className="text-graphite">{reporterLabel}</span>
      </p>

      {report.status !== "baru" && (
        <div className="mt-3 rounded-[12px] border border-border-gray p-3 text-caption text-graphite">
          <p className="font-semibold text-ink">{report.status === "ditindak" ? "Ditindak" : "Ditolak"}{resolver ? ` oleh ${resolver.nickname ?? resolver.name}` : ""}{report.resolvedAt ? ` · ${formatDateTime(report.resolvedAt)}` : ""}</p>
          {report.resolution && <p className="mt-0.5">{report.resolution}</p>}
        </div>
      )}

      <footer className="mt-4 flex flex-wrap gap-2">
        {listing &&
          (listing.status === "diturunkan" ? (
            <Button variant="secondary" onClick={restore}>
              <RotateCcw className="size-4" /> Pulihkan listing
            </Button>
          ) : (
            <Button variant="secondary" onClick={takeDown}>
              <EyeOff className="size-4" /> Turunkan listing
            </Button>
          ))}
        {targetUser && targetUser.role !== "admin" && (
          <Button variant="secondary" onClick={() => onStrike(targetUser)}>
            <ShieldAlert className="size-4" /> Beri strike
          </Button>
        )}
        {report.status === "baru" && (
          <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
            <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => onResolve("ditolak")}>
              <X className="size-4" /> Tolak laporan
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={() => onResolve("ditindak")}>
              <Check className="size-4" /> Tindak
            </Button>
          </div>
        )}
      </footer>
    </article>
  );
}
