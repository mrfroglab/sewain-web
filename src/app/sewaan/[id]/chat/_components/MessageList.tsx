"use client";

import { CheckCheck, Check, Info, MessageCircle } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { EvidencePhoto } from "@/components/photo/EvidencePhoto";
import { cn } from "@/components/ui/cn";
import { formatTime } from "@/lib/format";
import type { Booking, ID, Message } from "@/lib/types";
import { WA_WARNING, buildThread, type Side } from "./thread";

/**
 * The conversation: bubbles (mine right on ink, theirs left on soft gray), system events as centered pills,
 * date separators, photo evidence with watermark, and a "Dibaca" receipt on my last message.
 * Scrolls itself to the bottom on open and whenever a message arrives (also from another tab).
 */
export function MessageList({
  booking,
  messages,
  rightId,
  nameOf,
  showNames,
  readByOtherAt,
  now,
  emptyHint,
}: {
  booking: Booking;
  messages: Message[];
  /** whose bubbles sit on the right: the viewer, or the provider when the admin mediates */
  rightId: ID;
  nameOf: (id: ID) => string;
  /** label each group with the sender (mediator view) */
  showNames: boolean;
  /** last time the other party opened the thread; null = no receipts (mediator view) */
  readByOtherAt: number | null;
  now: number;
  emptyHint: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const seen = useRef(-1); // message count last scrolled to; -1 = not yet (jump instead of smooth scroll)
  const atBottom = useRef(true);
  const items = useMemo(() => buildThread(messages, rightId, now), [messages, rightId, now]);
  const lastMine = useMemo(() => [...messages].reverse().find((m) => m.senderId === rightId), [messages, rightId]);
  const count = messages.length;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || seen.current === count) return;
    el.scrollTo({ top: el.scrollHeight, behavior: seen.current < 0 ? "auto" : "smooth" });
    seen.current = count;
    atBottom.current = true;
  }, [count]);

  // Keep the latest message in view when the pane shrinks (WA notice in the composer, keyboard, rotation).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={scroller}
      role="log"
      aria-label="Isi percakapan"
      onScroll={(e) => {
        const el = e.currentTarget;
        atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"
    >
      {count === 0 && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <span className="mb-2 grid size-11 place-items-center rounded-full bg-soft-gray text-ink">
            <MessageCircle className="size-5" />
          </span>
          <p className="text-body-sm font-semibold text-ink">Belum ada pesan</p>
          <p className="mt-1 max-w-[260px] text-caption text-smoke">{emptyHint}</p>
        </div>
      )}
      {items.map((it) => {
        switch (it.type) {
          case "date":
            return (
              <div key={it.key} className="my-3 flex items-center gap-3 first:mt-0">
                <span className="h-px flex-1 bg-border-gray" />
                <span className="text-micro font-medium text-ash">{it.label}</span>
                <span className="h-px flex-1 bg-border-gray" />
              </div>
            );
          case "system":
            return (
              <p key={it.key} className="mx-auto my-2.5 w-fit max-w-[88%] rounded-[14px] bg-soft-gray px-3 py-1.5 text-center text-caption text-smoke">
                {it.m.text}
                <span className="ml-1.5 whitespace-nowrap text-[10px] text-ash">{formatTime(it.m.at)}</span>
              </p>
            );
          case "wa":
            return (
              <p key={it.key} className="mx-auto my-2 flex w-fit max-w-[88%] items-start gap-1.5 rounded-[12px] border border-border-gray bg-white px-3 py-2 text-caption text-graphite">
                <Info className="mt-px size-3.5 shrink-0 text-ink" aria-hidden />
                <span>{WA_WARNING}</span>
              </p>
            );
          case "bubble":
            return (
              <Bubble
                key={it.key}
                m={it.m}
                side={it.side}
                groupStart={it.groupStart}
                groupEnd={it.groupEnd}
                bookingCode={booking.code}
                name={showNames && it.groupStart ? nameOf(it.m.senderId as ID) : null}
                receipt={readByOtherAt !== null && lastMine?.id === it.m.id ? (readByOtherAt >= it.m.at ? "read" : "sent") : null}
              />
            );
        }
      })}
    </div>
  );
}

function Bubble({
  m,
  side,
  groupStart,
  groupEnd,
  bookingCode,
  name,
  receipt,
}: {
  m: Message;
  side: Side;
  groupStart: boolean;
  groupEnd: boolean;
  bookingCode: string;
  name: string | null;
  receipt: "read" | "sent" | null;
}) {
  const right = side === "right";
  return (
    <div className={cn("flex flex-col", right ? "items-end" : "items-start", groupStart ? "mt-3" : "mt-1")}>
      {name && <span className="mb-1 px-1 text-micro font-medium text-smoke">{name}</span>}
      <div
        className={cn(
          "max-w-[80%] rounded-[18px] sm:max-w-[70%]",
          right ? "bg-ink text-white" : "bg-soft-gray text-ink",
          groupEnd && (right ? "rounded-br-[6px]" : "rounded-bl-[6px]"),
          m.photoId ? "p-1.5" : "px-3.5 py-2",
        )}
      >
        {m.photoId && <EvidencePhoto id={m.photoId} bookingCode={bookingCode} showMeta={false} aspect="aspect-[4/3]" className="w-56 max-w-full" />}
        {m.text && <p className={cn("whitespace-pre-wrap break-words text-body", m.photoId && "px-2 pt-1.5")}>{m.text}</p>}
        <span className={cn("mt-0.5 block text-right text-[10px] leading-tight", right ? "text-white/60" : "text-ash", m.photoId && "px-2 pb-0.5")}>{formatTime(m.at)}</span>
      </div>
      {receipt && (
        <span className="mt-1 inline-flex items-center gap-1 px-1 text-micro text-smoke">
          {receipt === "read" ? <CheckCheck className="size-3.5 text-ink" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
          {receipt === "read" ? "Dibaca" : "Terkirim"}
        </span>
      )}
    </div>
  );
}
