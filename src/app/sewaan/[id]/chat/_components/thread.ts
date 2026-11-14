// Pure helpers for the booking chat (PRD 9.6): WhatsApp/phone detection (FR-C1) and turning the flat
// message list into render items (date separators, sender groups, read receipts).

import { formatDate, isoDate } from "@/lib/format";
import type { ID, Message } from "@/lib/types";

/** FR-C1: moving to WhatsApp is allowed, but we warn that off-platform evidence can't be used by the mediator. */
export const WA_WARNING = "Boleh pindah ke WhatsApp, tapi bukti di luar Sewain tidak bisa dipakai mediator.";

const WA_PATTERNS = [
  /wa\.me/i,
  /whats\s*app/i,
  /\bwa\b/i, // "WA aja", "chat WA", but not "bawa"
  /(?:\+?62|\b0)[\s.-]?8(?:[\s.-]?\d){7,11}\b/, // 0812-3456-7890, +62 812 3456 7890, 6281234567890
];

export const mentionsWhatsApp = (text?: string) => !!text && WA_PATTERNS.some((re) => re.test(text));

export const QUICK_REPLIES = ["Sudah sampai di titik temu", "Otw 5 menit", "Barang sudah siap"] as const;

export type Side = "left" | "right";

export type ThreadItem =
  | { type: "date"; key: string; label: string }
  | { type: "system"; key: string; m: Message }
  | { type: "bubble"; key: string; m: Message; side: Side; groupStart: boolean; groupEnd: boolean }
  | { type: "wa"; key: string };

const GROUP_GAP = 5 * 60_000;

function dateLabel(at: number, now: number): string {
  const day = isoDate(at);
  const sameYear = new Date(at).getFullYear() === new Date(now).getFullYear();
  if (day === isoDate(now)) return `Hari ini · ${formatDate(day)}`;
  if (day === isoDate(now - 86_400_000)) return `Kemarin · ${formatDate(day)}`;
  return formatDate(day, !sameYear);
}

/**
 * @param rightId whose messages sit on the right (the viewer; for the admin mediator: the provider).
 */
export function buildThread(messages: Message[], rightId: ID, now: number): ThreadItem[] {
  const items: ThreadItem[] = [];
  let prev: Message | undefined;
  let prevDay = "";
  messages.forEach((m, i) => {
    const day = isoDate(m.at);
    if (day !== prevDay) {
      items.push({ type: "date", key: `d-${day}`, label: dateLabel(m.at, now) });
      prevDay = day;
      prev = undefined;
    }
    if (m.senderId === "system") {
      items.push({ type: "system", key: m.id, m });
      prev = m;
      return;
    }
    const next = messages[i + 1];
    const sameAs = (o?: Message) => !!o && o.senderId === m.senderId && Math.abs(o.at - m.at) < GROUP_GAP && isoDate(o.at) === day;
    const wa = mentionsWhatsApp(m.text);
    items.push({ type: "bubble", key: m.id, m, side: m.senderId === rightId ? "right" : "left", groupStart: !sameAs(prev), groupEnd: wa || !sameAs(next) });
    if (wa) items.push({ type: "wa", key: `wa-${m.id}` });
    // A warning between two bubbles breaks the group so the next bubble gets its own spacing.
    prev = wa ? undefined : m;
  });
  return items;
}
