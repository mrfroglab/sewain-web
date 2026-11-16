"use client";

import { ArrowRight, BadgeCheck, Clock, IdCard, ShieldAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Layout";
import { areaName } from "@/lib/data/areas";
import { maskPhone } from "@/lib/format";
import { publicName } from "@/lib/selectors";
import { useRealSession } from "@/lib/session";
import type { User } from "@/lib/types";

const monthYear = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });

const VERIF_BADGE = {
  terverifikasi: { label: "Terverifikasi", tone: "ink" },
  menunggu: { label: "Sedang ditinjau", tone: "soft" },
  ditolak: { label: "Verifikasi ditolak", tone: "outline" },
  belum: { label: "Belum verifikasi", tone: "outline" },
} as const;

/** Header card: who you are (full name is only visible to yourself), verification, membership. */
export function ProfileHeader({ user }: { user: User }) {
  const status = user.verification.status;
  // Real accounts (F6.2): KTP + selfie went to the server and wait for an admin; nothing to speed up.
  const real = useRealSession();
  const pendingReal = real && status === "menunggu";
  const verified = status === "terverifikasi";
  const vb = VERIF_BADGE[status];

  return (
    <section aria-labelledby="profil-nama">
      <div className="flex items-start gap-4">
        <Avatar name={user.name} size={64} dark={user.role === "admin"} />
        <div className="min-w-0 flex-1">
          <h1 id="profil-nama" className="break-words text-[22px] font-semibold leading-tight tracking-[-0.5px] text-ink lg:text-[26px]">
            {user.name}
          </h1>
          <p className="mt-1 text-body-sm text-smoke">
            Orang lain melihatmu sebagai <b className="font-semibold text-ink">{publicName(user)}</b>
            {user.accountType === "toko" && user.store ? (
              <>
                {" "}
                dari <b className="font-semibold text-ink">{user.store.name}</b>
              </>
            ) : null}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={vb.tone} icon={verified ? <BadgeCheck className="size-3" /> : undefined}>
              {vb.label}
            </Badge>
            <Badge tone="soft">{user.role === "admin" ? "Admin" : user.accountType === "toko" ? "Akun Toko" : "Individu"}</Badge>
            {user.campus && <Badge tone="soft">{user.studentVerified ? `Mahasiswa ${user.campus} ✓` : `Kampus ${user.campus}`}</Badge>}
            {user.earlyLender && <Badge tone="outline">Penyedia awal</Badge>}
          </div>
          <p className="mt-2.5 text-caption text-smoke">
            {maskPhone(user.phone)} · {areaName(user.areaId)} · Bergabung {monthYear.format(user.joinedAt)}
          </p>
        </div>
      </div>

      {!verified && (
        <div className="mt-5 flex flex-col gap-3 rounded-card bg-soft-gray p-4 sm:flex-row sm:items-center">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink shadow-hairline">
            {status === "menunggu" ? <Clock className="size-5" /> : <IdCard className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-semibold text-ink">{pendingReal ? "Menunggu review admin" : status === "menunggu" ? "Verifikasimu sedang ditinjau admin" : status === "ditolak" ? "Verifikasi ditolak, ulangi yuk" : "Verifikasi KTP + selfie dulu"}</p>
            <p className="mt-0.5 text-caption text-smoke">
              {pendingReal
                ? "KTP dan selfie-mu sudah kami terima dan disimpan terenkripsi. Admin meninjau paling lambat 1×24 jam; fotonya dihapus setelah diputuskan."
                : "Tanpa verifikasi kamu bisa menjelajah, tapi belum bisa menyewa atau menyewakan. Cuma ±1 menit."}
            </p>
          </div>
          <ButtonLink href={`/verifikasi?next=${encodeURIComponent("/profil")}`} className="shrink-0">
            {pendingReal ? "Lihat status" : status === "menunggu" ? "Percepat" : "Verifikasi sekarang"} <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      )}

      {user.status !== "aktif" && (
        <Notice icon={<ShieldAlert className="size-4" />} title={user.status === "suspend" ? "Akunmu sedang ditangguhkan" : "Akunmu diblokir"} tone="outline" className="mt-4">
          Kamu belum bisa menyewa atau menyewakan. Hubungi admin lewat halaman Bantuan kalau merasa ini keliru.
        </Notice>
      )}
    </section>
  );
}
