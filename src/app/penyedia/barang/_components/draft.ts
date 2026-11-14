// Pure model for the listing wizard: the draft shape, defaults, conversions to/from Listing,
// and per-step validation. No React here so it stays easy to read and test.

import { AREA_BY_ID } from "@/lib/data/areas";
import { CATEGORY_BY_ID } from "@/lib/data/categories";
import { rupiah } from "@/lib/format";
import { isHighValue } from "@/lib/pricing";
import { bannedWordsIn } from "@/lib/selectors";
import type { NewListingInput } from "@/lib/store";
import type {
  AreaId,
  CategoryId,
  CollateralKind,
  CollateralOption,
  CollateralRules,
  GeoPoint,
  HandoverMethod,
  ID,
  Listing,
  PhotoRecord,
  User,
} from "@/lib/types";

export const STEPS = [
  { key: "foto", label: "Foto & kondisi", title: "Foto & kondisi barang", hint: "Ambil minimal 3 foto dari sudut berbeda. Foto ini jadi bukti kondisi awal kalau nanti ada masalah." },
  { key: "info", label: "Info barang", title: "Info barang", hint: "Kasih judul yang jelas, pilih kategori, dan ceritakan barangnya." },
  { key: "harga", label: "Harga & nilai", title: "Harga & nilai barang", hint: "Tentukan harga sewa. Nilai barang dipakai untuk saran jaminan dan batas denda." },
  { key: "jaminan", label: "Jaminan", title: "Jaminan", hint: "Pilih jaminan yang kamu minta. Kalau ada beberapa opsi, penyewa memilih salah satu." },
  { key: "aturan", label: "Serah terima", title: "Serah terima & aturan", hint: "Atur cara ketemu, lokasi barang, dan aturan sewamu sendiri." },
] as const;

/** Index of the "Pratinjau" screen that follows the last step. */
export const PREVIEW = STEPS.length;

export const PHOTO_MIN = 3;
export const PHOTO_ANGLES = ["Depan", "Samping", "Belakang", "Close-up cacat (kalau ada)"];
export const DEFAULT_CANCELLATION = "Gratis jika batal lebih dari 24 jam sebelum serah terima.";
export const HOUR_OPTIONS = Array.from({ length: 19 }, (_, i) => `${String(i + 5).padStart(2, "0")}.00`); // 05.00–23.00

export interface ListingDraft {
  photoIds: ID[];
  conditionNotes: string;

  title: string;
  category: CategoryId | null;
  description: string;
  /** typed by the provider; only the masked form is ever stored (FR-L6) */
  plate: string;
  /** masked plate already saved on the listing (edit mode) */
  plateMasked: string;
  stnkValidUntil: string;
  simClass: "A" | "C" | null;

  pricePerDay: number | null;
  pricePerHour: number | null;
  pricePerWeek: number | null;
  discountOn: boolean;
  discountMinDays: number | null;
  discountPercent: number | null;
  minDays: number | null;
  maxDays: number | null;
  itemValue: number | null;
  stock: number;

  collateral: CollateralOption[];

  handover: HandoverMethod[];
  meetingPoint: string;
  hoursFrom: string;
  hoursTo: string;
  areaId: AreaId;
  point: GeoPoint;
  radiusKm: number;
  /** null = follow the daily price (PRD default) */
  lateFeePerDay: number | null;
  lateFeeCapPercent: number | null;
  cancellation: string;
  special: string;
  approval: "manual" | "otomatis";
  autoApproveMinRating: number;
}

export type Errors = Record<string, string>;

/* ------------------------------------------------------------- helpers */

