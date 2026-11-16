"use client";

// The prototype has no backend: this store *is* the backend. Every flow in PRD 7.2 runs here for real
// (state machine, agreements, collateral, disputes, admin settings) and is persisted to localStorage.
// Photo blobs live in IndexedDB (lib/photos.ts). Other tabs stay in sync through the "storage" event,
// so a juri can open the renter in one window and the provider in another.

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { AREA_BY_ID } from "./data/areas";
import { CATEGORY_BY_ID } from "./data/categories";
import { DATA_VERSION, createSeed } from "./data/seed";
import { endOfDay, firstName, isoDate, rupiah } from "./format";
import { collateralValue, computeCommission, depositCash, describeCollateral, quoteRent } from "./pricing";
import { connectEvents, detectApi, fetchState, isOnline, reconnectEvents, useApiStatus } from "./api";
import { loadConfig, useAppConfig } from "./config";
import { blockingCount, enqueueAction, flushOutbox, pendingEntries, startOutbox } from "./outbox";
import { SIMULATE_SCOPED, scopeSnapshot } from "./scope";
import { sha256Text } from "./sha256";
import { toast } from "./toast";
import type {
  AccountType,
  AppNotification,
  AreaId,
  AuditEntry,
  Booking,
  CollateralRules,
  CommissionConfig,
  DataState,
  DisputeCase,
  DisputeProposal,
  GeoPoint,
  HandoverMethod,
  ID,
  Listing,
  NotificationKind,
  PaymentMethod,
  PhotoRecord,
  ProposalType,
  Report,
  SearchPrefs,
  StoreInfo,
  User,
  UserStatus,
  VerificationMethod,
  WantedPost,
} from "./types";

export const STORAGE_KEY = "sewain-demo";
export const ADMIN_ID = "u-admin";
const H = 3_600_000;

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------ action API */

export type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
const fail = (error: string): Result<never> => ({ ok: false, error });

export interface NewListingInput {
  title: string;
  category: Listing["category"];
  description: string;
  photos: string[];
  conditionNotes: string;
  pricePerDay: number;
  pricePerHour?: number;
  pricePerWeek?: number;
  durationDiscount?: Listing["durationDiscount"];
  minDays?: number;
  maxDays?: number;
  itemValue: number;
  collateralOptions: Listing["collateralOptions"];
  location: Listing["location"];
  radiusKm: number;
  handover: HandoverMethod[];
  meetingPoint?: string;
  handoverHours?: string;
  rules: Listing["rules"];
  approval: Listing["approval"];
  autoApproveMinRating?: number;
  stock: number;
  vehicle?: Listing["vehicle"];
}

export interface NewBookingInput {
  listingId: ID;
  startDate: string;
  endDate: string;
  handover: HandoverMethod;
  collateralOptionId: ID;
  note?: string;
}

export interface Actions {
  /* demo */
  now: () => number;
  resetDemo: () => void;
  advanceClock: (ms: number) => void;
  resetClock: () => void;
  /** Runs time-based transitions: EXPIRED, OVERDUE flag, 48h auto-complete, L1 → L2 escalation. */
  tick: () => void;

  /* accounts & verification */
  registerUser: (input: { name: string; phone: string; email?: string; accountType: AccountType; store?: StoreInfo; areaId: AreaId }) => Result<ID>;
  updateUser: (userId: ID, patch: Partial<Pick<User, "name" | "nickname" | "email" | "bio" | "areaId" | "accountType" | "store" | "campus">>) => void;
  /** Simulated eKYC (prototype): approves instantly, records a request in the admin queue. */
  submitVerification: (userId: ID, input: { method: VerificationMethod; nameOnKtp: string; nik: string; ktpPhotoId?: ID; selfiePhotoId?: ID }) => Result<ID>;
  reviewVerification: (adminId: ID, requestId: ID, approve: boolean, reason?: string) => Result;

  /* listings */
  createListing: (ownerId: ID, input: NewListingInput) => Result<ID>;
  updateListing: (actorId: ID, listingId: ID, patch: Partial<NewListingInput>) => Result;
  setListingStatus: (actorId: ID, listingId: ID, status: Listing["status"]) => Result;
  toggleFavorite: (userId: ID, listingId: ID) => void;
  setSearch: (patch: Partial<SearchPrefs>) => void;

  /* booking lifecycle (PRD 8.3) */
  createBooking: (renterId: ID, input: NewBookingInput) => Result<ID>;
  acceptBooking: (providerId: ID, bookingId: ID, meetingPointDetail?: string) => Result;
  declineBooking: (providerId: ID, bookingId: ID, reason: string) => Result;
  cancelBooking: (actorId: ID, bookingId: ID, reason: string) => Result;
  payBooking: (renterId: ID, bookingId: ID, method: PaymentMethod) => Result;
  submitCheckout: (actorId: ID, bookingId: ID, input: { photoIds: ID[]; collateralPhotoIds: ID[]; odometer?: string; fuel?: string }) => Result;
  addCheckoutPhotos: (actorId: ID, bookingId: ID, photoIds: ID[]) => Result;
  agreeCheckout: (actorId: ID, bookingId: ID) => Result;
  /** Renter reports "barang tidak sesuai deskripsi" at check-out → cancel without penalty (PRD 11.3). */
  rejectAtCheckout: (renterId: ID, bookingId: ID, note: string) => Result;
  submitCheckin: (actorId: ID, bookingId: ID, input: { photoIds: ID[]; result: "sesuai" | "masalah"; problemType?: string; problemNote?: string; problemPhotoIds?: ID[]; odometer?: string; fuel?: string }) => Result;
  returnCollateral: (providerId: ID, bookingId: ID) => Result;
  confirmCollateral: (renterId: ID, bookingId: ID) => Result;
  submitReview: (fromId: ID, bookingId: ID, rating: number, comment: string) => Result;

  /* chat */
  sendMessage: (senderId: ID, bookingId: ID, input: { text?: string; photoId?: ID }) => Result;
  markThreadRead: (userId: ID, bookingId: ID) => void;

  /* photos (metadata; blobs are in IndexedDB) */
  addPhotos: (records: PhotoRecord[]) => void;

  /* disputes (PRD 11) */
  openDispute: (actorId: ID, bookingId: ID, input: { caseType: DisputeCase; description: string; photoIds: ID[] }) => Result<ID>;
  proposeSolution: (actorId: ID, disputeId: ID, input: { type: ProposalType; amount?: number; note?: string }) => Result;
  respondProposal: (actorId: ID, disputeId: ID, proposalId: ID, accept: boolean) => Result;
  escalateDispute: (actorId: ID, disputeId: ID) => Result;
  adminRecommend: (adminId: ID, disputeId: ID, input: { text: string; amount?: number }) => Result;
  resolveDispute: (adminId: ID, disputeId: ID, outcome: string) => Result;

  /* reports & moderation */
  createReport: (reporterId: ID, input: { targetType: Report["targetType"]; targetId: ID; reason: string; detail?: string }) => Result<ID>;
  resolveReport: (adminId: ID, reportId: ID, status: "ditindak" | "ditolak", resolution: string) => Result;
  addStrike: (adminId: ID, userId: ID, input: { reason: string; severity: "ringan" | "berat"; bookingId?: ID }) => Result;
  setUserStatus: (adminId: ID, userId: ID, status: UserStatus, reason: string) => Result;

  /* admin settings */
  updateCommission: (adminId: ID, patch: Partial<Omit<CommissionConfig, "updatedAt" | "updatedBy">>) => Result;
  updateCollateralRules: (adminId: ID, patch: Partial<Omit<CollateralRules, "updatedAt" | "updatedBy">>) => Result;
  setBannedKeywords: (adminId: ID, keywords: string[]) => Result;

  /* wanted board (P1) */
  createWanted: (requesterId: ID, input: { title: string; description: string; category?: WantedPost["category"]; areaId: AreaId; radiusKm: number; neededFrom?: string; neededUntil?: string; budgetPerDay?: number }) => Result<ID>;
  offerWanted: (providerId: ID, wantedId: ID, input: { listingId?: ID; message: string }) => Result;
  closeWanted: (requesterId: ID, wantedId: ID, status: "terpenuhi" | "ditutup") => Result;

  /* notifications */
  markNotificationsRead: (userId: ID, ids?: ID[]) => void;
}

