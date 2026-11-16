// Domain model for the Sewain prototype. Mirrors PRD Lampiran A, simplified for a browser-only demo.
// Every timestamp is epoch milliseconds on the *demo clock* (see lib/clock.ts).
// Every date-only value ("tanggal ambil/kembali") is an ISO date string "YYYY-MM-DD".

export type ID = string;

/* ------------------------------------------------------------------ users */

export type AccountType = "individu" | "toko";
export type UserRole = "user" | "admin";
export type UserStatus = "aktif" | "suspend" | "blacklist";
export type VerificationStatus = "belum" | "menunggu" | "terverifikasi" | "ditolak";
export type VerificationMethod = "manual" | "ekyc" | "demo";

export interface StoreInfo {
  name: string; // nama usaha
  areaId: AreaId; // tampil sebagai area, bukan alamat lengkap
  hours: string; // jam operasional, mis. "08.00–21.00"
  nib?: string;
}

export interface User {
  id: ID;
  name: string; // nama lengkap (hanya pemilik akun & admin yang melihat)
  nickname?: string; // nama panggilan publik, mis. "Bu Tini" (default: nama depan)
  /** Only the account owner and admins receive it in a scoped snapshot (v2). */
  phone?: string;
  email?: string;
  role: UserRole;
  accountType: AccountType;
  store?: StoreInfo;
  verification: {
    status: VerificationStatus;
    method?: VerificationMethod;
    verifiedAt?: number;
    nikMasked?: string; // "3404********0003" — never shown to other users (FR-A5)
  };
  areaId: AreaId;
  campus?: string; // "UGM"
  studentVerified?: boolean; // email .ac.id / KTM (P1)
  earlyLender?: boolean;
  bio?: string;
  joinedAt: number;
  /** Private in a scoped snapshot (own profile + admin only). */
  strikes?: number;
  status: UserStatus;
  /** seeded historic reputation; live reviews are added on top */
  baseRating?: number;
  baseRatingCount?: number;
  /** Demo accounts appear in the quick account switcher. */
  demo?: { label: string; persona: string };
  /** Server-computed public aggregates (v2 scoped snapshot), since they depend on other people's bookings. */
  publicStats?: PublicStats;
}

export interface PublicStats {
  completedRentals: number;
  disputes: number;
  trustScore: number;
  strikes?: number;
}

export interface VerificationRequest {
  id: ID;
  userId: ID;
  submittedAt: number;
  method: VerificationMethod;
  nameOnKtp: string;
  nikMasked: string;
  ktpPhotoId?: ID;
  selfiePhotoId?: ID;
  status: "menunggu" | "disetujui" | "ditolak";
  reviewedAt?: number;
  reviewedBy?: ID;
  reason?: string;
  /** true when the simulated eKYC approved it instantly (prototype). */
  auto: boolean;
}

/* ------------------------------------------------------------- geography */

export type AreaId =
  | "ugm"
  | "pogung"
  | "karangmalang"
  | "sendowo"
  | "karangwuni"
  | "klebengan"
  | "terban"
  | "condongcatur";