export const newOptionId = () => `co-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const isVehicle = (category: CategoryId | null) => !!category && CATEGORY_BY_ID[category]?.risk === "kendaraan";

const PLATE_RE = /^([A-Z]{1,2})\s*(\d{1,4})\s*([A-Z]{0,3})$/;

/** "ab 4567 xy" → "AB 4*** **" (public form of a plate number, FR-L6). null when the format is wrong. */
export function maskPlate(raw: string): string | null {
  const m = raw.trim().toUpperCase().replace(/\s+/g, " ").match(PLATE_RE);
  if (!m) return null;
  const [, region, digits, suffix] = m;
  return `${region} ${digits[0]}${"*".repeat(digits.length - 1)}${suffix ? ` ${"*".repeat(suffix.length)}` : ""}`;
}

export const lateFeeOf = (d: Pick<ListingDraft, "lateFeePerDay" | "pricePerDay">) => d.lateFeePerDay ?? d.pricePerDay ?? 0;

export const handoverHoursOf = (d: Pick<ListingDraft, "hoursFrom" | "hoursTo">) => (d.hoursFrom && d.hoursTo ? `${d.hoursFrom}–${d.hoursTo}` : "");

/** Automatic approval is never allowed for high-value items or vehicles (PRD 11.4). */
export const autoApprovalBlocked = (d: Pick<ListingDraft, "itemValue" | "category">, rules: CollateralRules) =>
  isVehicle(d.category) || isHighValue(d.itemValue ?? 0, rules);

export function blankOption(kind: CollateralKind, rules: CollateralRules): CollateralOption {
  const id = newOptionId();
  switch (kind) {
    case "identitas":
      return { id, kind, cards: ["KTM", "SIM"] };
    case "deposit":
      return { id, kind, depositMode: "persen", depositPercent: rules.midDepositPercent, withIdentity: false, cards: ["KTM", "SIM"] };
    case "barang":
      return { id, kind, description: "" };
    case "custom":
      return { id, kind, description: "" };
  }
}

/** Keep only the fields that belong to the option's kind before saving. */
export function cleanOption(o: CollateralOption): CollateralOption {
  switch (o.kind) {
    case "identitas":
      return { id: o.id, kind: o.kind, cards: o.cards ?? [] };
    case "deposit":
      return {
        id: o.id,
        kind: o.kind,
        depositMode: o.depositMode ?? "persen",
        ...(o.depositMode === "tetap" ? { depositAmount: o.depositAmount ?? 0 } : { depositPercent: o.depositPercent ?? 0 }),
        withIdentity: !!o.withIdentity,
        ...(o.withIdentity ? { cards: o.cards ?? [] } : {}),
      };
    case "barang":
      return { id: o.id, kind: o.kind, description: o.description?.trim() ?? "", estimatedValue: o.estimatedValue };
    case "custom":
      return { id: o.id, kind: o.kind, description: o.description?.trim() ?? "", ...(o.estimatedValue ? { estimatedValue: o.estimatedValue } : {}) };
  }
}

/* --------------------------------------------------------- initial data */

export function defaultArea(user: User): AreaId {
  return user.accountType === "toko" && user.store ? user.store.areaId : user.areaId;
}

export function emptyDraft(user: User): ListingDraft {
  const areaId = defaultArea(user);
  const area = AREA_BY_ID[areaId] ?? AREA_BY_ID.ugm;
  const hours = user.store?.hours?.split(/[–-]/).map((h) => h.trim()) ?? [];
  return {
    photoIds: [],
    conditionNotes: "",
    title: "",
    category: null,
    description: "",
    plate: "",
    plateMasked: "",
    stnkValidUntil: "",
    simClass: null,
    pricePerDay: null,
    pricePerHour: null,
    pricePerWeek: null,
    discountOn: false,
    discountMinDays: 3,
    discountPercent: 10,
    minDays: null,
    maxDays: null,
    itemValue: null,
    stock: 1,
    // PRD 6 #5: default jaminan = titip kartu identitas (KTM/SIM, not e-KTP — PRD 12.4)
    collateral: [{ id: newOptionId(), kind: "identitas", cards: ["KTM", "SIM"] }],
    handover: ["cod"],
    meetingPoint: "",
    hoursFrom: HOUR_OPTIONS.includes(hours[0]) ? hours[0] : "",
    hoursTo: HOUR_OPTIONS.includes(hours[1]) ? hours[1] : "",
    areaId,
    point: { lat: area.lat, lng: area.lng },
    radiusKm: 3,
    lateFeePerDay: null,
    lateFeeCapPercent: 100,
    cancellation: DEFAULT_CANCELLATION,
    special: "",
    approval: "manual",
    autoApproveMinRating: 4.5,
  };
}

export function draftFromListing(l: Listing, photoIds: ID[]): ListingDraft {
  const [from = "", to = ""] = l.handoverHours?.split(/[–-]/).map((h) => h.trim()) ?? [];
  return {
    photoIds,
    conditionNotes: l.conditionNotes,
    title: l.title,
    category: l.category,
    description: l.description,
    plate: "",
    plateMasked: l.vehicle?.plateMasked ?? "",
    stnkValidUntil: l.vehicle?.stnkValidUntil ?? "",
    simClass: l.vehicle?.simClass ?? null,
    pricePerDay: l.pricePerDay,
    pricePerHour: l.pricePerHour ?? null,
    pricePerWeek: l.pricePerWeek ?? null,
    discountOn: !!l.durationDiscount,
    discountMinDays: l.durationDiscount?.minDays ?? 3,
    discountPercent: l.durationDiscount?.percent ?? 10,
    minDays: l.minDays ?? null,
    maxDays: l.maxDays ?? null,
    itemValue: l.itemValue,
    stock: l.stock,
    collateral: l.collateralOptions.map((o) => ({ ...o, cards: o.cards ? [...o.cards] : undefined })),
    handover: [...l.handover],
    meetingPoint: l.meetingPoint ?? "",
    hoursFrom: HOUR_OPTIONS.includes(from) ? from : "",
    hoursTo: HOUR_OPTIONS.includes(to) ? to : "",
    areaId: l.location.areaId,
    point: { lat: l.location.lat, lng: l.location.lng },
    radiusKm: l.radiusKm,
    lateFeePerDay: l.rules.lateFeePerDay === l.pricePerDay ? null : l.rules.lateFeePerDay,
    lateFeeCapPercent: l.rules.lateFeeCapPercent,
    cancellation: l.rules.cancellation,
    special: l.rules.special ?? "",
    approval: l.approval,
    autoApproveMinRating: l.autoApproveMinRating ?? 4.5,
  };
}

/** Build the store input. Assumes every step validated. */
export function toListingInput(d: ListingDraft, ctx: { photos: PhotoRecord[]; isToko: boolean; rules: CollateralRules }): NewListingInput {
  const category = d.category!;
  const pricePerDay = d.pricePerDay ?? 0;
  const vehicle = isVehicle(category)
    ? { plateMasked: (d.plate.trim() ? maskPlate(d.plate) : null) ?? d.plateMasked, stnkValidUntil: d.stnkValidUntil, simClass: d.simClass ?? "C" }
    : undefined;
  const approval = autoApprovalBlocked(d, ctx.rules) ? "manual" : d.approval;
  return {
    title: d.title.trim(),
    category,
    description: d.description.trim(),
    photos: d.photoIds.map((id) => ctx.photos.find((p) => p.id === id)?.src).filter((s): s is string => !!s),
    conditionNotes: d.conditionNotes.trim(),
    pricePerDay,
    pricePerHour: d.pricePerHour || undefined,
    pricePerWeek: d.pricePerWeek || undefined,
    durationDiscount: d.discountOn && d.discountMinDays && d.discountPercent ? { minDays: d.discountMinDays, percent: d.discountPercent } : undefined,
    minDays: d.minDays || undefined,
    maxDays: d.maxDays || undefined,
    itemValue: d.itemValue ?? 0,
    collateralOptions: d.collateral.map(cleanOption),
    location: { lat: d.point.lat, lng: d.point.lng, areaId: d.areaId },
    radiusKm: d.radiusKm,
    handover: d.handover,
    meetingPoint: d.meetingPoint.trim() || undefined,
    handoverHours: handoverHoursOf(d) || undefined,
    rules: {
      lateFeePerDay: lateFeeOf(d),
      lateFeeCapPercent: d.lateFeeCapPercent ?? 100,
      cancellation: d.cancellation.trim(),
      special: d.special.trim() || undefined,
    },
    approval,
    autoApproveMinRating: approval === "otomatis" ? d.autoApproveMinRating : undefined,
    stock: ctx.isToko ? Math.max(1, d.stock) : 1,
    vehicle,
  };
}

/* ---------------------------------------------------------- validation */

export interface ValidationContext {
  bannedKeywords: string[];
  today: string; // YYYY-MM-DD on the demo clock
  isToko: boolean;
}

export const bannedIn = (d: Pick<ListingDraft, "title" | "description">, banned: string[]) => bannedWordsIn(`${d.title} ${d.description}`, banned);

export function validateStep(step: number, d: ListingDraft, ctx: ValidationContext): Errors {
  const e: Errors = {};
  switch (step) {
    case 0: {
      if (d.photoIds.length < PHOTO_MIN) e.photos = `Tambah minimal ${PHOTO_MIN} foto dari sudut berbeda (baru ${d.photoIds.length}).`;
      if (d.conditionNotes.trim().length < 3) e.conditionNotes = "Tulis kondisi barang, walau cuma “mulus, tidak ada cacat”.";
      break;
    }
    case 1: {
      const title = d.title.trim();
      if (!title) e.title = "Judul wajib diisi.";
      else if (title.length < 5) e.title = "Judul terlalu pendek. Contoh: “Panci besar 40 liter”.";
      if (!d.category) e.category = "Pilih kategori barang.";
      if (d.description.trim().length < 20) e.description = "Ceritakan barangnya minimal 20 huruf: ukuran, kelengkapan, cocok untuk apa.";
      const banned = bannedIn(d, ctx.bannedKeywords);
      if (banned.length) e.banned = `Ada kata yang tidak diizinkan: ${banned.map((w) => `“${w}”`).join(", ")}. Barang terlarang tidak bisa disewakan di Sewain.`;
      if (isVehicle(d.category)) {
        if (d.plate.trim()) {
          if (!maskPlate(d.plate)) e.plate = "Format nomor polisi belum benar, contoh: AB 1234 XY.";
        } else if (!d.plateMasked) e.plate = "Isi nomor polisi, contoh: AB 1234 XY.";
        if (!d.stnkValidUntil) e.stnk = "Isi tanggal berlaku STNK.";
        else if (d.stnkValidUntil < ctx.today) e.stnk = "STNK sudah tidak berlaku. Perpanjang dulu sebelum menyewakan.";
        if (!d.simClass) e.simClass = "Pilih golongan SIM yang wajib dimiliki penyewa.";
      }
      break;
    }
    case 2: {
      if (!d.pricePerDay) e.pricePerDay = "Isi harga sewa per hari.";
      else if (d.pricePerDay < 1000) e.pricePerDay = `Harga minimal ${rupiah(1000)}.`;
      if (!d.itemValue) e.itemValue = "Isi perkiraan nilai barang. Ini dipakai untuk saran jaminan.";
      if (d.discountOn) {
        if (!d.discountMinDays || d.discountMinDays < 2) e.discountMinDays = "Diskon berlaku mulai minimal 2 hari.";
        if (!d.discountPercent || d.discountPercent < 1 || d.discountPercent > 90) e.discountPercent = "Diskon antara 1–90%.";
      }
      if (d.minDays && d.maxDays && d.maxDays < d.minDays) e.maxDays = "Durasi maksimal harus sama atau lebih dari durasi minimal.";
      if (ctx.isToko && (d.stock < 1 || d.stock > 99)) e.stock = "Stok antara 1–99.";
      break;
    }
    case 3: {
      if (d.collateral.length === 0) e.collateral = "Pilih minimal satu bentuk jaminan.";
      for (const o of d.collateral) {
        const key = `col:${o.id}`;
        if (o.kind === "identitas" && !o.cards?.length) e[key] = "Pilih minimal satu kartu yang boleh dititipkan.";
        if (o.kind === "deposit") {
          if (o.depositMode === "tetap" && !o.depositAmount) e[key] = "Isi nominal deposit.";
          if (o.depositMode !== "tetap" && (!o.depositPercent || o.depositPercent < 1 || o.depositPercent > 100)) e[key] = "Isi persen deposit antara 1–100.";
          if (o.withIdentity && !o.cards?.length) e[key] = "Pilih kartu yang dititipkan bersama deposit.";
        }
        if (o.kind === "barang") {
          if (!o.description?.trim()) e[key] = "Tulis barang apa yang dititipkan, mis. HP lain atau laptop.";
          else if (!o.estimatedValue) e[key] = "Isi perkiraan nilai barang titipan.";
        }
        if (o.kind === "custom" && !o.description?.trim()) e[key] = "Tulis bentuk jaminannya, mis. BPKB motor.";
      }
      break;
    }
    case 4: {
      if (d.handover.length === 0) e.handover = "Pilih minimal satu cara serah terima.";
      if (!!d.hoursFrom !== !!d.hoursTo) e.hours = "Lengkapi jam mulai dan jam selesai.";
      else if (d.hoursFrom && d.hoursFrom >= d.hoursTo) e.hours = "Jam selesai harus setelah jam mulai.";
      if (d.lateFeePerDay != null && d.lateFeePerDay < 0) e.lateFee = "Denda tidak boleh minus.";
      if (!d.lateFeeCapPercent || d.lateFeeCapPercent < 1 || d.lateFeeCapPercent > 100) e.lateFeeCap = "Batas denda antara 1–100% nilai barang.";
      if (!d.cancellation.trim()) e.cancellation = "Tulis kebijakan pembatalan.";
      break;
    }
  }
  return e;
}

export const stepValid = (step: number, d: ListingDraft, ctx: ValidationContext) => Object.keys(validateStep(step, d, ctx)).length === 0;
