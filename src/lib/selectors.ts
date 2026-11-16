// Pure read helpers over DataState. Use them inside components with the raw state, e.g.
//   const state = useAppStore();                       // or pick slices
//   const results = searchListings(state, filters, now);
// Keep them pure (no store access) so pages can memoize with useMemo.

import { AREA_BY_ID } from "./data/areas";
import { CATEGORY_BY_ID } from "./data/categories";
import { firstName } from "./format";
import { distanceKm, withinTwoWayRadius } from "./geo";
import type {
  AccountType,
  Booking,
  BookingStatus,
  BusyRange,
  CategoryId,
  CollateralKind,
  DataState,
  HandoverMethod,
  ID,
  Listing,
  Review,
  SearchPrefs,
  User,
} from "./types";

const D = 86_400_000;

/* ------------------------------------------------------------------ users */

export const findUser = (s: Pick<DataState, "users">, id?: ID) => (id ? s.users.find((u) => u.id === id) : undefined);

/** Public display name (FR-A5: only first name / nickname is shown to other users). */
export const publicName = (u?: User) => (u ? u.nickname ?? firstName(u.name) : "Pengguna");

/** Store name for akun Toko, otherwise the public name. */
export const providerLabel = (u?: User) => (u?.accountType === "toko" && u.store ? u.store.name : publicName(u));

export const isVerified = (u?: User | null) => u?.verification.status === "terverifikasi";

/* ---------------------------------------------------------------- reviews */

/** FR-T2: a review is visible once both sides reviewed, or 7 days after it was written. */
export function isReviewVisible(r: Review, all: Review[], now: number): boolean {
  if (r.visibleAt != null) return now >= r.visibleAt;
  if (now - r.createdAt >= 7 * D) return true;
  return all.some((o) => o.bookingId === r.bookingId && o.fromId !== r.fromId);
}

export function visibleReviews(s: Pick<DataState, "reviews">, now: number, filter: (r: Review) => boolean): Review[] {
  return s.reviews.filter((r) => filter(r) && isReviewVisible(r, s.reviews, now)).sort((a, b) => b.createdAt - a.createdAt);
}

export interface RatingSummary {
  rating: number; // 0 when no ratings
  count: number;
}

function combine(baseRating: number, baseCount: number, live: Review[]): RatingSummary {
  const count = baseCount + live.length;
  if (count === 0) return { rating: 0, count: 0 };
  const sum = baseRating * baseCount + live.reduce((acc, r) => acc + r.rating, 0);
  return { rating: Math.round((sum / count) * 10) / 10, count };
}

export function userRating(s: Pick<DataState, "users" | "reviews">, userId: ID, now: number): RatingSummary {
  const u = findUser(s, userId);
  return combine(u?.baseRating ?? 0, u?.baseRatingCount ?? 0, visibleReviews(s, now, (r) => r.toId === userId));
}

export function listingRating(s: Pick<DataState, "reviews">, listing: Listing, now: number): RatingSummary {
  return combine(listing.baseRating, listing.baseRatingCount, visibleReviews(s, now, (r) => r.listingId === listing.id && r.fromRole === "penyewa"));
}

/** Which snapshot the selectors read from (see DataState.scope). */
type ScopeInfo = Partial<Pick<DataState, "scope" | "viewerId">>;

/**
 * Can aggregates about `userId` be computed from local data? Yes for a full (v1) snapshot, for the viewer's own
 * account (all their bookings are in the snapshot) and for admins. Otherwise other people's bookings are missing
 * and a local count would be silently wrong.
 */
function canComputeFor(s: ScopeInfo & Pick<DataState, "users">, userId: ID): boolean {
  if (s.scope !== "scoped") return true;
  if (userId === s.viewerId) return true;
  return findUser(s, s.viewerId ?? undefined)?.role === "admin";
}

export interface UserStats {
  /** completed rentals (as renter or provider), seeded history included; null = unknown in this snapshot */
  completedRentals: number | null;
  /** 0–100 (FR-T3); null = unknown in this snapshot */
  trustScore: number | null;
}

