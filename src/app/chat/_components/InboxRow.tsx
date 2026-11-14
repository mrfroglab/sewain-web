"use client";

import { BadgeCheck, Camera } from "lucide-react";
import Link from "next/link";
import { ListingImage } from "@/components/listing/ListingImage";
import { cn } from "@/components/ui/cn";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { relativeTime } from "@/lib/format";
import { isVerified, publicName } from "@/lib/selectors";
import type { ID } from "@/lib/types";
import type { Thread } from "./threads";

function Preview({ thread, userId }: { thread: Thread; userId: ID }) {
  const { last, unread } = thread;
  if (!last) return <span className="italic text-smoke">Belum ada pesan. Mulai obrolan, yuk.</span>;
  if (last.senderId === "system") return <span className="italic text-smoke">{last.text}</span>;
  const mine = last.senderId === userId;
  return (
    <span className={unread ? "font-semibold text-ink" : "text-graphite"}>
      {mine && <span className="font-normal text-smoke">Kamu: </span>}
      {last.photoId && (
        <span className="mr-1 inline-flex items-center gap-1 align-[-2px]">
          <Camera className="size-3.5" aria-hidden />
          {!last.text && "Foto"}
        </span>
      )}
      {last.text}
    </span>
  );
}

/** Inbox row: listing thumb · other party (public name only) · last message · time · unread count · status. */
export function InboxRow({ thread, userId, now }: { thread: Thread; userId: ID; now: number }) {
  const { booking, listing, other, role, unread, lastAt } = thread;
  return (
    <li>
      <Link href={`/sewaan/${booking.id}/chat`} className="flex gap-3 rounded-[12px] px-2 py-3 transition-colors hover:bg-soft-gray">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-[10px] bg-soft-gray">
          <ListingImage src={listing?.photos[0]} alt="" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-body font-semibold text-ink">{publicName(other)}</span>
            {isVerified(other) && (
              <>
                <BadgeCheck className="size-3.5 shrink-0 text-ink" aria-hidden />
                <span className="sr-only">Terverifikasi</span>
              </>
            )}
            <span className="shrink-0 text-caption text-ash">· {role === "penyewa" ? "Penyedia" : "Penyewa"}</span>
            <span className={cn("ml-auto shrink-0 pl-2 text-caption", unread ? "font-semibold text-ink" : "text-smoke")}>{relativeTime(lastAt, now)}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-caption text-smoke">{listing?.title ?? "Barang"}</span>
            <StatusBadge status={booking.status} overdue={booking.overdue} className="shrink-0 [&>span]:h-5 [&>span]:px-2 [&>span]:text-micro" />
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-body-sm">
              <Preview thread={thread} userId={userId} />
            </span>
            {unread > 0 && (
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-ink px-1.5 text-micro font-semibold text-white">
                {unread > 99 ? "99+" : unread}
                <span className="sr-only"> pesan belum dibaca</span>
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}
