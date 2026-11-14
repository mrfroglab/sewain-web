"use client";

import { ArrowUpRight, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Stars } from "@/components/ui/Stars";
import { formatDateTime } from "@/lib/format";
import { publicName, trustScore, userRating } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import type { User } from "@/lib/types";
import { AdminSection, Bar } from "../../../_components/AdminUi";

export const USER_STATUS_LABEL: Record<User["status"], string> = { aktif: "Aktif", suspend: "Ditangguhkan", blacklist: "Diblokir (NIK)" };

/** Reputation of both parties: rating, trust score, strikes, dispute history (FR-T3, PRD 11.2 L3). */
export function PartyCards({ renter, provider }: { renter?: User; provider?: User }) {
  return (
    <AdminSection title="Profil kedua pihak" description="Nama lengkap dan NIK hanya terlihat oleh admin (FR-A5).">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {renter && <PartyCard user={renter} side="Penyewa" />}
        {provider && <PartyCard user={provider} side="Penyedia" />}
      </div>
    </AdminSection>
  );
}

function PartyCard({ user, side }: { user: User; side: string }) {
  const now = useNow();
  const users = useAppStore((s) => s.users);
  const reviews = useAppStore((s) => s.reviews);
  const bookings = useAppStore((s) => s.bookings);
  const disputes = useAppStore((s) => s.disputes);
  const strikes = useAppStore((s) => s.strikes);

  const stats = useMemo(() => {
    const state = { users, reviews, bookings, disputes };
    const mine = bookings.filter((b) => b.renterId === user.id || b.providerId === user.id);
    return {
      rating: userRating(state, user.id, now),
      trust: trustScore(state, user.id, now),
      disputes: disputes.filter((d) => mine.some((b) => b.id === d.bookingId)).length,
      completed: mine.filter((b) => b.status === "COMPLETED").length,
      strikeList: strikes.filter((s) => s.userId === user.id),
    };
  }, [users, reviews, bookings, disputes, strikes, user.id, now]);

  return (
    <div className="rounded-card border border-border-gray p-4">
      <div className="flex items-start gap-3">
        <Avatar name={publicName(user)} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold uppercase tracking-[0.06em] text-smoke">{side}</p>
          <p className="truncate text-body font-semibold text-ink">{publicName(user)}</p>
          <p className="truncate text-caption text-smoke">
            {user.name} · NIK {user.verification.nikMasked ?? "–"}
          </p>
        </div>
        <Link href={`/u/${user.id}`} className="grid size-9 shrink-0 place-items-center rounded-full border border-border-gray hover:border-ink" aria-label={`Profil publik ${publicName(user)}`}>
          <ArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {user.verification.status === "terverifikasi" && (
          <Badge tone="soft" icon={<BadgeCheck className="size-3" />}>
            Terverifikasi
          </Badge>
        )}
        {user.accountType === "toko" && <Badge tone="soft">Toko</Badge>}
        <Badge tone={user.status === "aktif" ? "outline" : "ink"}>{USER_STATUS_LABEL[user.status]}</Badge>
      </div>

      <div className="mt-3 space-y-2 text-body-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-smoke">Rating</span>
          <Stars rating={stats.rating.rating} count={stats.rating.count} />
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-smoke">Skor kepercayaan</span>
            <span className="font-semibold tabular-nums text-ink">{stats.trust}/100</span>
          </div>
          <Bar value={stats.trust} max={100} className="mt-1.5" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-smoke">Strike</span>
          <span className="font-semibold tabular-nums text-ink">{user.strikes}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-smoke">Sengketa / sewa selesai</span>
          <span className="tabular-nums text-graphite">
            {stats.disputes} / {stats.completed}
          </span>
        </div>
      </div>

      {stats.strikeList.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border-gray pt-3">
          {stats.strikeList.slice(0, 3).map((s) => (
            <li key={s.id} className="text-caption text-graphite">
              <span className="font-semibold text-ink">Strike {s.severity}</span> · {s.reason}
              <span className="block text-micro text-smoke">{formatDateTime(s.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