/** Public reputation numbers. Prefers server aggregates (v2 `publicStats`), never guesses from partial data. */
export function userStats(s: Pick<DataState, "users" | "reviews" | "bookings" | "disputes"> & ScopeInfo, userId: ID, now: number): UserStats {
  const u = findUser(s, userId);
  if (!u) return { completedRentals: null, trustScore: null };
  if (u.publicStats && !canComputeFor(s, userId)) return { completedRentals: u.publicStats.completedRentals, trustScore: u.publicStats.trustScore };
  if (!canComputeFor(s, userId)) return { completedRentals: null, trustScore: null };
  const completed = s.bookings.filter((b) => (b.renterId === userId || b.providerId === userId) && b.status === "COMPLETED").length + (u.baseRatingCount ?? 0);
  const disputes = s.disputes.filter((d) => {
    const b = s.bookings.find((x) => x.id === d.bookingId);
    return b && (b.renterId === userId || b.providerId === userId);
  }).length;
  const { rating, count } = userRating(s, userId, now);
  let score = 40;
  if (u.verification.status === "terverifikasi") score += 20;
  if (count) score += (rating - 3) * 12;
  score += Math.min(15, completed);
  score -= disputes * 4 + (u.strikes ?? 0) * 10;
  return { completedRentals: completed, trustScore: Math.max(0, Math.min(100, Math.round(score))) };
}

/** Simple trust score (P1): rating, completed rentals, disputes, strikes → 0–100. null when unknown (scoped snapshot). */
export function trustScore(s: Pick<DataState, "users" | "reviews" | "bookings" | "disputes"> & ScopeInfo, userId: ID, now: number): number | null {
  return userStats(s, userId, now).trustScore;
}

/** Strike count shown on a public profile: only when this snapshot carries it (own/admin/full, or server says public). */
export function publicStrikes(s: Pick<DataState, "users"> & ScopeInfo, userId: ID): number | null {
  const u = findUser(s, userId);
  if (!u) return null;
  if (u.strikes != null) return u.strikes;
  return u.publicStats?.strikes ?? null;
}

/* --------------------------------------------------------------- listings */

export interface ListingFilters {
  q?: string;
  category?: CategoryId;
  minPrice?: number;
  maxPrice?: number;
  handover?: HandoverMethod;
  /** "cukup-identitas" = at least one option is identity only (e.g. "cukup titip KTM") */
  collateral?: CollateralKind | "cukup-identitas";
  providerType?: AccountType;
  /** availability window */
  start?: string;
  end?: string;
  sort?: "jarak" | "harga-naik" | "harga-turun" | "rating" | "terbaru";
}

export interface ListingHit {
  listing: Listing;
  owner?: User;
  distanceKm: number;
  rating: RatingSummary;
  /** true when hidden only because of the provider's reach radius (two-way rule) */
  outsideProviderReach?: boolean;
}

const norm = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

type BusyInput = Pick<DataState, "bookings"> & Partial<Pick<DataState, "listingBusy" | "users">> & ScopeInfo;

/**
 * Committed date ranges of a listing (ACCEPTED/ACTIVE), oldest first. Uses the server's `listingBusy` when present.
 * null = unknown: in a scoped snapshot other renters' bookings are not visible, so the server decides.
 */