export type AppState = DataState & Actions & { hydrated: boolean };

/* --------------------------------------------------------------- helpers */

const EMPTY: DataState = {
  version: DATA_VERSION,
  seeded: false,
  seedBase: 0,
  clockOffset: 0,
  users: [],
  verifications: [],
  listings: [],
  bookings: [],
  photos: [],
  messages: [],
  reviews: [],
  reports: [],
  disputes: [],
  strikes: [],
  commission: { active: false, mode: "persen", percent: 10, flat: 3000, bearer: "penyewa", splitRenterPercent: 50, updatedAt: 0, updatedBy: ADMIN_ID },
  collateralRules: { lowMax: 500_000, midMax: 2_000_000, midDepositPercent: 25, highDepositPercent: 40, vehicleDepositPercent: 30, highValueBadge: 2_000_000, updatedAt: 0, updatedBy: ADMIN_ID },
  bannedKeywords: [],
  audit: [],
  wanted: [],
  notifications: [],
  favorites: {},
  chatReads: {},
  search: { origin: "area", areaId: "ugm", point: { lat: AREA_BY_ID.ugm.lat, lng: AREA_BY_ID.ugm.lng }, radiusKm: 3 },
  bookingCounter: 100,
  scope: "full",
  viewerId: null,
  listingBusy: undefined,
};

const pickData = (s: AppState): DataState => {
  const { hydrated: _h, ...rest } = s;
  const data: Partial<DataState> = {};
  for (const key of Object.keys(EMPTY) as (keyof DataState)[]) (data as Record<string, unknown>)[key] = rest[key];
  return data as DataState;
};

const publicName = (u?: User) => (u ? u.nickname ?? firstName(u.name) : "Pengguna");