export interface Area {
  id: AreaId;
  name: string; // "Pogung"
  label: string; // "Pogung, Sinduadi"
  lat: number;
  lng: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/* -------------------------------------------------------------- listings */

export type CategoryId =
  | "camping"
  | "kamera"
  | "pakaian-acara"
  | "elektronik"
  | "alat-masak"
  | "musim-hujan"
  | "kendaraan"
  | "olahraga";

export type RiskType = "kendaraan" | "elektronik" | "keselamatan" | "listrik";

export interface Category {
  id: CategoryId;
  name: string; // "Camping & Hiking"
  descriptor: string; // short line for category card
  examples: string; // "Tenda, carrier, sleeping bag"
  image: string; // landscape 1.8:1
  risk?: RiskType; // high-risk category (PRD 12.3)
  checklist?: string[]; // checklist fungsi (P1)
}

export type HandoverMethod = "cod" | "jemput" | "kurir";

export type CollateralKind = "identitas" | "deposit" | "barang" | "custom";

export interface CollateralOption {
  id: ID;
  kind: CollateralKind;
  /** identitas: accepted cards, e.g. ["KTM", "SIM", "Kartu pelajar"] */
  cards?: string[];
  /** deposit */
  depositMode?: "tetap" | "persen";
  depositAmount?: number; // when tetap
  depositPercent?: number; // when persen, % of item value
  /** deposit + titip kartu identitas sekaligus */
  withIdentity?: boolean;
  /** barang / custom: free text, e.g. "BPKB motor", "Titip HP lain" */
  description?: string;
  estimatedValue?: number; // barang / custom
}

export interface ListingRules {
  lateFeePerDay: number; // default = harga harian
  lateFeeCapPercent: number; // default 100 (% of item value)
  cancellation: string; // "Gratis jika batal > 24 jam sebelum serah terima"
  special?: string; // syarat khusus (teks bebas)
}

export interface VehicleInfo {
  plateMasked: string; // "AB 4*** **"
  stnkValidUntil: string; // ISO date
  simClass: "A" | "C";
}

export type ListingStatus = "aktif" | "jeda" | "diturunkan";

export interface Listing {
  id: ID;
  slug: string; // used for image file names
  ownerId: ID;
  title: string;
  category: CategoryId;
  description: string;
  photos: string[]; // reference photos (≥3), URLs under /img or "idb:<photoId>"
  conditionNotes: string; // kondisi existing (FR-L3)
  pricePerDay: number;
  pricePerHour?: number;
  pricePerWeek?: number;
  durationDiscount?: { minDays: number; percent: number };
  minDays?: number;
  maxDays?: number;
  itemValue: number; // nilai barang saat ini (estimasi)
  collateralOptions: CollateralOption[];
  location: GeoPoint & { areaId: AreaId };
  radiusKm: number; // radius jangkauan penyedia
  handover: HandoverMethod[];
  meetingPoint?: string; // titik temu favorit (detail terbuka setelah ACCEPTED)
  handoverHours?: string; // "16.00–21.00"
  rules: ListingRules;
  approval: "manual" | "otomatis";
  autoApproveMinRating?: number;
  stock: number; // > 1 only for akun Toko
  vehicle?: VehicleInfo;
  status: ListingStatus;
  createdAt: number;
  /** seeded historic aggregate; live reviews are added on top (see lib/selectors.ts) */
  baseRating: number;
  baseRatingCount: number;
  rentCount: number;
}

/* -------------------------------------------------------------- bookings */

export type BookingStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ACTIVE"
  | "RETURNED"
  | "COMPLETED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED"
  | "DISPUTED"
  | "RESOLVED";

export type CommissionMode = "persen" | "flat";
export type CommissionBearer = "penyewa" | "penyedia" | "split";

export interface CommissionConfig {
  active: boolean; // pilot: false (0%), "seandainya aktif" still recorded (FR-K6)
  mode: CommissionMode;
  percent: number; // used when mode = persen
  flat: number; // used when mode = flat
  min?: number;
  max?: number;
  bearer: CommissionBearer;
  splitRenterPercent: number; // share paid by penyewa when bearer = split (0–100)
  updatedAt: number;
  updatedBy: ID;
}

export interface CommissionSnapshot {
  active: boolean;
  mode: CommissionMode;
  rate: number; // percent or flat amount
  min?: number;
  max?: number;
  bearer: CommissionBearer;
  splitRenterPercent: number;
  /** commission "seandainya aktif" — always computed (FR-K6) */
  amount: number;
  /** what is actually charged now (0 while inactive) */
  charged: number;
  renterPays: number;
  providerPays: number;
}

export interface RentQuote {
  days: number;
  base: number; // before discount
  discount: number;
  total: number; // nilai sewa
  breakdown: string; // "3 hari × Rp25.000"
}

export interface Agreement {
  createdAt: number;
  listingId: ID;
  listingTitle: string;
  category: CategoryId;
  itemValue: number;
  renterName: string; // first names only
  providerName: string;
  startDate: string;
  endDate: string;
  quote: RentQuote;
  collateral: CollateralOption;
  collateralValue: number; // monetary value of collateral (deposit / estimated)
  handover: HandoverMethod;
  lateFeePerDay: number;
  lateFeeCap: number; // rupiah
  cancellation: string;
  special?: string;
  conditionNotes: string;
  referencePhotos: string[];
  commission: CommissionSnapshot;
  /** SHA-256 of the canonical JSON snapshot (bukti) */
  hash: string;
  renterAgreedAt?: number;
  providerAgreedAt?: number;
}

/** "langsung" = paid directly to the provider outside Sewain (payment mode "offline", pilot). */
export type PaymentMethod = "qris" | "va" | "ewallet" | "tunai" | "langsung";

export interface PaymentInfo {
  status: "belum" | "lunas";
  method?: PaymentMethod;
  paidAt?: number;
  rent: number;
  deposit: number;
  commission: number; // charged to renter
  total: number;
}

export interface Booking {
  id: ID;
  code: string; // "SWN-2611-0042" — used in watermark
  listingId: ID;
  renterId: ID;
  providerId: ID;
  startDate: string; // tanggal ambil
  endDate: string; // tanggal kembali
  handover: HandoverMethod;
  collateral: CollateralOption; // chosen option (copied)
  note?: string;
  status: BookingStatus;
  overdue: boolean; // OVERDUE flag (PRD 8.3)
  createdAt: number;
  expiresAt: number; // REQUESTED + 24h
  acceptedAt?: number;
  declinedAt?: number;
  declineReason?: string;
  cancelledAt?: number;
  cancelledBy?: ID;
  cancelReason?: string;
  activeAt?: number;
  returnedAt?: number;
  completedAt?: number;
  completedAuto?: boolean;
  resolvedAt?: number;
  agreement: Agreement;
  payment: PaymentInfo;
  meetingPointDetail?: string; // revealed after ACCEPTED (FR-S6)
  checkout?: {
    photoIds: ID[];
    collateralPhotoIds: ID[];
    odometer?: string;
    fuel?: string;
    submittedAt: number;
    renterAgreedAt?: number;
    providerAgreedAt?: number;
  };
  checkin?: {
    photoIds: ID[];
    odometer?: string;
    fuel?: string;
    result: "sesuai" | "masalah";
    problemType?: string;
    problemNote?: string;
    at: number;
  };
  collateralReturn?: {
    providerReturnedAt?: number;
    renterConfirmedAt?: number;
    autoCompleteAt?: number; // providerReturnedAt + 48h
  };
  disputeId?: ID;
}

/* ---------------------------------------------------------------- photos */

export type PhotoStage =
  | "referensi"
  | "checkout"
  | "checkin"
  | "jaminan"
  | "masalah"
  | "chat"
  | "ktp"
  | "selfie"
  | "sengketa";

export type PhotoSource = "kamera" | "galeri" | "demo";

export interface PhotoRecord {
  id: ID;
  bookingId?: ID;
  stage: PhotoStage;
  uploaderId: ID;
  /** "/img/..." for seeded photos, "idb:<id>" for photos captured in this browser */
  src: string;
  sha256: string;
  serverTimestamp: number; // demo clock time at "upload" (FR-P2)
  source: PhotoSource; // "galeri" is labelled with lower evidential weight (FR-P1)
  angle?: string; // "Depan", "Samping", "Close-up lecet"
  width?: number;
  height?: number;
  bytes?: number;
}

/* ------------------------------------------------------------------ chat */

export interface Message {
  id: ID;
  bookingId: ID;
  senderId: ID | "system";
  text?: string;
  photoId?: ID;
  at: number;
}

/* --------------------------------------------------------------- reviews */

export interface Review {
  id: ID;
  bookingId: ID;
  listingId: ID;
  fromId: ID;
  toId: ID;
  /** role of the reviewer in that booking */
  fromRole: "penyewa" | "penyedia";
  rating: number; // 1–5
  comment: string;
  createdAt: number;
  /** v2: when the review became public (FR-T2). Preferred over the client-side rule when present. */
  visibleAt?: number;
}

/* ------------------------------------------------- reports, disputes, admin */

export interface Report {
  id: ID;
  reporterId: ID;
  targetType: "listing" | "user";
  targetId: ID;
  reason: string;
  detail?: string;
  createdAt: number;
  status: "baru" | "ditindak" | "ditolak";
  resolution?: string;
  resolvedAt?: number;
  resolvedBy?: ID;
}

export type DisputeCase =
  | "lecet-ringan"
  | "rusak-ringan"
  | "rusak-berat"
  | "hilang"
  | "telat"
  | "tidak-kembali"
  | "jaminan-tidak-kembali"
  | "tidak-sesuai"
  | "batal-sepihak"
  | "no-show"
  | "deposit-ditahan"
  | "kendaraan"
  | "lainnya";

export type ProposalType =
  | "potong-deposit"
  | "ganti-perbaikan"
  | "ganti-nilai"
  | "perpanjang"
  | "tanpa-kompensasi";

export interface DisputeProposal {
  id: ID;
  byId: ID;
  type: ProposalType;
  amount?: number;
  note?: string;
  at: number;
  status: "diajukan" | "diterima" | "ditolak";
}

export type DisputeLayer = "L1" | "L2" | "L3";

export interface Dispute {
  id: ID;
  bookingId: ID;
  openedBy: ID;
  caseType: DisputeCase;
  description: string;
  photoIds: ID[];
  createdAt: number;
  layer: DisputeLayer;
  status: "negosiasi" | "mediasi" | "selesai";
  l1Deadline: number; // createdAt + 48h
  proposals: DisputeProposal[];
  recommendation?: { text: string; amount?: number; byAdminId: ID; at: number };
  outcome?: string;
  resolvedAt?: number;
}

export interface Strike {
  id: ID;
  userId: ID;
  reason: string;
  severity: "ringan" | "berat";
  bookingId?: ID;
  at: number;
  byAdminId: ID;
}

export interface CollateralRules {
  lowMax: number; // < lowMax → titip identitas cukup (default 500.000)
  midMax: number; // lowMax–midMax → identitas + deposit midDepositPercent (default 2.000.000)
  midDepositPercent: number; // default 25
  highDepositPercent: number; // > midMax → deposit highDepositPercent or custom senilai (default 40)
  vehicleDepositPercent: number; // kendaraan → identitas + deposit/BPKB/custom (default 30)
  highValueBadge: number; // badge "Barang bernilai tinggi" (default 2.000.000)
  updatedAt: number;
  updatedBy: ID;
}

export interface AuditEntry {
  id: ID;
  actorId: ID;
  action: string; // "komisi.ubah", "user.suspend", ...
  target: string;
  oldValue?: string;
  newValue?: string;
  at: number;
}

export interface WantedPost {
  id: ID;
  requesterId: ID;
  title: string;
  description: string;
  category?: CategoryId;
  areaId: AreaId;
  location: GeoPoint;
  radiusKm: number;
  neededFrom?: string;
  neededUntil?: string;
  budgetPerDay?: number;
  createdAt: number;
  status: "terbuka" | "terpenuhi" | "ditutup";
  offers: { id: ID; providerId: ID; listingId?: ID; message: string; at: number }[];
}

export type NotificationKind = "booking" | "chat" | "sengketa" | "papan" | "sistem" | "verifikasi";

export interface AppNotification {
  id: ID;
  userId: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  at: number;
  read: boolean;
}

export interface SearchPrefs {
  origin: "area" | "lokasi-saya";
  areaId: AreaId;
  point: GeoPoint; // resolved search point
  radiusKm: number; // 1 | 3 | 5 | 10 | 25, default 3 (FR-S1)
}

/* ------------------------------------------------------------ app state */

/** Everything persisted in the browser (localStorage). Photo blobs live in IndexedDB. */
export interface DataState {
  version: number;
  seeded: boolean;
  seedBase: number; // real Date.now() when the demo data was generated
  clockOffset: number; // demo clock offset in ms ("percepat waktu")
  users: User[];
  verifications: VerificationRequest[];
  listings: Listing[];
  bookings: Booking[];
  photos: PhotoRecord[];
  messages: Message[];
  reviews: Review[];
  reports: Report[];
  disputes: Dispute[];
  strikes: Strike[];
  commission: CommissionConfig;
  collateralRules: CollateralRules;
  bannedKeywords: string[];
  audit: AuditEntry[];
  wanted: WantedPost[];
  notifications: AppNotification[];
  favorites: Record<ID, ID[]>;
  /** last read timestamp per "userId:bookingId" chat thread */
  chatReads: Record<string, number>;
  search: SearchPrefs;
  bookingCounter: number;
  /**
   * "full" = v1 snapshot with everyone's data (demo). "scoped" = v2 snapshot limited to what this viewer may see
   * (ROADMAP §4): aggregates over other people's data must then come from the server, never be computed locally.
   */
  scope: SnapshotScope;
  viewerId: ID | null;
  /** v2: busy date ranges per listing (other people's bookings, without who). See docs/v2-api-needs.md #5. */
  listingBusy?: Record<ID, BusyRange[]>;
}

export type SnapshotScope = "full" | "scoped";

export interface BusyRange {
  start: string;
  end: string;
  /** units taken (stock-aware) */
  count: number;
}
