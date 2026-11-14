// Human labels for audit actions ("komisi.ubah", "user.suspend", ...) and the filter groups (FR-K7).

export const AUDIT_GROUPS = [
  { key: "komisi", label: "Komisi" },
  { key: "jaminan", label: "Jaminan" },
  { key: "user", label: "Pengguna" },
  { key: "laporan", label: "Laporan" },
  { key: "listing", label: "Listing" },
  { key: "sengketa", label: "Sengketa" },
  { key: "verifikasi", label: "Verifikasi" },
  { key: "kata-terlarang", label: "Kata terlarang" },
] as const;

export type AuditGroup = (typeof AUDIT_GROUPS)[number]["key"];

const ACTION_LABEL: Record<string, string> = {
  "komisi.ubah": "Ubah komisi",
  "jaminan.ubah": "Ubah saran jaminan",
  "user.strike": "Strike",
  "user.suspend": "Suspend",
  "user.blacklist": "Blacklist NIK",
  "user.aktif": "Pulihkan akun",
  "laporan.ditindak": "Laporan ditindak",
  "laporan.ditolak": "Laporan ditolak",
  "listing.aktif": "Listing ditayangkan",
  "listing.jeda": "Listing dijeda",
  "listing.diturunkan": "Listing diturunkan",
  "listing.turunkan": "Listing diturunkan",
  "sengketa.rekomendasi": "Rekomendasi sengketa",
  "sengketa.selesai": "Sengketa ditutup",
  "verifikasi.setuju": "Verifikasi disetujui",
  "verifikasi.tolak": "Verifikasi ditolak",
  "kata-terlarang.ubah": "Ubah kata terlarang",
};

export const auditGroup = (action: string) => action.split(".")[0];

export const auditLabel = (action: string) => ACTION_LABEL[action] ?? action;