/* ----------------------------------------------------------------- store */

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const now = () => Date.now() + get().clockOffset;
      const user = (id: ID) => get().users.find((u) => u.id === id);
      const booking = (id: ID) => get().bookings.find((b) => b.id === id);
      const listing = (id: ID) => get().listings.find((l) => l.id === id);

      const notify = (userId: ID, kind: NotificationKind, title: string, body: string, href?: string): AppNotification => ({
        id: uid("n"),
        userId,
        kind,
        title,
        body,
        href,
        at: now(),
        read: false,
      });
      const sysMsg = (bookingId: ID, text: string) => ({ id: uid("m"), bookingId, senderId: "system" as const, text, at: now() });
      const auditEntry = (actorId: ID, action: string, target: string, oldValue?: string, newValue?: string): AuditEntry => ({
        id: uid("a"),
        actorId,
        action,
        target,
        oldValue,
        newValue,
        at: now(),
      });
      const patchBooking = (id: ID, patch: Partial<Booking>) =>
        set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
      const push = (patch: { notifications?: AppNotification[]; messages?: ReturnType<typeof sysMsg>[]; audit?: AuditEntry[] }) =>
        set((s) => ({
          notifications: patch.notifications ? [...patch.notifications, ...s.notifications] : s.notifications,
          messages: patch.messages ? [...s.messages, ...patch.messages] : s.messages,
          audit: patch.audit ? [...patch.audit, ...s.audit] : s.audit,
        }));
      const href = (b: Booking) => `/sewaan/${b.id}`;
      const titleOf = (b: Booking) => listing(b.listingId)?.title ?? "barang";
      const isActor = (b: Booking, actorId: ID, role: "renter" | "provider" | "any") =>
        role === "any" ? b.renterId === actorId || b.providerId === actorId : role === "renter" ? b.renterId === actorId : b.providerId === actorId;
      const isAdmin = (id: ID) => user(id)?.role === "admin";
      const canTransact = (id: ID): Result => {
        const u = user(id);
        if (!u) return fail("Akun tidak ditemukan.");
        if (u.status !== "aktif") return fail(`Akun sedang ${u.status === "suspend" ? "ditangguhkan" : "diblokir"}.`);
        if (u.verification.status !== "terverifikasi") return fail("Verifikasi KTP + selfie dulu sebelum menyewa atau menyewakan.");
        return ok(undefined);
      };

      return {
        ...EMPTY,
        hydrated: false,
        now,

        /* ------------------------------------------------------------- demo */
        resetDemo: () => set({ ...createSeed(Date.now()) }),
        advanceClock: (ms) => {
          set((s) => ({ clockOffset: s.clockOffset + ms }));
          get().tick();
        },
        resetClock: () => set({ clockOffset: 0 }),
        tick: () => {
          const t = now();
          const s = get();
          const notifications: AppNotification[] = [];
          const messages: ReturnType<typeof sysMsg>[] = [];
          let changed = false;
          const bookings = s.bookings.map((b) => {
            if (b.status === "REQUESTED" && t >= b.expiresAt) {
              changed = true;
              notifications.push(notify(b.renterId, "booking", "Request kadaluarsa", `${titleOf(b)}: penyedia tidak merespons dalam 24 jam. Coba barang lain di sekitarmu.`, href(b)));
              notifications.push(notify(b.providerId, "booking", "Request kadaluarsa", `Request untuk ${titleOf(b)} kadaluarsa karena tidak direspons 24 jam.`, href(b)));
              messages.push(sysMsg(b.id, "Request kadaluarsa: tidak direspons dalam 24 jam."));
              return { ...b, status: "EXPIRED" as const };
            }
            if ((b.status === "ACTIVE" || b.status === "DISPUTED") && !b.overdue && !b.returnedAt && t > endOfDay(b.endDate)) {
              changed = true;
              notifications.push(notify(b.renterId, "booking", "Kamu telat mengembalikan barang", `${titleOf(b)} seharusnya kembali ${b.endDate}. Denda ${rupiah(b.agreement.lateFeePerDay)}/hari berlaku.`, href(b)));
              notifications.push(notify(b.providerId, "booking", "Booking telat dikembalikan", `${titleOf(b)} sudah lewat tanggal kembali.`, href(b)));
              messages.push(sysMsg(b.id, "Tanggal kembali sudah lewat. Booking ditandai TELAT. Denda per hari berlaku sesuai kesepakatan."));
              return { ...b, overdue: true };
            }
            if (b.status === "RETURNED" && b.collateralReturn?.autoCompleteAt && !b.collateralReturn.renterConfirmedAt && t >= b.collateralReturn.autoCompleteAt) {
              changed = true;
              notifications.push(notify(b.renterId, "booking", "Sewa selesai otomatis", `${titleOf(b)}: tidak ada konfirmasi jaminan dalam 48 jam, status otomatis selesai. Beri rating, yuk.`, href(b)));
              notifications.push(notify(b.providerId, "booking", "Sewa selesai", `${titleOf(b)} selesai otomatis setelah 48 jam.`, href(b)));
              messages.push(sysMsg(b.id, "Penyewa tidak merespons dalam 48 jam. Status otomatis SELESAI."));
              return { ...b, status: "COMPLETED" as const, completedAt: t, completedAuto: true };
            }
            return b;
          });
          const disputes = s.disputes.map((d) => {
            if (d.status === "negosiasi" && t >= d.l1Deadline) {
              changed = true;
              const b = s.bookings.find((x) => x.id === d.bookingId);
              notifications.push(notify(ADMIN_ID, "sengketa", "Sengketa naik ke mediasi", `${b ? titleOf(b) : "Booking"}: negosiasi 48 jam berakhir tanpa kesepakatan.`, `/admin/sengketa/${d.id}`));
              if (b) messages.push(sysMsg(b.id, "Batas negosiasi 48 jam habis. Sengketa otomatis naik ke mediasi admin (L2)."));
              return { ...d, layer: "L2" as const, status: "mediasi" as const };
            }
            return d;
          });
          if (changed) {
            set({ bookings, disputes });
            push({ notifications, messages });
          }
        },

        /* ------------------------------------------------- accounts & KYC */
        registerUser: (input) => {
          const phone = input.phone.replace(/\D/g, "");
          if (get().users.some((u) => u.phone === phone)) return fail("Nomor HP sudah terdaftar. Masuk pakai nomor itu.");
          const id = uid("u");
          const u: User = {
            id,
            name: input.name.trim(),
            phone,
            email: input.email,
            role: "user",
            accountType: input.accountType,
            store: input.store,
            verification: { status: "belum" },
            areaId: input.areaId,
            joinedAt: now(),
            strikes: 0,
            status: "aktif",
          };
          set((s) => ({ users: [...s.users, u] }));
          push({ notifications: [notify(id, "verifikasi", "Selamat datang di Sewain!", "Verifikasi KTP + selfie dulu supaya bisa menyewa dan menyewakan.", "/verifikasi")] });
          return ok(id);
        },
        updateUser: (userId, patch) => set((s) => ({ users: s.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)) })),
        submitVerification: (userId, input) => {
          const u = user(userId);
          if (!u) return fail("Akun tidak ditemukan.");
          const nik = input.nik.replace(/\D/g, "");
          const nikMasked = nik.length >= 8 ? `${nik.slice(0, 4)}${"*".repeat(nik.length - 8)}${nik.slice(-4)}` : nik;
          // FR-A3: one NIK = one account (prototype compares the masked NIK of seeded users).
          const dupe = get().users.find((x) => x.id !== userId && x.verification.nikMasked === nikMasked && nik.length >= 8);
          if (dupe) return fail("NIK ini sudah dipakai akun lain. Satu NIK hanya untuk satu akun.");
          const blacklisted = get().users.some((x) => x.status === "blacklist" && x.verification.nikMasked === nikMasked);
          if (blacklisted) return fail("NIK ini diblokir dari Sewain.");
          const t = now();
          const id = uid("v");
          set((s) => ({
            verifications: [
              { id, userId, submittedAt: t, method: input.method, nameOnKtp: input.nameOnKtp.toUpperCase(), nikMasked, ktpPhotoId: input.ktpPhotoId, selfiePhotoId: input.selfiePhotoId, status: "disetujui", reviewedAt: t, auto: true },
              ...s.verifications,
            ],
            users: s.users.map((x) => (x.id === userId ? { ...x, verification: { status: "terverifikasi", method: input.method, verifiedAt: t, nikMasked } } : x)),
          }));
          push({ notifications: [notify(userId, "verifikasi", "Identitas terverifikasi", "Sekarang kamu bisa menyewa dan menyewakan barang.", "/profil")] });
          return ok(id);
        },
        reviewVerification: (adminId, requestId, approve, reason) => {
          if (!isAdmin(adminId)) return fail("Hanya admin.");
          const req = get().verifications.find((v) => v.id === requestId);
          if (!req) return fail("Pengajuan tidak ditemukan.");
          const t = now();
          set((s) => ({
            verifications: s.verifications.map((v) => (v.id === requestId ? { ...v, status: approve ? "disetujui" : "ditolak", reviewedAt: t, reviewedBy: adminId, reason } : v)),
            users: s.users.map((u) =>
              u.id === req.userId ? { ...u, verification: { ...u.verification, status: approve ? "terverifikasi" : "ditolak", method: "manual", verifiedAt: approve ? t : undefined, nikMasked: req.nikMasked } } : u,
            ),
          }));
          push({
            notifications: [notify(req.userId, "verifikasi", approve ? "Identitas terverifikasi" : "Verifikasi ditolak", approve ? "Akunmu sudah terverifikasi oleh admin." : `Alasan: ${reason ?? "-"}. Silakan ulangi verifikasi.`, approve ? "/profil" : "/verifikasi")],
            audit: [auditEntry(adminId, approve ? "verifikasi.setuju" : "verifikasi.tolak", publicName(user(req.userId)), undefined, reason)],
          });
          return ok(undefined);
        },

        /* --------------------------------------------------------- listings */
        createListing: (ownerId, input) => {
          const can = canTransact(ownerId);
          if (!can.ok) return can;
          const owner = user(ownerId)!;
          const id = uid("l");
          const l: Listing = {
            ...input,
            id,
            slug: id,
            ownerId,
            stock: owner.accountType === "toko" ? Math.max(1, input.stock) : 1,
            status: "aktif",
            createdAt: now(),
            baseRating: 0,
            baseRatingCount: 0,
            rentCount: 0,
          };
          set((s) => ({ listings: [l, ...s.listings] }));
          // Wanted board: notify requesters whose need matches this category nearby (P1).
          const matches = get().wanted.filter((w) => w.status === "terbuka" && w.category === l.category && w.requesterId !== ownerId);
          push({ notifications: matches.map((w) => notify(w.requesterId, "papan", "Ada barang baru yang cocok", `${l.title} baru saja disewakan di dekatmu.`, `/barang/${id}`)) });
          return ok(id);
        },
        updateListing: (actorId, listingId, patch) => {
          const l = listing(listingId);
          if (!l) return fail("Listing tidak ditemukan.");
          if (l.ownerId !== actorId && !isAdmin(actorId)) return fail("Bukan listing milikmu.");
          set((s) => ({ listings: s.listings.map((x) => (x.id === listingId ? { ...x, ...patch } : x)) }));
          return ok(undefined);
        },
        setListingStatus: (actorId, listingId, status) => {
          const l = listing(listingId);
          if (!l) return fail("Listing tidak ditemukan.");
          if (l.ownerId !== actorId && !isAdmin(actorId)) return fail("Bukan listing milikmu.");
          set((s) => ({ listings: s.listings.map((x) => (x.id === listingId ? { ...x, status } : x)) }));
          if (isAdmin(actorId)) push({ audit: [auditEntry(actorId, `listing.${status}`, l.title, l.status, status)] });
          return ok(undefined);
        },
        toggleFavorite: (userId, listingId) =>
          set((s) => {
            const cur = s.favorites[userId] ?? [];
            return { favorites: { ...s.favorites, [userId]: cur.includes(listingId) ? cur.filter((x) => x !== listingId) : [...cur, listingId] } };
          }),
        setSearch: (patch) => set((s) => ({ search: { ...s.search, ...patch } })),

        /* ---------------------------------------------------------- booking */
        createBooking: (renterId, input) => {
          const can = canTransact(renterId);
          if (!can.ok) return can;
          const l = listing(input.listingId);
          if (!l || l.status !== "aktif") return fail("Barang tidak tersedia.");
          if (l.ownerId === renterId) return fail("Tidak bisa menyewa barang sendiri.");
          const owner = user(l.ownerId)!;
          const renter = user(renterId)!;
          if (input.endDate < input.startDate) return fail("Tanggal kembali harus setelah tanggal ambil.");
          if (input.startDate < isoDate(now())) return fail("Tanggal ambil sudah lewat.");
          const collateral = l.collateralOptions.find((o) => o.id === input.collateralOptionId);
          if (!collateral) return fail("Pilih bentuk jaminan dari opsi penyedia.");
          if (!l.handover.includes(input.handover)) return fail("Metode serah terima tidak tersedia.");
          const quote = quoteRent(l, input.startDate, input.endDate);
          if (l.minDays && quote.days < l.minDays) return fail(`Minimal sewa ${l.minDays} hari.`);
          if (l.maxDays && quote.days > l.maxDays) return fail(`Maksimal sewa ${l.maxDays} hari.`);
          // FR-R4: prevent schedule clashes (stock-aware for akun Toko).
          const overlapping = get().bookings.filter(
            (b) => b.listingId === l.id && ["REQUESTED", "ACCEPTED", "ACTIVE"].includes(b.status) && b.startDate <= input.endDate && input.startDate <= b.endDate,
          );
          const committed = overlapping.filter((b) => b.status !== "REQUESTED").length;
          if (committed >= l.stock) return fail("Barang sudah dipesan di tanggal itu. Coba tanggal lain.");
          const t = now();
          const commission = computeCommission(quote.total, get().commission);
          const body = {
            createdAt: t,
            listingId: l.id,
            listingTitle: l.title,
            category: l.category,
            itemValue: l.itemValue,
            renterName: publicName(renter),
            providerName: publicName(owner),
            startDate: input.startDate,
            endDate: input.endDate,
            quote,
            collateral,
            collateralValue: collateralValue(collateral, l.itemValue),
            handover: input.handover,
            lateFeePerDay: l.rules.lateFeePerDay,
            lateFeeCap: Math.round((l.itemValue * l.rules.lateFeeCapPercent) / 100),
            cancellation: l.rules.cancellation,
            special: l.rules.special,
            conditionNotes: l.conditionNotes,
            referencePhotos: l.photos,
            commission,
          };
          const counter = get().bookingCounter + 1;
          const d = new Date(t);
          const id = uid("b");
          const deposit = depositCash(collateral, l.itemValue);
          const b: Booking = {
            id,
            code: `SWN-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}-${String(counter).padStart(4, "0")}`,
            listingId: l.id,
            renterId,
            providerId: l.ownerId,
            startDate: input.startDate,
            endDate: input.endDate,
            handover: input.handover,
            collateral,
            note: input.note?.trim() || undefined,
            status: "REQUESTED",
            overdue: false,
            createdAt: t,
            expiresAt: t + 24 * H,
            agreement: { ...body, hash: sha256Text(JSON.stringify(body)), renterAgreedAt: t },
            payment: { status: "belum", rent: quote.total, deposit, commission: commission.renterPays, total: quote.total + deposit + commission.renterPays },
          };
          set((s) => ({ bookings: [b, ...s.bookings], bookingCounter: counter }));
          push({
            notifications: [notify(l.ownerId, "booking", "Request sewa baru", `${publicName(renter)} ingin menyewa ${l.title} (${quote.days} hari).`, href(b))],
            messages: [sysMsg(id, "Request sewa dikirim. Penyedia punya waktu 24 jam untuk merespons.")],
          });
          // Auto-approval: only for trusted renters, never for high-value items or vehicles (PRD 11.4).
          const renterRating = renter.baseRating ?? 0;
          const highValue = l.itemValue > get().collateralRules.highValueBadge || CATEGORY_BY_ID[l.category]?.risk === "kendaraan";
          if (l.approval === "otomatis" && !highValue && renterRating >= (l.autoApproveMinRating ?? 4.5)) {
            get().acceptBooking(l.ownerId, id);
            push({ messages: [sysMsg(id, `Disetujui otomatis: rating penyewa ${renterRating.toFixed(1)} memenuhi ambang penyedia.`)] });
          }
          return ok(id);
        },
        acceptBooking: (providerId, bookingId, meetingPointDetail) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, providerId, "provider")) return fail("Booking tidak ditemukan.");
          if (b.status !== "REQUESTED") return fail("Request ini sudah tidak menunggu persetujuan.");
          const l = listing(b.listingId)!;
          const t = now();
          patchBooking(bookingId, {
            status: "ACCEPTED",
            acceptedAt: t,
            agreement: { ...b.agreement, providerAgreedAt: t },
            meetingPointDetail: meetingPointDetail?.trim() || l.meetingPoint || "Atur titik temu lewat chat (disarankan tempat publik).",
          });
          push({
            notifications: [notify(b.renterId, "booking", "Request disetujui", `${publicName(user(providerId))} menyetujui sewa ${l.title}. Atur serah terima lewat chat.`, href(b))],
            messages: [sysMsg(bookingId, "Request disetujui. Kesepakatan sewa sudah disetujui kedua pihak, dan detail titik temu sekarang terlihat.")],
          });
          return ok(undefined);
        },
        declineBooking: (providerId, bookingId, reason) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, providerId, "provider")) return fail("Booking tidak ditemukan.");
          if (b.status !== "REQUESTED") return fail("Request ini sudah tidak menunggu persetujuan.");
          patchBooking(bookingId, { status: "DECLINED", declinedAt: now(), declineReason: reason.trim() || "Tidak ada alasan." });
          push({
            notifications: [notify(b.renterId, "booking", "Request ditolak", `${titleOf(b)}: ${reason || "penyedia menolak request."}`, href(b))],
            messages: [sysMsg(bookingId, `Request ditolak penyedia. Alasan: ${reason || "-"}`)],
          });
          return ok(undefined);
        },
        cancelBooking: (actorId, bookingId, reason) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, actorId, "any")) return fail("Booking tidak ditemukan.");
          if (b.status !== "REQUESTED" && b.status !== "ACCEPTED") return fail("Booking hanya bisa dibatalkan sebelum serah terima.");
          const other = actorId === b.renterId ? b.providerId : b.renterId;
          patchBooking(bookingId, { status: "CANCELLED", cancelledAt: now(), cancelledBy: actorId, cancelReason: reason.trim() || "-" });
          push({
            notifications: [notify(other, "booking", "Booking dibatalkan", `${publicName(user(actorId))} membatalkan ${titleOf(b)}. Alasan: ${reason || "-"}`, href(b))],
            messages: [sysMsg(bookingId, `Booking dibatalkan oleh ${actorId === b.renterId ? "penyewa" : "penyedia"}. Alasan: ${reason || "-"}`)],
          });
          return ok(undefined);
        },
        payBooking: (renterId, bookingId, method) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, renterId, "renter")) return fail("Booking tidak ditemukan.");
          if (!["ACCEPTED", "ACTIVE"].includes(b.status)) return fail("Pembayaran tersedia setelah request disetujui.");
          if (b.payment.status === "lunas") return fail("Sudah lunas.");
          patchBooking(bookingId, { payment: { ...b.payment, status: "lunas", method, paidAt: now() } });
          // "langsung" (payment mode offline): money changed hands outside Sewain; say only what the renter claims.
          if (method === "langsung")
            push({
              notifications: [notify(b.providerId, "booking", "Penyewa menandai sudah bayar", `${titleOf(b)}: penyewa menandai sudah bayar ${rupiah(b.payment.total)} langsung ke kamu.`, href(b))],
              messages: [sysMsg(bookingId, "Penyewa menandai sudah bayar langsung ke penyedia.")],
            });
          else
            push({
              notifications: [notify(b.providerId, "booking", "Pembayaran diterima (simulasi)", `${titleOf(b)}: ${rupiah(b.payment.total)} lunas via Sewain.`, href(b))],
              messages: [sysMsg(bookingId, `Pembayaran ${rupiah(b.payment.total)} ditandai lunas (simulasi ${method.toUpperCase()}).`)],
            });
          return ok(undefined);
        },
        submitCheckout: (actorId, bookingId, input) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, actorId, "provider")) return fail("Hanya penyedia yang memotret serah terima.");
          if (b.status !== "ACCEPTED") return fail("Serah terima hanya untuk booking yang sudah disetujui.");
          if (input.photoIds.length < 3) return fail("Minimal 3 foto kondisi barang.");
          if (input.collateralPhotoIds.length < 1) return fail("Foto jaminan wajib (FR-J5).");
          const l = listing(b.listingId)!;
          if (CATEGORY_BY_ID[l.category]?.risk === "kendaraan" && (!input.odometer || !input.fuel)) return fail("Kendaraan: isi odometer dan indikator BBM.");
          patchBooking(bookingId, { checkout: { ...input, submittedAt: now(), providerAgreedAt: now() } });
          push({
            notifications: [notify(b.renterId, "booking", "Cek kondisi barang", `${publicName(user(actorId))} sudah memotret ${l.title} + jaminan. Periksa lalu tekan "Setuju kondisi".`, `${href(b)}/serah-terima`)],
            messages: [sysMsg(bookingId, `Foto check-out diunggah (${input.photoIds.length} foto barang + ${input.collateralPhotoIds.length} foto jaminan). Menunggu penyewa menyetujui kondisi.`)],
          });
          return ok(undefined);
        },
        addCheckoutPhotos: (actorId, bookingId, photoIds) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, actorId, "any") || !b.checkout) return fail("Foto check-out belum ada.");
          if (b.status !== "ACCEPTED") return fail("Serah terima sudah selesai.");
          patchBooking(bookingId, { checkout: { ...b.checkout, photoIds: [...b.checkout.photoIds, ...photoIds], renterAgreedAt: undefined } });
          push({ messages: [sysMsg(bookingId, `${actorId === b.renterId ? "Penyewa" : "Penyedia"} menambah ${photoIds.length} foto kondisi.`)] });
          return ok(undefined);
        },
        agreeCheckout: (actorId, bookingId) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, actorId, "any") || !b.checkout) return fail("Foto check-out belum ada.");
          if (b.status !== "ACCEPTED") return fail("Serah terima sudah selesai.");
          const t = now();
          const checkout = { ...b.checkout, ...(actorId === b.renterId ? { renterAgreedAt: t } : { providerAgreedAt: t }) };
          const both = !!checkout.renterAgreedAt && !!checkout.providerAgreedAt;
          // FR: ACTIVE starts only after BOTH parties agree on item + collateral condition.
          patchBooking(bookingId, { checkout, ...(both ? { status: "ACTIVE" as const, activeAt: t } : {}) });
          if (both) {
            push({
              notifications: [
                notify(b.renterId, "booking", "Sewa dimulai", `${titleOf(b)} resmi kamu sewa sampai ${b.endDate}. Jaga baik-baik, ya!`, href(b)),
                notify(b.providerId, "booking", "Sewa dimulai", `${titleOf(b)} sudah diserahkan. Jaminan tercatat.`, href(b)),
              ],
              messages: [sysMsg(bookingId, "Serah terima selesai. Kedua pihak menyetujui kondisi barang dan jaminan. Status: Sedang disewa.")],
            });
          }
          return ok(undefined);
        },
        rejectAtCheckout: (renterId, bookingId, note) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, renterId, "renter")) return fail("Booking tidak ditemukan.");
          if (b.status !== "ACCEPTED") return fail("Hanya saat serah terima.");
          const t = now();
          const report: Report = { id: uid("rp"), reporterId: renterId, targetType: "listing", targetId: b.listingId, reason: "Barang tidak sesuai deskripsi (saat serah terima)", detail: note, createdAt: t, status: "baru" };
          patchBooking(bookingId, { status: "CANCELLED", cancelledAt: t, cancelledBy: renterId, cancelReason: `Barang tidak sesuai deskripsi: ${note}` });
          set((s) => ({ reports: [report, ...s.reports] }));
          push({
            notifications: [
              notify(b.providerId, "booking", "Penyewa membatalkan saat serah terima", `${titleOf(b)} dilaporkan tidak sesuai deskripsi. Admin akan meninjau.`, href(b)),
              notify(ADMIN_ID, "sistem", "Laporan: barang tidak sesuai", `${titleOf(b)} dilaporkan saat serah terima.`, "/admin/laporan"),
            ],
            messages: [sysMsg(bookingId, "Penyewa membatalkan tanpa penalti karena barang tidak sesuai deskripsi. Laporan diteruskan ke admin.")],
          });
          return ok(undefined);
        },
        submitCheckin: (actorId, bookingId, input) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, actorId, "provider")) return fail("Hanya penyedia yang memotret pengembalian.");
          if (b.status !== "ACTIVE") return fail("Pengembalian hanya untuk booking yang sedang disewa.");
          if (input.photoIds.length < 3) return fail("Minimal 3 foto kondisi saat kembali.");
          if (input.result === "masalah" && (!input.problemType || !(input.problemPhotoIds?.length))) return fail("Pilih jenis masalah dan lampirkan foto masalahnya.");
          const t = now();
          const photoIds = [...input.photoIds, ...(input.problemPhotoIds ?? [])];
          patchBooking(bookingId, {
            status: "RETURNED",
            returnedAt: t,
            checkin: { photoIds, result: input.result, problemType: input.problemType, problemNote: input.problemNote, odometer: input.odometer, fuel: input.fuel, at: t },
          });
          push({
            notifications: [notify(b.renterId, "booking", "Pengembalian dicatat", `${titleOf(b)} sudah diterima penyedia. Kondisi: ${input.result === "sesuai" ? "sesuai" : `ada masalah (${input.problemType})`}.`, href(b))],
            messages: [sysMsg(bookingId, `Pengembalian dicatat (${input.photoIds.length} foto). Kondisi: ${input.result === "sesuai" ? "sesuai" : `ada masalah: ${input.problemType}`}.`)],
          });
          if (input.result === "masalah") {
            const caseType: DisputeCase = /hilang|kurang/i.test(input.problemType ?? "") ? "hilang" : /berat|pecah|mati/i.test(input.problemType ?? "") ? "rusak-berat" : /lecet|gores/i.test(input.problemType ?? "") ? "lecet-ringan" : "rusak-ringan";
            get().openDispute(actorId, bookingId, { caseType, description: `${input.problemType}${input.problemNote ? ` — ${input.problemNote}` : ""}`, photoIds: input.problemPhotoIds ?? [] });
          }
          return ok(undefined);
        },
        returnCollateral: (providerId, bookingId) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, providerId, "provider")) return fail("Booking tidak ditemukan.");
          if (b.status !== "RETURNED" && b.status !== "RESOLVED") return fail("Jaminan dikembalikan setelah barang kembali.");
          const t = now();
          patchBooking(bookingId, { collateralReturn: { ...b.collateralReturn, providerReturnedAt: t, autoCompleteAt: t + 48 * H } });
          push({
            notifications: [notify(b.renterId, "booking", "Jaminan dikembalikan", `${publicName(user(providerId))} menandai jaminan (${describeCollateral(b.collateral)}) sudah dikembalikan. Konfirmasi kalau sudah kamu terima.`, href(b))],
            messages: [sysMsg(bookingId, "Penyedia menandai jaminan sudah dikembalikan. Penyewa punya 48 jam untuk konfirmasi, setelah itu otomatis selesai.")],
          });
          return ok(undefined);
        },
        confirmCollateral: (renterId, bookingId) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, renterId, "renter")) return fail("Booking tidak ditemukan.");
          if (!b.collateralReturn?.providerReturnedAt) return fail("Penyedia belum menandai jaminan dikembalikan.");
          const t = now();
          const completes = b.status === "RETURNED";
          patchBooking(bookingId, {
            collateralReturn: { ...b.collateralReturn, renterConfirmedAt: t },
            ...(completes ? { status: "COMPLETED" as const, completedAt: t } : {}),
          });
          set((s) => ({ listings: s.listings.map((l) => (l.id === b.listingId ? { ...l, rentCount: l.rentCount + 1 } : l)) }));
          push({
            notifications: [notify(b.providerId, "booking", completes ? "Sewa selesai" : "Jaminan diterima penyewa", `${titleOf(b)}: penyewa mengonfirmasi jaminan sudah diterima.${completes ? " Beri rating, yuk." : ""}`, href(b))],
            messages: [sysMsg(bookingId, completes ? "Penyewa mengonfirmasi jaminan diterima. Sewa SELESAI. Silakan saling memberi rating." : "Penyewa mengonfirmasi jaminan diterima.")],
          });
          return ok(undefined);
        },
        submitReview: (fromId, bookingId, rating, comment) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, fromId, "any")) return fail("Booking tidak ditemukan.");
          if (b.status !== "COMPLETED" && b.status !== "RESOLVED") return fail("Rating diberikan setelah sewa selesai.");
          if (get().reviews.some((r) => r.bookingId === bookingId && r.fromId === fromId)) return fail("Kamu sudah memberi rating.");
          if (rating < 1 || rating > 5) return fail("Rating 1–5.");
          const fromRole = fromId === b.renterId ? "penyewa" : "penyedia";
          const toId = fromRole === "penyewa" ? b.providerId : b.renterId;
          set((s) => ({ reviews: [...s.reviews, { id: uid("r"), bookingId, listingId: b.listingId, fromId, toId, fromRole, rating, comment: comment.trim(), createdAt: now() }] }));
          push({ notifications: [notify(toId, "booking", "Kamu dapat rating baru", `Rating dari ${publicName(user(fromId))} tampil setelah kamu juga mengisi (atau setelah 7 hari).`, href(b))] });
          return ok(undefined);
        },

        /* ------------------------------------------------------------- chat */
        sendMessage: (senderId, bookingId, input) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, senderId, "any")) return fail("Chat tidak ditemukan.");
          if (!input.text?.trim() && !input.photoId) return fail("Pesan kosong.");
          const t = now();
          set((s) => ({ messages: [...s.messages, { id: uid("m"), bookingId, senderId, text: input.text?.trim() || undefined, photoId: input.photoId, at: t }], chatReads: { ...s.chatReads, [`${senderId}:${bookingId}`]: t } }));
          const other = senderId === b.renterId ? b.providerId : b.renterId;
          push({ notifications: [notify(other, "chat", `Pesan dari ${publicName(user(senderId))}`, input.text?.trim().slice(0, 80) || "Mengirim foto", `${href(b)}/chat`)] });
          return ok(undefined);
        },
        markThreadRead: (userId, bookingId) => set((s) => ({ chatReads: { ...s.chatReads, [`${userId}:${bookingId}`]: now() } })),

        addPhotos: (records) => set((s) => ({ photos: [...s.photos, ...records.filter((r) => !s.photos.some((p) => p.id === r.id))] })),

        /* --------------------------------------------------------- disputes */
        openDispute: (actorId, bookingId, input) => {
          const b = booking(bookingId);
          if (!b || !isActor(b, actorId, "any")) return fail("Booking tidak ditemukan.");
          if (!["ACTIVE", "RETURNED"].includes(b.status)) return fail("Sengketa bisa dibuka saat sedang disewa, telat, atau setelah pengembalian.");
          if (b.disputeId && get().disputes.some((d) => d.id === b.disputeId && d.status !== "selesai")) return fail("Sudah ada sengketa berjalan.");
          const t = now();
          const id = uid("d");
          set((s) => ({
            disputes: [{ id, bookingId, openedBy: actorId, caseType: input.caseType, description: input.description, photoIds: input.photoIds, createdAt: t, layer: "L1", status: "negosiasi", l1Deadline: t + 48 * H, proposals: [] }, ...s.disputes],
          }));
          patchBooking(bookingId, { status: "DISPUTED", disputeId: id });
          const other = actorId === b.renterId ? b.providerId : b.renterId;
          push({
            notifications: [notify(other, "sengketa", "Ada laporan masalah", `${publicName(user(actorId))} melaporkan masalah pada ${titleOf(b)}. Respons dalam 48 jam.`, `${href(b)}/sengketa`)],
            messages: [sysMsg(bookingId, "Laporan masalah dibuka. Tahap L1: negosiasi mandiri 48 jam. Ajukan solusi lewat halaman sengketa.")],
          });
          return ok(id);
        },
        proposeSolution: (actorId, disputeId, input) => {
          const d = get().disputes.find((x) => x.id === disputeId);
          const b = d && booking(d.bookingId);
          if (!d || !b || !isActor(b, actorId, "any")) return fail("Sengketa tidak ditemukan.");
          if (d.status !== "negosiasi") return fail("Negosiasi sudah ditutup.");
          const p: DisputeProposal = { id: uid("pr"), byId: actorId, type: input.type, amount: input.amount, note: input.note, at: now(), status: "diajukan" };
          set((s) => ({ disputes: s.disputes.map((x) => (x.id === disputeId ? { ...x, proposals: [...x.proposals, p] } : x)) }));
          const other = actorId === b.renterId ? b.providerId : b.renterId;
          push({ notifications: [notify(other, "sengketa", "Usulan solusi baru", `${publicName(user(actorId))} mengusulkan solusi untuk ${titleOf(b)}.`, `${href(b)}/sengketa`)] });
          return ok(undefined);
        },
        respondProposal: (actorId, disputeId, proposalId, accept) => {
          const d = get().disputes.find((x) => x.id === disputeId);
          const b = d && booking(d.bookingId);
          const p = d?.proposals.find((x) => x.id === proposalId);
          if (!d || !b || !p || !isActor(b, actorId, "any")) return fail("Usulan tidak ditemukan.");
          if (p.byId === actorId) return fail("Tidak bisa merespons usulan sendiri.");
          if (p.status !== "diajukan" || d.status !== "negosiasi") return fail("Usulan sudah direspons.");
          const t = now();
          const label = { "potong-deposit": "potong deposit", "ganti-perbaikan": "ganti biaya perbaikan", "ganti-nilai": "ganti rugi nilai barang", perpanjang: "perpanjang waktu sewa", "tanpa-kompensasi": "tanpa kompensasi (wajar pakai)" }[p.type];
          const outcome = accept ? `Disepakati di L1: ${label}${p.amount ? ` ${rupiah(p.amount)}` : ""}.` : undefined;
          set((s) => ({
            disputes: s.disputes.map((x) =>
              x.id === disputeId
                ? { ...x, proposals: x.proposals.map((y) => (y.id === proposalId ? { ...y, status: accept ? "diterima" : "ditolak" } : y)), ...(accept ? { status: "selesai" as const, outcome, resolvedAt: t } : {}) }
                : x,
            ),
          }));
          if (accept) patchBooking(b.id, { status: "RESOLVED", resolvedAt: t });
          push({
            notifications: [notify(p.byId, "sengketa", accept ? "Usulan diterima" : "Usulan ditolak", accept ? `${titleOf(b)}: ${outcome}` : `${titleOf(b)}: usulanmu ditolak. Ajukan usulan lain atau naikkan ke admin.`, `${href(b)}/sengketa`)],
            messages: [sysMsg(b.id, accept ? `Sengketa selesai lewat negosiasi. ${outcome}` : "Usulan solusi ditolak.")],
          });
          return ok(undefined);
        },
        escalateDispute: (actorId, disputeId) => {
          const d = get().disputes.find((x) => x.id === disputeId);
          const b = d && booking(d.bookingId);
          if (!d || !b || !isActor(b, actorId, "any")) return fail("Sengketa tidak ditemukan.");
          if (d.status !== "negosiasi") return fail("Sengketa sudah di tahap mediasi.");
          set((s) => ({ disputes: s.disputes.map((x) => (x.id === disputeId ? { ...x, layer: "L2", status: "mediasi" } : x)) }));
          push({
            notifications: [
              notify(ADMIN_ID, "sengketa", "Sengketa menunggu mediasi", `${titleOf(b)}: dinaikkan ke L2 oleh ${publicName(user(actorId))}.`, `/admin/sengketa/${disputeId}`),
              notify(actorId === b.renterId ? b.providerId : b.renterId, "sengketa", "Sengketa naik ke mediasi admin", `${titleOf(b)}: admin akan memberi rekomendasi maksimal 5 hari kerja.`, `${href(b)}/sengketa`),
            ],
            messages: [sysMsg(b.id, "Sengketa dinaikkan ke mediasi admin (L2). Admin menilai foto, chat, jaminan, dan kesepakatan.")],
          });
          return ok(undefined);
        },
        adminRecommend: (adminId, disputeId, input) => {
          if (!isAdmin(adminId)) return fail("Hanya admin.");
          const d = get().disputes.find((x) => x.id === disputeId);
          const b = d && booking(d.bookingId);
          if (!d || !b) return fail("Sengketa tidak ditemukan.");
          set((s) => ({ disputes: s.disputes.map((x) => (x.id === disputeId ? { ...x, layer: "L2", status: "mediasi", recommendation: { text: input.text, amount: input.amount, byAdminId: adminId, at: now() } } : x)) }));
          push({
            notifications: [b.renterId, b.providerId].map((u) => notify(u, "sengketa", "Rekomendasi admin keluar", `${titleOf(b)}: ${input.text.slice(0, 90)}`, `${href(b)}/sengketa`)),
            messages: [sysMsg(b.id, `Rekomendasi admin: ${input.text}${input.amount ? ` (${rupiah(input.amount)})` : ""}`)],
            audit: [auditEntry(adminId, "sengketa.rekomendasi", `${titleOf(b)} (${b.code})`, undefined, input.text)],
          });
          return ok(undefined);
        },
        resolveDispute: (adminId, disputeId, outcome) => {
          if (!isAdmin(adminId)) return fail("Hanya admin.");
          const d = get().disputes.find((x) => x.id === disputeId);
          const b = d && booking(d.bookingId);
          if (!d || !b) return fail("Sengketa tidak ditemukan.");
          const t = now();
          set((s) => ({ disputes: s.disputes.map((x) => (x.id === disputeId ? { ...x, status: "selesai", outcome, resolvedAt: t } : x)) }));
          patchBooking(b.id, { status: "RESOLVED", resolvedAt: t });
          push({
            notifications: [b.renterId, b.providerId].map((u) => notify(u, "sengketa", "Sengketa selesai", `${titleOf(b)}: ${outcome.slice(0, 100)}`, `${href(b)}/sengketa`)),
            messages: [sysMsg(b.id, `Sengketa ditutup admin. Hasil: ${outcome}`)],
            audit: [auditEntry(adminId, "sengketa.selesai", `${titleOf(b)} (${b.code})`, undefined, outcome)],
          });
          return ok(undefined);
        },

        /* ------------------------------------------------------- moderation */
        createReport: (reporterId, input) => {
          const id = uid("rp");
          set((s) => ({ reports: [{ id, reporterId, ...input, createdAt: now(), status: "baru" }, ...s.reports] }));
          push({ notifications: [notify(ADMIN_ID, "sistem", "Laporan baru", `${input.targetType === "listing" ? "Listing" : "Pengguna"} dilaporkan: ${input.reason}`, "/admin/laporan")] });
          return ok(id);
        },
        resolveReport: (adminId, reportId, status, resolution) => {
          if (!isAdmin(adminId)) return fail("Hanya admin.");
          const r = get().reports.find((x) => x.id === reportId);
          if (!r) return fail("Laporan tidak ditemukan.");
          set((s) => ({ reports: s.reports.map((x) => (x.id === reportId ? { ...x, status, resolution, resolvedAt: now(), resolvedBy: adminId } : x)) }));
          push({ audit: [auditEntry(adminId, `laporan.${status}`, r.reason, undefined, resolution)], notifications: [notify(r.reporterId, "sistem", "Laporanmu sudah ditinjau", resolution, undefined)] });
          return ok(undefined);
        },
        addStrike: (adminId, userId, input) => {
          if (!isAdmin(adminId)) return fail("Hanya admin.");
          const u = user(userId);
          if (!u) return fail("Pengguna tidak ditemukan.");
          set((s) => ({
            strikes: [{ id: uid("s"), userId, ...input, at: now(), byAdminId: adminId }, ...s.strikes],
            users: s.users.map((x) => (x.id === userId ? { ...x, strikes: (x.strikes ?? 0) + (input.severity === "berat" ? 2 : 1) } : x)),
          }));
          push({
            notifications: [notify(userId, "sistem", "Kamu mendapat strike", `${input.reason}. Strike berulang bisa berujung suspend.`, "/profil")],
            audit: [auditEntry(adminId, "user.strike", publicName(u), String(u.strikes ?? 0), `${(u.strikes ?? 0) + (input.severity === "berat" ? 2 : 1)} (${input.severity}: ${input.reason})`)],
          });
          return ok(undefined);
        },
        setUserStatus: (adminId, userId, status, reason) => {
          if (!isAdmin(adminId)) return fail("Hanya admin.");
          const u = user(userId);
          if (!u) return fail("Pengguna tidak ditemukan.");
          set((s) => ({
            users: s.users.map((x) => (x.id === userId ? { ...x, status } : x)),
            // Suspended / blacklisted users' listings are hidden.
            listings: status === "aktif" ? s.listings : s.listings.map((l) => (l.ownerId === userId && l.status === "aktif" ? { ...l, status: "jeda" } : l)),
          }));
          push({
            notifications: [notify(userId, "sistem", status === "aktif" ? "Akun dipulihkan" : status === "suspend" ? "Akun ditangguhkan" : "Akun diblokir", reason, "/profil")],
            audit: [auditEntry(adminId, `user.${status}`, publicName(u), u.status, `${status} — ${reason}${status === "blacklist" ? ` (NIK ${u.verification.nikMasked ?? "-"})` : ""}`)],
          });
          return ok(undefined);
        },

        /* ---------------------------------------------------------- settings */
        updateCommission: (adminId, patch) => {
          if (!isAdmin(adminId)) return fail("Hanya admin.");
          const old = get().commission;
          const next = { ...old, ...patch, updatedAt: now(), updatedBy: adminId };
          const fmt = (c: CommissionConfig) =>
            `${c.active ? "aktif" : "nonaktif"}, ${c.mode === "persen" ? `${c.percent}%` : rupiah(c.flat)}, min ${c.min != null ? rupiah(c.min) : "-"}, maks ${c.max != null ? rupiah(c.max) : "-"}, ${c.bearer}${c.bearer === "split" ? ` ${c.splitRenterPercent}:${100 - c.splitRenterPercent}` : ""}`;
          set({ commission: next });
          // FR-K5: only new bookings use the new value; existing agreements keep their snapshot.
          push({ audit: [auditEntry(adminId, "komisi.ubah", "Pengaturan komisi", fmt(old), fmt(next))] });
          return ok(undefined);
        },
        updateCollateralRules: (adminId, patch) => {
          if (!isAdmin(adminId)) return fail("Hanya admin.");
          const old = get().collateralRules;
          const next = { ...old, ...patch, updatedAt: now(), updatedBy: adminId };
          const fmt = (r: CollateralRules) => `<${rupiah(r.lowMax)} identitas; ≤${rupiah(r.midMax)} +${r.midDepositPercent}%; >${rupiah(r.midMax)} ${r.highDepositPercent}%; kendaraan ${r.vehicleDepositPercent}%`;
          set({ collateralRules: next });
          push({ audit: [auditEntry(adminId, "jaminan.ubah", "Saran jaminan", fmt(old), fmt(next))] });
          return ok(undefined);
        },
        setBannedKeywords: (adminId, keywords) => {
          if (!isAdmin(adminId)) return fail("Hanya admin.");
          const clean = Array.from(new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)));
          const old = get().bannedKeywords;
          set({ bannedKeywords: clean });
          push({ audit: [auditEntry(adminId, "kata-terlarang.ubah", "Daftar kata kunci larangan", `${old.length} kata`, `${clean.length} kata`)] });
          return ok(undefined);
        },

        /* ------------------------------------------------------- wanted (P1) */
        createWanted: (requesterId, input) => {
          const can = canTransact(requesterId);
          if (!can.ok) return can;
          const id = uid("w");
          const area = AREA_BY_ID[input.areaId];
          const location: GeoPoint = { lat: area.lat, lng: area.lng };
          set((s) => ({ wanted: [{ id, requesterId, ...input, location, createdAt: now(), status: "terbuka", offers: [] }, ...s.wanted] }));
          // Demand becomes a supply signal: notify providers nearby who list in that category (PRD 7.3).
          const providers = Array.from(new Set(get().listings.filter((l) => l.status === "aktif" && (!input.category || l.category === input.category) && l.ownerId !== requesterId).map((l) => l.ownerId)));
          push({ notifications: providers.map((p) => notify(p, "papan", "Ada yang mencari barang", `"${input.title}" di sekitar ${area.name}. Punya? Tawarkan sekarang.`, "/papan")) });
          return ok(id);
        },
        offerWanted: (providerId, wantedId, input) => {
          const w = get().wanted.find((x) => x.id === wantedId);
          if (!w || w.status !== "terbuka") return fail("Permintaan sudah ditutup.");
          if (w.requesterId === providerId) return fail("Ini permintaanmu sendiri.");
          set((s) => ({ wanted: s.wanted.map((x) => (x.id === wantedId ? { ...x, offers: [...x.offers, { id: uid("wo"), providerId, ...input, at: now() }] } : x)) }));
          push({ notifications: [notify(w.requesterId, "papan", "Ada yang menawarkan barang", `${publicName(user(providerId))} merespons "${w.title}".`, input.listingId ? `/barang/${input.listingId}` : "/papan")] });
          return ok(undefined);
        },
        closeWanted: (requesterId, wantedId, status) => {
          const w = get().wanted.find((x) => x.id === wantedId);
          if (!w || w.requesterId !== requesterId) return fail("Permintaan tidak ditemukan.");
          set((s) => ({ wanted: s.wanted.map((x) => (x.id === wantedId ? { ...x, status } : x)) }));
          return ok(undefined);
        },

        markNotificationsRead: (userId, ids) =>
          set((s) => ({ notifications: s.notifications.map((n) => (n.userId === userId && (!ids || ids.includes(n.id)) ? { ...n, read: true } : n)) })),
      };
    },
    {
      name: STORAGE_KEY,
      version: DATA_VERSION,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => pickData(s),
      // Older demo data is simply regenerated.
      migrate: () => ({ ...EMPTY }) as unknown as AppState,
    },
  ),
);

