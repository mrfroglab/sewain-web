// Small helpers shared by /masuk and /verifikasi (both owned by the onboarding flow).

/** DEMO_MODE (PRD 7.2): OTP is simulated with a fixed code, no SMS/WhatsApp is sent. */
export const DEMO_OTP = "123456";
export const OTP_RESEND_SECONDS = 30;

/** "+62 812-3456-7890", "812 3456 7890", "0812 3456 7890" → "081234567890" */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`;
  else if (digits.startsWith("8")) digits = `0${digits}`;
  return digits;
}

/** Indonesian mobile number: 08 + 8–11 digits. */
export const isValidPhone = (phone: string) => /^08\d{8,11}$/.test(phone);

/** "081234567890" → "0812 3456 7890" (only ever shown to the owner of the number). */
export const formatPhone = (phone: string) => phone.replace(/^(\d{4})(\d{4})(\d+)$/, "$1 $2 $3");

/** Only allow in-app paths for ?next= (never "//evil.com" or "javascript:"). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/** A plausible, unused-looking mobile number for the "daftar baru" demo shortcut. */
export function randomPhone(taken: string[]): string {
  for (;;) {
    const phone = `0813${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
    if (!taken.includes(phone)) return phone;
  }
}
