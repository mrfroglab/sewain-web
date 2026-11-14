// Builds the inbox rows: every booking of the user that has messages or is still open, newest activity first.

import { isOpenBooking, unreadMessages } from "@/lib/selectors";
import type { Booking, DataState, ID, Listing, Message, User } from "@/lib/types";

export interface Thread {
  booking: Booking;
  listing?: Listing;
  other?: User;
  role: "penyewa" | "penyedia";
  last?: Message;
  lastAt: number;
  unread: number;
}

export function buildThreads(s: Pick<DataState, "bookings" | "messages" | "listings" | "users" | "chatReads">, userId: ID): Thread[] {
  const byBooking = new Map<ID, Message[]>();
  for (const m of s.messages) {
    const list = byBooking.get(m.bookingId);
    if (list) list.push(m);
    else byBooking.set(m.bookingId, [m]);
  }
  const threads: Thread[] = [];
  for (const b of s.bookings) {
    const role = b.renterId === userId ? "penyewa" : b.providerId === userId ? "penyedia" : null;
    if (!role) continue;
    const msgs = byBooking.get(b.id) ?? [];
    if (!msgs.length && !isOpenBooking(b)) continue;
    const last = msgs.reduce<Message | undefined>((acc, m) => (!acc || m.at >= acc.at ? m : acc), undefined);
    threads.push({
      booking: b,
      listing: s.listings.find((l) => l.id === b.listingId),
      other: s.users.find((u) => u.id === (role === "penyewa" ? b.providerId : b.renterId)),
      role,
      last,
      lastAt: last?.at ?? b.createdAt,
      unread: unreadMessages(s, userId, b.id),
    });
  }
  return threads.sort((a, b) => b.lastAt - a.lastAt);
}
