// Formatting helpers. All user-facing copy is Bahasa Indonesia (santai, jelas).

const idr = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 25000 → "Rp25.000" */
export const rupiah = (n: number) => `Rp${idr.format(Math.round(n))}`;

/** 25000 → "Rp25rb", 1500000 → "Rp1,5 jt" (compact, for map pins / chips) */
export function rupiahShort(n: number): string {
  if (n >= 1_000_000) return `Rp${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (n >= 1_000) return `Rp${Math.round(n / 1_000)}rb`;
  return rupiah(n);
}

export const number = (n: number) => idr.format(n);

/** Distance shown to the public is always rounded (FR-S6): "± 1,2 km", "< 0,5 km". */
export function formatDistance(km: number): string {
  if (km < 0.5) return "< 0,5 km";
  if (km < 10) return `± ${km.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
  return `± ${Math.round(km)} km`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** epoch ms → "YYYY-MM-DD" in the browser's local timezone */
export function isoDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" → epoch ms at local midnight */
export function parseIsoDate(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

export const endOfDay = (iso: string) => parseIsoDate(iso) + 86_400_000 - 1;

export const addDays = (iso: string, days: number) => isoDate(parseIsoDate(iso) + days * 86_400_000 + 3_600_000);

/** Number of rental days between pick-up and return date (min 1). */
export function diffDays(startIso: string, endIso: string): number {
  return Math.max(1, Math.round((parseIsoDate(endIso) - parseIsoDate(startIso)) / 86_400_000));
}

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "2026-11-14" → "Sab, 14 Nov" */
export function formatDate(iso: string, withYear = false): string {
  const d = new Date(parseIsoDate(iso));
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ""}`;
}

/** "14–16 Nov" or "30 Nov – 2 Des" */
export function formatDateRange(startIso: string, endIso: string): string {
  const a = new Date(parseIsoDate(startIso));
  const b = new Date(parseIsoDate(endIso));
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`;
  return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
}

/** epoch ms → "14 Nov 2026, 13.05" */
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

/** epoch ms → "13.05" */
export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

/** "baru saja", "5 menit lalu", "2 jam lalu", "3 hari lalu"; future → "dalam 4 jam" */
export function relativeTime(ms: number, now: number): string {
  const diff = now - ms;
  const abs = Math.abs(diff);
  const fmt = (v: number, unit: string) => (diff >= 0 ? `${v} ${unit} lalu` : `dalam ${v} ${unit}`);
  if (abs < 60_000) return diff >= 0 ? "baru saja" : "sebentar lagi";
  if (abs < 3_600_000) return fmt(Math.round(abs / 60_000), "menit");
  if (abs < 86_400_000) return fmt(Math.round(abs / 3_600_000), "jam");
  if (abs < 30 * 86_400_000) return fmt(Math.round(abs / 86_400_000), "hari");
  return formatDateTime(ms);
}

/** Remaining time "23 jam 10 menit" for countdowns. */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "0 menit";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 48) return `${Math.floor(h / 24)} hari ${h % 24} jam`;
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function initials(name: string): string {
  const parts = name.replace(/^(Bu|Pak|Mas|Mbak)\s+/i, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** "3404123456780003" → "3404********0003" */
export const maskNik = (nik: string) => (nik.length >= 8 ? `${nik.slice(0, 4)}${"*".repeat(nik.length - 8)}${nik.slice(-4)}` : nik);

/** "081234567890" → "0812-****-7890" */
export const maskPhone = (p?: string) => (!p ? "-" : p.length >= 8 ? `${p.slice(0, 4)}-****-${p.slice(-4)}` : p);

export const plural = (n: number, word: string) => `${number(n)} ${word}`;