/* ------------------------------------------------------- server sync (sewain-api) */

/** Actions that change data on the server. Everything else is client-only (search prefs, demo helpers). */
const SERVER_ACTIONS = [
  "registerUser", "updateUser", "submitVerification", "reviewVerification", "createListing", "updateListing", "setListingStatus",
  "toggleFavorite", "createBooking", "acceptBooking", "declineBooking", "cancelBooking", "payBooking", "submitCheckout",
  "addCheckoutPhotos", "agreeCheckout", "rejectAtCheckout", "submitCheckin", "returnCollateral", "confirmCollateral", "submitReview",
  "sendMessage", "markThreadRead", "openDispute", "proposeSolution", "respondProposal", "escalateDispute", "adminRecommend",
  "resolveDispute", "createReport", "resolveReport", "addStrike", "setUserStatus", "updateCommission", "updateCollateralRules",
  "setBannedKeywords", "createWanted", "offerWanted", "closeWanted", "markNotificationsRead", "advanceClock", "resetClock", "resetDemo",
] as const satisfies readonly (keyof Actions)[];

type ServerState = DataState & { serverNow: number; scope?: DataState["scope"]; viewerId?: ID | null };

/** Who is signed in in this tab, and tokens for any account on this device. Registered by lib/session.ts. */
export interface SessionBridge {
  currentUserId: () => ID | null;
  tokenFor: (userId: ID) => Promise<string | null>;
  dropToken: (userId: ID) => void;
}

