"use client";

import { BadgeCheck, ChevronRight, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Stars } from "@/components/ui/Stars";
import { areaName } from "@/lib/data/areas";
import { isVerified, providerLabel, publicName, type RatingSummary } from "@/lib/selectors";
import type { User } from "@/lib/types";
import { memberSince } from "@/app/barang/_components/util";

/** Provider summary on the listing page. Only the public name + "Terverifikasi" are shown (FR-A5). */
export function ProviderCard({ owner, rating, trust }: { owner: User; rating: RatingSummary; trust: number }) {
  const isStore = owner.accountType === "toko" && !!owner.store;
  return (
    <Link href={`/u/${owner.id}`} className="group flex items-start gap-3 rounded-card border border-border-gray bg-white p-4 transition-colors hover:border-ink">
      <Avatar name={providerLabel(owner)} size={44} dark={isStore} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-body font-semibold text-ink">{providerLabel(owner)}</p>
          {isVerified(owner) && (
            <Badge tone="outline" icon={<BadgeCheck className="size-3" />}>
              Terverifikasi
            </Badge>
          )}
          {isStore && <Badge tone="ink">Toko</Badge>}
        </div>
        <p className="mt-0.5 truncate text-caption text-smoke">
          {isStore ? `oleh ${publicName(owner)} · ` : ""}Bergabung {memberSince(owner.joinedAt)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stars rating={rating.rating} count={rating.count} />
          <span className="inline-flex items-center gap-1 text-caption text-graphite">
            <ShieldCheck className="size-3.5" /> Skor kepercayaan {trust}/100
          </span>
        </div>
        {isStore && owner.store && (
          <p className="mt-1.5 inline-flex items-center gap-1 text-caption text-smoke">
            <Clock className="size-3.5" /> Buka {owner.store.hours} · {areaName(owner.store.areaId)}
          </p>
        )}
      </div>
      <ChevronRight className="mt-3 size-4 shrink-0 text-ash transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-label="Lihat profil" />
    </Link>
  );
}
