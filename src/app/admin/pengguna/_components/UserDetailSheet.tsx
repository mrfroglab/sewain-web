"use client";

import { ArrowLeft, Ban, ExternalLink, PauseCircle, RotateCcw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { KV, Notice } from "@/components/ui/Layout";
import { Sheet } from "@/components/ui/Sheet";
import { areaName } from "@/lib/data/areas";
import { formatDate, formatDateTime, isoDate, maskPhone } from "@/lib/format";
import { publicName, trustScore, userRating } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import { toastResult } from "@/lib/toast";
import type { User } from "@/lib/types";
import { useAdmin } from "../../_components/AdminContext";
import { MIN_REASON } from "../../_components/ReasonSheet";
import { SUSPEND_HINT_AT, type Severity } from "../../_components/StrikeSheet";
import { LADDER, METHOD_LABEL, STATUS_LABEL, VERIFICATION_LABEL, accountLabel, ladderStep } from "./labels";
import { ACTION_TITLE, UserActionForm, type UserAction } from "./UserActionForm";

const SUCCESS: Record<UserAction, (name: string) => string> = {
  strike: (n) => `Strike diberikan ke ${n}.`,
  suspend: (n) => `Akun ${n} ditangguhkan.`,
  blacklist: (n) => `${n} di-blacklist. NIK-nya tidak bisa daftar lagi.`,
  aktif: (n) => `Akun ${n} aktif lagi.`,
};

/** User detail for admins: identity (full name, masked NIK), activity, strike history and L3 actions. */
export function UserDetailSheet({ user, onClose }: { user: User; onClose: () => void }) {
  const admin = useAdmin();
  const now = useNow();
  const users = useAppStore((s) => s.users);
  const bookings = useAppStore((s) => s.bookings);
  const listings = useAppStore((s) => s.listings);
  const disputes = useAppStore((s) => s.disputes);
  const reviews = useAppStore((s) => s.reviews);
  const reports = useAppStore((s) => s.reports);
  const allStrikes = useAppStore((s) => s.strikes);
  const addStrike = useAppStore((s) => s.addStrike);
  const setUserStatus = useAppStore((s) => s.setUserStatus);

  const [action, setAction] = useState<UserAction | null>(null);
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState<Severity>("ringan");

  const stats = useMemo(() => {
    const mine = bookings.filter((b) => b.renterId === user.id || b.providerId === user.id);
    const ids = new Set(mine.map((b) => b.id));
    const own = listings.filter((l) => l.ownerId === user.id);
    return {
      asRenter: mine.filter((b) => b.renterId === user.id).length,
      asProvider: mine.filter((b) => b.providerId === user.id).length,
      listings: own.length,
      liveListings: own.filter((l) => l.status === "aktif").length,
      disputes: disputes.filter((d) => ids.has(d.bookingId)).length,
      reportsAgainst: reports.filter((r) => (r.targetType === "user" ? r.targetId === user.id : own.some((l) => l.id === r.targetId))).length,
      rating: userRating({ users, reviews }, user.id, now),
      trust: trustScore({ users, reviews, bookings, disputes }, user.id, now),
      strikes: allStrikes.filter((s) => s.userId === user.id).sort((a, b) => b.at - a.at),
    };
  }, [user.id, users, bookings, listings, disputes, reviews, reports, allStrikes, now]);

  const pick = (a: UserAction, sev: Severity = "ringan") => {
    setAction(a);
    setSeverity(sev);
    setReason("");
  };

  const confirm = () => {
    if (!action) return;
    const text = reason.trim();
    const res = action === "strike" ? addStrike(admin.id, user.id, { reason: text, severity }) : setUserStatus(admin.id, user.id, action, text);
    if (toastResult(res, SUCCESS[action](publicName(user)))) setAction(null);
  };

  const isAdminAccount = user.role === "admin";
  const step = ladderStep(user);

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title={action ? ACTION_TITLE[action] : user.name}
      description={action ? `${user.name} · tampil ke publik sebagai "${publicName(user)}"` : `Tampil ke pengguna lain sebagai "${publicName(user)}" · ${user.id}`}
      footer={
        isAdminAccount ? undefined : action ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setAction(null)}>
              <ArrowLeft className="size-4" /> Kembali
            </Button>
            <Button className="flex-1 sm:ml-auto sm:flex-none" disabled={reason.trim().length < MIN_REASON} onClick={confirm}>
              {ACTION_TITLE[action]}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            {user.status !== "blacklist" && (
              <>
                <Button variant="secondary" onClick={() => pick("strike", "ringan")}>
                  <ShieldAlert className="size-4" /> Strike ringan
                </Button>
                <Button variant="secondary" onClick={() => pick("strike", "berat")}>
                  <ShieldAlert className="size-4" /> Strike berat
                </Button>
              </>
            )}
            {user.status === "aktif" && (
              <Button variant="secondary" onClick={() => pick("suspend")}>
                <PauseCircle className="size-4" /> Suspend
              </Button>
            )}
            {user.status !== "blacklist" && (
              <Button variant="secondary" onClick={() => pick("blacklist")}>
                <Ban className="size-4" /> Blacklist
              </Button>
            )}
            {user.status !== "aktif" && (
              <Button className={cn(user.status === "blacklist" && "col-span-2")} onClick={() => pick("aktif")}>
                <RotateCcw className="size-4" /> Pulihkan
              </Button>
            )}
          </div>
        )
      }
    >
      {action ? (
        <div className="pt-2">
          <UserActionForm user={user} action={action} reason={reason} onReason={setReason} severity={severity} onSeverity={setSeverity} />
        </div>
      ) : (
        <div className="space-y-6 pt-2">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size={48} dark={isAdminAccount} />
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <Badge tone={user.status === "aktif" ? "soft" : "ink"}>{STATUS_LABEL[user.status]}</Badge>
              <Badge tone={user.verification.status === "terverifikasi" ? "soft" : "outline"}>{VERIFICATION_LABEL[user.verification.status]}</Badge>
              <Badge tone="outline">{accountLabel(user)}</Badge>
              {isAdminAccount && <Badge tone="ink">Admin</Badge>}
            </div>
          </div>

          {isAdminAccount ? (
            <Notice>Akun admin tidak bisa diberi sanksi dari panel ini.</Notice>
          ) : (
            <section aria-label="Tangga sanksi">
              <p className="mb-2 text-caption font-semibold uppercase tracking-[0.08em] text-smoke">Tangga sanksi</p>
              <ol className="grid grid-cols-4 gap-1.5">
                {LADDER.map((label, i) => (
                  <li
                    key={label}
                    className={cn(
                      "rounded-[10px] px-2 py-2 text-center text-micro font-semibold",
                      i === step ? "bg-ink text-white" : i < step ? "border border-ink text-ink" : "bg-soft-gray text-ash",
                    )}
                  >
                    {i === 1 && user.strikes > 0 ? `${user.strikes} strike` : label}
                  </li>
                ))}
              </ol>
              {user.status === "aktif" && user.strikes >= SUSPEND_HINT_AT && (
                <p className="mt-2 text-caption text-graphite">Sudah {user.strikes} strike. Pertimbangkan suspend sebelum blacklist.</p>
              )}
            </section>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <section>
              <p className="mb-1 text-caption font-semibold uppercase tracking-[0.08em] text-smoke">Identitas (khusus admin)</p>
              <div className="divide-y divide-border-gray">
                <KV k="Nama lengkap" v={user.name} strong />
                <KV k="Nama publik" v={publicName(user)} />
                <KV k="Nomor HP" v={<span className="font-mono">{maskPhone(user.phone)}</span>} />
                {user.email && <KV k="Email" v={<span className="break-all">{user.email}</span>} />}
                <KV k="NIK" v={<span className="font-mono">{user.verification.nikMasked && user.verification.nikMasked !== "-" ? user.verification.nikMasked : "–"}</span>} />
                <KV
                  k="Verifikasi"
                  v={`${VERIFICATION_LABEL[user.verification.status]}${user.verification.method ? ` (${METHOD_LABEL[user.verification.method]})` : ""}`}
                />
                <KV k="Area" v={`${areaName(user.areaId)}${user.campus ? ` · ${user.campus}` : ""}`} />
                <KV k="Bergabung" v={formatDate(isoDate(user.joinedAt), true)} />
              </div>
            </section>
            <section>
              <p className="mb-1 text-caption font-semibold uppercase tracking-[0.08em] text-smoke">Aktivitas</p>
              <div className="divide-y divide-border-gray">
                <KV k="Rating" v={stats.rating.count ? `${stats.rating.rating.toLocaleString("id-ID")} dari ${stats.rating.count} ulasan` : "Belum ada"} />
                <KV k="Skor kepercayaan" v={`${stats.trust}/100`} />
                <KV k="Sewa sebagai penyewa" v={stats.asRenter} />
                <KV k="Sewa sebagai penyedia" v={stats.asProvider} />
                <KV k="Listing" v={`${stats.listings} (${stats.liveListings} aktif)`} />
                <KV k="Sengketa" v={stats.disputes} />
                <KV
                  k="Laporan terhadapnya"
                  v={
                    stats.reportsAgainst ? (
                      <Link href="/admin/laporan" className="font-medium text-ink underline underline-offset-2">
                        {stats.reportsAgainst} laporan
                      </Link>
                    ) : (
                      0
                    )
                  }
                />
              </div>
              <Link href={`/u/${user.id}`} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-nav font-medium text-ink underline-offset-4 hover:underline">
                Lihat profil publik <ExternalLink className="size-3.5" />
              </Link>
            </section>
          </div>

          <section>
            <p className="mb-2 text-caption font-semibold uppercase tracking-[0.08em] text-smoke">Riwayat strike ({user.strikes} poin)</p>
            {stats.strikes.length ? (
              <ul className="divide-y divide-border-gray rounded-[12px] border border-border-gray">
                {stats.strikes.map((s) => (
                  <li key={s.id} className="flex gap-3 px-3.5 py-3">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-ink" />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm text-ink">{s.reason}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-caption text-smoke">
                        <Badge tone={s.severity === "berat" ? "ink" : "soft"}>{s.severity === "berat" ? "Berat (+2)" : "Ringan (+1)"}</Badge>
                        {formatDateTime(s.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-[12px] bg-soft-gray p-3.5 text-body-sm text-graphite">Belum pernah dapat strike.</p>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}
