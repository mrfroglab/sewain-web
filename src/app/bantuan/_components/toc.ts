// In-page sections of /bantuan. The ids are linked from the footer, the home page and other routes
// (`/bantuan#jaminan` etc.), so keep them exactly as they are.
export const HELP_SECTIONS = [
  { id: "cara-kerja", label: "Cara kerja" },
  { id: "jaminan", label: "Jaminan" },
  { id: "foto-bukti", label: "Foto bukti" },
  { id: "sengketa", label: "Sengketa" },
  { id: "aman", label: "Tips aman" },
  { id: "verifikasi", label: "Verifikasi" },
  { id: "komisi", label: "Komisi" },
  { id: "larangan", label: "Barang terlarang" },
  { id: "kendaraan", label: "Kendaraan & berisiko" },
  { id: "syarat", label: "Syarat & ketentuan" },
  { id: "privasi", label: "Privasi" },
  { id: "kontak", label: "Kontak" },
] as const;

export type HelpSectionId = (typeof HELP_SECTIONS)[number]["id"];