let session: SessionBridge = { currentUserId: () => null, tokenFor: async () => null, dropToken: () => {} };
export function setSessionBridge(b: SessionBridge) {
  session = b;
}

let localVersion = 0;
let syncing: Promise<void> | null = null;
let resyncWanted = false;
let forceWanted = false;

/** Replace local data with the server snapshot (keeps client-only search prefs). */
function applyServerState(raw: ServerState) {
  const s = SIMULATE_SCOPED ? scopeSnapshot(raw, session.currentUserId(), useAppConfig.getState().demoMode) : raw;
  const data: Partial<DataState> = {};
  for (const key of Object.keys(EMPTY) as (keyof DataState)[]) {
    if (key === "search") continue;
    if (key in s) (data as Record<string, unknown>)[key] = (s as unknown as Record<string, unknown>)[key];
  }
  // v1 sends neither: a full snapshot that is not tied to a viewer.
  data.scope = s.scope ?? "full";
  data.viewerId = s.viewerId ?? null;
  data.listingBusy = s.listingBusy;
  localVersion = s.version;
  // Demo clock follows the server: its offset plus the skew between the two clocks.
  data.clockOffset = s.clockOffset + (s.serverNow - Date.now());
  data.seeded = true;
  useAppStore.setState(data);
  useApiStatus.setState({ lastSync: Date.now() });
}