export function busyRanges(s: BusyInput, listing: Listing): BusyRange[] | null {
  const server = s.listingBusy?.[listing.id];
  if (server) return [...server].sort((a, b) => a.start.localeCompare(b.start));
  if (s.listingBusy) return [];
  // The provider (or an admin) sees every booking of their own listing even in a scoped snapshot.
  if (s.scope === "scoped" && listing.ownerId !== s.viewerId && findUser({ users: s.users ?? [] }, s.viewerId ?? undefined)?.role !== "admin") return null;
  return s.bookings
    .filter((b) => b.listingId === listing.id && (b.status === "ACCEPTED" || b.status === "ACTIVE"))
    .map((b) => ({ start: b.startDate, end: b.endDate, count: 1 }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Is the listing free for [start, end]? Stock-aware (FR-R4). Unknown availability counts as free (server checks). */
export function isAvailable(s: BusyInput, listing: Listing, start: string, end: string): boolean {
  const ranges = busyRanges(s, listing);
  if (!ranges) return true;
  const busy = ranges.filter((r) => r.start <= end && start <= r.end).reduce((n, r) => n + r.count, 0);
  return busy < listing.stock;
}

/** Owner status; a scoped snapshot may leave it out for public profiles (the server only sends live listings then). */
const ownerActive = (s: Pick<DataState, "users">, ownerId: ID) => {
  const u = findUser(s, ownerId);
  return !u || !u.status || u.status === "aktif";
};

/** Listings that are live and owned by an active user. */
export const liveListings = (s: Pick<DataState, "listings" | "users">) => s.listings.filter((l) => l.status === "aktif" && ownerActive(s, l.ownerId));

export function distanceTo(listing: Listing, search: Pick<SearchPrefs, "point">) {
  return distanceKm(search.point, listing.location);
}

/**
 * Search with the two-way radius rule (FR-S3) and filters (FR-S4).
 * Returns visible hits plus how many matches were hidden only by the provider's reach.
 */
export function searchListings(
  s: Pick<DataState, "listings" | "users" | "reviews" | "bookings" | "search"> & Partial<Pick<DataState, "listingBusy">> & ScopeInfo,
  filters: ListingFilters,
  now: number,
  search: SearchPrefs = s.search,
): { hits: ListingHit[]; hiddenByProviderReach: number; outsideSearchRadius: number } {
  const q = filters.q ? norm(filters.q.trim()) : "";
  let hiddenByProviderReach = 0;
  let outsideSearchRadius = 0;
  const hits: ListingHit[] = [];
  for (const listing of liveListings(s)) {
    if (filters.category && listing.category !== filters.category) continue;
    if (q) {
      const hay = norm(`${listing.title} ${listing.description} ${CATEGORY_BY_ID[listing.category]?.name ?? ""} ${CATEGORY_BY_ID[listing.category]?.examples ?? ""}`);
      if (!q.split(/\s+/).every((w) => hay.includes(w))) continue;
    }
    if (filters.minPrice != null && listing.pricePerDay < filters.minPrice) continue;
    if (filters.maxPrice != null && listing.pricePerDay > filters.maxPrice) continue;
    if (filters.handover && !listing.handover.includes(filters.handover)) continue;
    if (filters.collateral === "cukup-identitas" && !listing.collateralOptions.some((o) => o.kind === "identitas")) continue;
    if (filters.collateral && filters.collateral !== "cukup-identitas" && !listing.collateralOptions.some((o) => o.kind === filters.collateral)) continue;
    const owner = findUser(s, listing.ownerId);
    if (filters.providerType && owner?.accountType !== filters.providerType) continue;
    if (filters.start && filters.end && !isAvailable(s, listing, filters.start, filters.end)) continue;
    const d = distanceKm(search.point, listing.location);
    if (d > search.radiusKm) {
      outsideSearchRadius++;
      continue;
    }
    if (!withinTwoWayRadius(d, search.radiusKm, listing.radiusKm)) {
      hiddenByProviderReach++;
      continue;
    }
    hits.push({ listing, owner, distanceKm: d, rating: listingRating(s, listing, now) });
  }
  const relevance = (h: ListingHit) => (q && norm(h.listing.title).includes(q) ? 0 : 1);
  const sort = filters.sort ?? "jarak";
  hits.sort((a, b) => {
    switch (sort) {
      case "harga-naik":
        return a.listing.pricePerDay - b.listing.pricePerDay;
      case "harga-turun":
        return b.listing.pricePerDay - a.listing.pricePerDay;
      case "rating":
        return b.rating.rating - a.rating.rating;
      case "terbaru":
        return b.listing.createdAt - a.listing.createdAt;
      default:
        // FR-S4: default order = distance, then relevance
        return Math.round(a.distanceKm * 2) - Math.round(b.distanceKm * 2) || relevance(a) - relevance(b) || a.distanceKm - b.distanceKm;
    }
  });
  return { hits, hiddenByProviderReach, outsideSearchRadius };
}

export const areaLabel = (listing: Listing) => AREA_BY_ID[listing.location.areaId]?.name ?? "";

/* --------------------------------------------------------------- bookings */

export type BookingRole = "penyewa" | "penyedia";

export const bookingRole = (b: Booking, userId?: ID | null): BookingRole | null =>
  userId === b.renterId ? "penyewa" : userId === b.providerId ? "penyedia" : null;

export const STATUS_LABEL: Record<BookingStatus, string> = {
  REQUESTED: "Menunggu persetujuan",
  ACCEPTED: "Disetujui",
  ACTIVE: "Sedang disewa",
  RETURNED: "Sudah kembali",
  COMPLETED: "Selesai",
  DECLINED: "Ditolak",
  EXPIRED: "Kadaluarsa",
  CANCELLED: "Dibatalkan",
  DISPUTED: "Dalam sengketa",
  RESOLVED: "Sengketa selesai",
};

/** Happy-path order for the status timeline (PRD 8.3). */
export const STATUS_FLOW: BookingStatus[] = ["REQUESTED", "ACCEPTED", "ACTIVE", "RETURNED", "COMPLETED"];

export const isOpenBooking = (b: Booking) => ["REQUESTED", "ACCEPTED", "ACTIVE", "RETURNED", "DISPUTED"].includes(b.status);

/** What the given user must do next on this booking (for "perlu tindakan" badges). null = nothing. */
export function nextAction(b: Booking, userId: ID, reviews: Review[]): string | null {
  const role = bookingRole(b, userId);
  if (!role) return null;
  switch (b.status) {
    case "REQUESTED":
      return role === "penyedia" ? "Setujui atau tolak request" : null;
    case "ACCEPTED":
      if (!b.checkout) return role === "penyedia" ? "Foto serah terima (barang + jaminan)" : b.payment.status === "belum" ? "Bayar via Sewain (simulasi)" : null;
      if (role === "penyewa" && !b.checkout.renterAgreedAt) return "Cek & setujui kondisi barang";
      if (role === "penyedia" && !b.checkout.providerAgreedAt) return "Setujui kondisi barang";
      return null;
    case "ACTIVE":
      return role === "penyedia" ? (b.overdue ? "Barang telat — hubungi penyewa" : null) : b.overdue ? "Segera kembalikan barang" : null;
    case "RETURNED":
      if (role === "penyedia" && !b.collateralReturn?.providerReturnedAt) return "Kembalikan jaminan penyewa";
      if (role === "penyewa" && b.collateralReturn?.providerReturnedAt && !b.collateralReturn.renterConfirmedAt) return "Konfirmasi jaminan diterima";
      return null;
    case "COMPLETED":
    case "RESOLVED":
      if (b.status === "RESOLVED" && role === "penyedia" && !b.collateralReturn?.providerReturnedAt) return "Kembalikan sisa jaminan";
      if (b.status === "RESOLVED" && role === "penyewa" && b.collateralReturn?.providerReturnedAt && !b.collateralReturn.renterConfirmedAt) return "Konfirmasi jaminan diterima";
      return reviews.some((r) => r.bookingId === b.id && r.fromId === userId) ? null : "Beri rating";
    case "DISPUTED":
      return "Tanggapi sengketa";
    default:
      return null;
  }
}

export function unreadNotifications(s: Pick<DataState, "notifications">, userId?: ID | null): number {
  if (!userId) return 0;
  return s.notifications.filter((n) => n.userId === userId && !n.read).length;
}

export function unreadMessages(s: Pick<DataState, "messages" | "chatReads" | "bookings">, userId: ID, bookingId: ID): number {
  const last = s.chatReads[`${userId}:${bookingId}`] ?? 0;
  return s.messages.filter((m) => m.bookingId === bookingId && m.senderId !== userId && m.senderId !== "system" && m.at > last).length;
}

export function totalUnreadMessages(s: Pick<DataState, "messages" | "chatReads" | "bookings">, userId?: ID | null): number {
  if (!userId) return 0;
  return s.bookings.filter((b) => b.renterId === userId || b.providerId === userId).reduce((acc, b) => acc + unreadMessages(s, userId, b.id), 0);
}

/** Keyword filter for listings (FR-L4). Returns the banned words found. */
export function bannedWordsIn(text: string, banned: string[]): string[] {
  const t = ` ${norm(text).replace(/[^a-z0-9]+/g, " ")} `;
  return banned.filter((w) => t.includes(` ${norm(w)} `));
}
