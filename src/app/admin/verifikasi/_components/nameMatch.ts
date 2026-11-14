// FR-A2: the name on the KTP is compared with the profile name.

export type NameMatch = "cocok" | "sebagian" | "beda";

const words = (s: string) =>
  s
    .toUpperCase()
    .normalize("NFKD")
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** "cocok" = same words; "sebagian" = one name is a shorter form of the other; "beda" = otherwise. */
export function matchName(nameOnKtp: string, profileName: string): NameMatch {
  const a = words(nameOnKtp);
  const b = words(profileName);
  if (a.join(" ") === b.join(" ")) return "cocok";
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const set = new Set(long);
  return short.length > 0 && short.every((w) => set.has(w)) ? "sebagian" : "beda";
}

export const MATCH_LABEL: Record<NameMatch, string> = {
  cocok: "Nama cocok",
  sebagian: "Nama beda sebagian",
  beda: "Nama tidak cocok",
};

export const MATCH_HINT: Record<NameMatch, string | null> = {
  cocok: null,
  sebagian: "Nama profil mungkin versi pendek dari nama di KTP. Pastikan wajah di selfie sama dengan foto KTP.",
  beda: "Nama di KTP berbeda dengan nama profil. Tolak kalau orangnya tidak sama, atau minta pengguna memperbaiki nama profil.",
};