/** Fetch the latest snapshot, but never while our own commands are queued (avoids flicker back to old state). */
async function syncFromServer(force = false): Promise<void> {
  if (force) forceWanted = true;
  if (blockingCount() > 0) {
    resyncWanted = true;
    return;
  }
  if (syncing) {
    resyncWanted = true;
    return syncing;
  }
  syncing = (async () => {
    const f = forceWanted;
    forceWanted = false;
    const s = await fetchState<ServerState>();
    // A command queued while the request was in flight would be rolled back by this snapshot: wait for it.
    if (s && blockingCount() > 0) {
      resyncWanted = true;
      forceWanted ||= f;
      return;
    }
    if (s && (f || s.version !== localVersion)) applyServerState(s);
  })().finally(() => {
    syncing = null;
    if (resyncWanted) {
      resyncWanted = false;
      void syncFromServer();
    }
  });
  return syncing;
}

/** Re-read the snapshot for whoever is signed in now (a scoped snapshot depends on the viewer). */
export function resyncForViewer() {
  if (!isOnline()) return;
  void syncFromServer(true);
  reconnectEvents();
}

let depth = 0;
let serverSyncInstalled = false;

/** Wrap each data action: apply locally (instant UI, same validation) → queue durably → send → reconcile. */
function installServerSync() {
  if (serverSyncInstalled) return;
  serverSyncInstalled = true;
  const state = useAppStore.getState();
  const wrapped: Partial<Actions> = {};
  for (const name of SERVER_ACTIONS) {
    const local = state[name] as (...args: unknown[]) => unknown;
    (wrapped as Record<string, unknown>)[name] = (...args: unknown[]) => {
      // Nested calls (e.g. createBooking → auto acceptBooking) are part of the outer action on the server too.
      if (!isOnline() || depth > 0) return local(...args);
      depth++;
      let res: unknown;
      try {
        res = local(...args);
      } finally {
        depth--;
      }
      const r = res as { ok?: boolean; value?: unknown } | undefined;
      if (r && r.ok === false) return res; // rejected locally, nothing to send
      enqueueAction(session.currentUserId(), name, args, typeof r?.value === "string" ? r.value : undefined);
      return res;
    };
  }
  // The server runs the time-based jobs; locally the clock only drives countdowns.
  const localTick = state.tick;
  wrapped.tick = () => {
    if (!isOnline()) localTick();
  };
  useAppStore.setState(wrapped);
}

