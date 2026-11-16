// Test mode for the v2 scoped snapshot (ROADMAP §4), without a v2 backend: NEXT_PUBLIC_SIMULATE_SCOPED=1 (dev only)
// filters the full v1 snapshot in the browser down to what the given viewer would receive from v2. It follows the
// visibility table plus the P0 items of docs/v2-api-needs.md (referenced public profiles, listings of the viewer's
// bookings, busy date ranges). P1 extras (publicStats, the other party's chatReads) are deliberately left out so
// the UI is tested without them.

import { firstName } from "./format";
import { isReviewVisible } from "./selectors";
import type { BusyRange, DataState, ID, Listing, User } from "./types";

export const SIMULATE_SCOPED = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SIMULATE_SCOPED === "1";

/** ± 250 m grid (FR-S6): 0.0025° latitude ≈ 278 m. */
const roundCoord = (x: number) => Math.round(x / 0.0025) * 0.0025;

function publicProfile(u: User, demoMode: boolean): User {
  return {
    id: u.id,
    name: firstName(u.name),
    nickname: u.nickname,
    role: u.role,
    accountType: u.accountType,
    store: u.store ? { name: u.store.name, areaId: u.store.areaId, hours: u.store.hours } : undefined,
    verification: { status: u.verification.status },
    areaId: u.areaId,
    campus: u.campus,
    studentVerified: u.studentVerified,
    earlyLender: u.earlyLender,
    bio: u.bio,
    joinedAt: u.joinedAt,
    status: u.status,
    baseRating: u.baseRating,
    baseRatingCount: u.baseRatingCount,
    demo: demoMode ? u.demo : undefined,
  };
}

const roundListing = (l: Listing): Listing => ({ ...l, location: { ...l.location, lat: roundCoord(l.location.lat), lng: roundCoord(l.location.lng) } });

/** What a v2 server in `scoped` mode would send to `viewerId` (null = guest). */
export function scopeSnapshot<T extends DataState & { serverNow?: number }>(full: T, viewerId: ID | null, demoMode = true): T {
  const viewer = viewerId ? full.users.find((u) => u.id === viewerId) : undefined;
  if (viewer?.role === "admin") return { ...full, scope: "scoped", viewerId: viewer.id };
  const me = viewer?.id ?? null;
  const now = (full.serverNow ?? Date.now()) + full.clockOffset;
  const today = new Date(now).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

  const bookings = me ? full.bookings.filter((b) => b.renterId === me || b.providerId === me) : [];
  const bookingIds = new Set(bookings.map((b) => b.id));
  const activeOwner = (id: ID) => full.users.find((u) => u.id === id)?.status === "aktif";

  // Listings: public live ones (rounded), all of my own (precise), and the ones my bookings point at (rounded).
  const listingIds = new Set<ID>();
  const listings: Listing[] = [];
  for (const l of full.listings) {
    if (l.ownerId === me) {
      listings.push(l);
      listingIds.add(l.id);
    } else if ((l.status === "aktif" && activeOwner(l.ownerId)) || bookings.some((b) => b.listingId === l.id)) {
      listings.push(roundListing(l));
      listingIds.add(l.id);
    }
  }

  const reviews = full.reviews.filter((r) => r.fromId === me || isReviewVisible(r, full.reviews, now));

  const wanted = full.wanted
    .filter((w) => w.status === "terbuka" || w.requesterId === me)
    .map((w) => ({
      ...w,
      location: w.requesterId === me ? w.location : { lat: roundCoord(w.location.lat), lng: roundCoord(w.location.lng) },
      offers: w.requesterId === me ? w.offers : w.offers.filter((o) => o.providerId === me),
    }));

  // Public profiles of everyone the data above refers to (+ demo personas for the account switcher).
  const referenced = new Set<ID>();
  for (const l of listings) referenced.add(l.ownerId);
  for (const b of bookings) referenced.add(b.renterId).add(b.providerId);
  for (const r of reviews) referenced.add(r.fromId).add(r.toId);
  for (const w of wanted) {
    referenced.add(w.requesterId);
    for (const o of w.offers) referenced.add(o.providerId);
  }
  const users = full.users.flatMap((u) => {
    if (u.id === me) return [u];
    if (referenced.has(u.id) || (demoMode && u.demo)) return [publicProfile(u, demoMode)];
    return [];
  });

  // Busy ranges of every visible listing (other people's bookings, without who).
  const listingBusy: Record<ID, BusyRange[]> = {};
  for (const b of full.bookings) {
    if (!listingIds.has(b.listingId) || !["ACCEPTED", "ACTIVE", "DISPUTED"].includes(b.status) || b.endDate < today) continue;
    (listingBusy[b.listingId] ??= []).push({ start: b.startDate, end: b.endDate, count: 1 });
  }

  const chatReads: Record<string, number> = {};
  for (const [k, v] of Object.entries(full.chatReads)) if (me && k.startsWith(`${me}:`)) chatReads[k] = v;

  return {
    ...full,
    scope: "scoped",
    viewerId: me,
    users,
    listings,
    listingBusy,
    bookings,
    reviews,
    wanted,
    chatReads,
    verifications: full.verifications.filter((v) => v.userId === me),
    photos: full.photos.filter((p) => (p.bookingId ? bookingIds.has(p.bookingId) : p.uploaderId === me)),
    messages: full.messages.filter((m) => bookingIds.has(m.bookingId)),
    disputes: full.disputes.filter((d) => bookingIds.has(d.bookingId)),
    reports: full.reports.filter((r) => r.reporterId === me),
    strikes: full.strikes.filter((s) => s.userId === me),
    notifications: full.notifications.filter((n) => n.userId === me),
    favorites: me && full.favorites[me] ? { [me]: full.favorites[me] } : {},
    audit: [],
  };
}
