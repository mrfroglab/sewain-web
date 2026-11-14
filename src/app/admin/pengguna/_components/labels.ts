import type { User } from "@/lib/types";

export const VERIFICATION_LABEL: Record<User["verification"]["status"], string> = {
  terverifikasi: "Terverifikasi",
  menunggu: "Menunggu review",
  belum: "Belum verifikasi",
  ditolak: "Verifikasi ditolak",
};

export const STATUS_LABEL: Record<User["status"], string> = {
  aktif: "Aktif",
  suspend: "Ditangguhkan",
  blacklist: "Diblokir",
};

export const METHOD_LABEL = { ekyc: "eKYC (simulasi)", demo: "mode demo", manual: "review manual" } as const;

/** PRD 11.2 L3 ladder: strike → suspend → blacklist (NIK). */
export const LADDER = ["Aktif", "Strike", "Suspend", "Blacklist NIK"] as const;

export function ladderStep(u: Pick<User, "status" | "strikes">): number {
  if (u.status === "blacklist") return 3;
  if (u.status === "suspend") return 2;
  return u.strikes > 0 ? 1 : 0;
}

export const accountLabel = (u: User) => (u.accountType === "toko" ? `Toko${u.store ? ` · ${u.store.name}` : ""}` : "Individu");