/** Does an object with this client id already exist on the server? (v1 safety net for resent creates) */
async function existsOnServer(id: ID): Promise<boolean> {
  const s = await fetchState<ServerState>();
  if (!s) return false;
  const lists: { id: ID }[][] = [s.users, s.listings, s.bookings, s.disputes, s.reports, s.wanted, s.verifications];
  return lists.some((l) => l?.some((x) => x.id === id));
}

function startServerOutbox() {
  startOutbox({
    tokenFor: (userId) => session.tokenFor(userId),
    dropToken: (userId) => session.dropToken(userId),
    idempotent: () => useAppConfig.getState().fromServer,
    exists: existsOnServer,
    onAccepted: () => {},
    onRejected: (_entry, error, quiet) => {
      if (!quiet) toast(`Server: ${error || "aksi ditolak"}`, "error");
      void syncFromServer(true);
    },
    onSettled: () => void syncFromServer(),
  });
}

let booted = false;
let connecting = false;

/** Connect to sewain-api: config, pending actions first, then the snapshot, then the live change feed. */
async function connectServer(): Promise<boolean> {
  if (connecting || isOnline()) return isOnline();
  connecting = true;
  try {
    if (!(await detectApi())) return false;
    await loadConfig();
    startServerOutbox();
    // Actions left over from a reload/offline spell go out before the snapshot, so it already contains them.
    await flushOutbox();
    const s = await fetchState<ServerState>();
    if (!s) return false;
    // Still blocked (server erroring): keep the cached, optimistic data unless there is nothing cached at all.
    if (blockingCount() === 0 || !useAppStore.getState().seeded) applyServerState(s);
    else resyncWanted = true;
    useApiStatus.setState({ status: "online" });
    try {
      localStorage.setItem(API_SEEN_KEY, "1");
    } catch {}
    installServerSync();
    connectEvents(
      (version) => {
        if (version !== localVersion) void syncFromServer();
      },
      () => {
        void flushOutbox();
        void syncFromServer();
      },
      // Demo bearer sessions: identify the socket (v2 sends events per user). Real sessions use the cookie.
      async () => {
        const id = session.currentUserId();
        return id && useAppConfig.getState().demoMode ? session.tokenFor(id) : null;
      },
    );
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && void syncFromServer());
    return true;
  } finally {
    connecting = false;
  }
}

