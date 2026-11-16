"use client";

import { Check, ImageOff, Sparkles, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";
import { EvidencePhoto } from "@/components/photo/EvidencePhoto";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { areaName } from "@/lib/data/areas";
import { formatDateTime, relativeTime } from "@/lib/format";
import type { KycSubmission } from "@/lib/account";
import { usePhoto } from "@/lib/photos";
import { publicName } from "@/lib/selectors";
import type { ID, User, VerificationMethod, VerificationRequest } from "@/lib/types";
import { KycPhotos } from "./KycPhotos";
import { MATCH_HINT, MATCH_LABEL, matchName } from "./nameMatch";

export const METHOD_LABEL: Record<VerificationMethod, string> = {
  ekyc: "eKYC (simulasi)",
  demo: "Lewati (mode demo)",
  manual: "Review manual",
};

const STATUS_LABEL: Record<VerificationRequest["status"], string> = { menunggu: "Menunggu", disetujui: "Disetujui", ditolak: "Ditolak" };

function IdPhoto({ id, label }: { id?: ID; label: string }) {
  const record = usePhoto(id);
  return (
    <figure className="min-w-0">
      {id && record ? (
        <EvidencePhoto id={id} aspect="aspect-[4/3]" showMeta={false} />
      ) : (
        <div className="grid aspect-[4/3] place-items-center rounded-image bg-soft-gray p-2 text-center text-micro text-ash">
          <span>
            <ImageOff className="mx-auto mb-1 size-5" />
            Foto tidak tersedia di perangkat ini
          </span>
        </div>
      )}
      <figcaption className="mt-1.5 text-micro font-medium text-graphite">{label}</figcaption>
    </figure>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 py-2 text-body-sm">
      <dt className="text-smoke">{k}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}

export function VerificationCard({
  req,
  user,
  reviewer,
  now,
  onApprove,
  onReject,
  kyc,
  busy,
}: {
  req: VerificationRequest;
  /** the server KYC submission behind this request (F6.2): photos via the audited files endpoint */
  kyc?: KycSubmission;
  busy?: boolean;
  user?: User;
  reviewer?: User;
  now: number;
  onApprove: () => void;
  onReject: () => void;
}) {
  const profileName = user?.name ?? "Akun tidak ditemukan";
  const nameOnKtp = kyc?.nameOnKtp || req.nameOnKtp;
  const match = matchName(nameOnKtp, profileName);
  const hint = MATCH_HINT[match];

  return (
    <article className="rounded-card border border-border-gray bg-white p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <Avatar name={profileName} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{profileName}</p>
          <p className="mt-0.5 text-caption text-smoke">
            Diajukan {relativeTime(req.submittedAt, now)}
            {user && ` · ${areaName(user.areaId)} · ${user.accountType === "toko" ? "Akun Toko" : "Individu"}`}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-6 shrink-0 items-center rounded-control px-2.5 text-caption font-semibold",
            req.status === "menunggu" ? "border border-ink bg-white text-ink" : "bg-soft-gray text-smoke",
          )}
        >
          {STATUS_LABEL[req.status]}
        </span>
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <dl className="divide-y divide-border-gray border-y border-border-gray">
          <Row k="Nama di KTP">
            <span className="font-mono text-[13px] tracking-wide">{nameOnKtp || "–"}</span>
          </Row>
          <Row k="Nama di profil">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {profileName}
              <Badge tone={match === "cocok" ? "soft" : "ink"} icon={match === "cocok" ? <Check className="size-3" /> : <TriangleAlert className="size-3" />}>
                {MATCH_LABEL[match]}
              </Badge>
            </span>
          </Row>
          <Row k="NIK">
            <span className="font-mono text-[13px] tracking-wide">{kyc?.nikMasked || req.nikMasked || "–"}</span>
          </Row>
          <Row k="Cara verifikasi">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {kyc ? "Unggah KTP + selfie (tinjauan admin)" : METHOD_LABEL[req.method]}
              {req.auto && (
                <Badge tone="soft" icon={<Sparkles className="size-3" />}>
                  {req.status === "ditolak" ? "sempat disetujui otomatis (simulasi eKYC)" : "disetujui otomatis (simulasi eKYC)"}
                </Badge>
              )}
            </span>
          </Row>
        </dl>
        {kyc ? (
          <KycPhotos submission={kyc} />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <IdPhoto id={req.ktpPhotoId} label="Foto KTP" />
            <IdPhoto id={req.selfiePhotoId} label="Selfie memegang KTP" />
          </div>
        )}
      </div>

      {hint && req.status === "menunggu" && (
        <p className="mt-3 flex gap-2 rounded-[12px] bg-soft-gray p-3 text-caption text-graphite">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-ink" />
          {hint}
        </p>
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 text-caption text-smoke">
          {req.status === "menunggu" ? (
            <>Setelah disetujui, {user ? publicName(user) : "pengguna"} bisa langsung menyewa dan menyewakan.</>
          ) : (
            <>
              {req.status === "disetujui" ? "Disetujui" : "Ditolak"} {req.auto && !req.reviewedBy ? "otomatis" : `oleh ${reviewer?.nickname ?? reviewer?.name ?? "admin"}`}
              {req.reviewedAt ? ` · ${formatDateTime(req.reviewedAt)}` : ""}
              {req.reason && (
                <>
                  <br />
                  <span className="text-graphite">Alasan: {req.reason}</span>
                </>
              )}
            </>
          )}
        </p>
        <div className="flex w-full gap-2 sm:w-auto">
          {req.status === "menunggu" && (
            <>
              <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onReject} disabled={busy}>
                <X className="size-4" /> Tolak
              </Button>
              <Button className="flex-1 sm:flex-none" onClick={onApprove} disabled={!user || busy} loading={busy}>
                <Check className="size-4" /> Setujui
              </Button>
            </>
          )}
          {req.status === "disetujui" && !kyc && (
            <Button variant="secondary" onClick={onReject} disabled={!user}>
              Cabut verifikasi
            </Button>
          )}
          {req.status === "ditolak" && !kyc && (
            <Button variant="secondary" onClick={onApprove} disabled={!user}>
              Setujui ulang
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}