const API_SEEN_KEY = "sewain-api-seen";

/**
 * Called once from <StoreBoot/>. Loads cached browser data instantly, then connects to sewain-api:
 * server snapshot + WebSocket change feed (multi-device). Falls back to browser-only mode when the API is down.
 */
export async function bootStore() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  await useAppStore.persist.rehydrate();
  await connectServer();
  if (!isOnline()) {
    useApiStatus.setState({ status: "offline" });
    if (!useAppStore.getState().seeded) useAppStore.getState().resetDemo();
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY && !isOnline()) void useAppStore.persist.rehydrate();
    });
    // Booted without a connection on a device that used the API before (or with actions still queued):
    // keep trying, so queued actions reach the server once the network is back.
    let seen = false;
    try {
      seen = localStorage.getItem(API_SEEN_KEY) === "1";
    } catch {}
    if (seen || pendingEntries().length > 0) {
      const retry = () => void connectServer().then((ok) => ok && window.clearInterval(timer));
      const timer = window.setInterval(retry, 20_000);
      window.addEventListener("online", retry);
    }
  }
  useAppStore.setState({ hydrated: true });
  useAppStore.getState().tick();
  window.setInterval(() => useAppStore.getState().tick(), 30_000);
}

/** true once localStorage data is loaded. Render data-dependent UI only after this. */
export const useHydrated = () => useAppStore((s) => s.hydrated);

/** Demo-clock "now" (ms). Re-renders when the clock is advanced and on a heartbeat. */
export function useNow(intervalMs = 30_000): number {
  const offset = useAppStore((s) => s.clockOffset);
  const [base, setBase] = useState(() => Date.now());
  useEffect(() => {
    setBase(Date.now());
    const id = window.setInterval(() => setBase(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, offset]);
  return base + offset;
}

export type { DataState };
