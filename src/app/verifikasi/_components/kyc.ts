// Simulated eKYC helpers (PRD 7.2, FR-A2..A4). Nothing here talks to a vendor.

import type { Capture } from "@/components/photo/CameraCapture";
import { saveDemoPhoto, savePhoto } from "@/lib/photos";
import type { ID, VerificationMethod } from "@/lib/types";

export const METHOD_LABEL: Record<VerificationMethod, string> = {
  ekyc: "scan KTP + selfie",
  manual: "tinjauan admin",
  demo: "mode demo (dilewati)",
};

const pad = (n: number, len = 2) => String(n).padStart(len, "0");
const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Plausible 16-digit NIK: 3404 (Sleman) + kecamatan + ddmmyy (born 2000–2006) + serial. */
export function randomNik(): string {
  return `3404${pad(rand(1, 17))}${pad(rand(1, 28))}${pad(rand(1, 12))}${pad(rand(0, 6))}${pad(rand(1, 9999), 4)}`;
}

/** "3404051203040011" → "3404 •••• •••• 0011" */
export const maskNikPretty = (nik: string) => (nik.length >= 8 ? `${nik.slice(0, 4)} •••• •••• ${nik.slice(-4)}` : nik);

const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** FR-A2: name on KTP vs profile name — case-insensitive "contains" or same first name. */
export function nameMatches(profileName: string, ktpName: string): boolean {
  const a = normName(profileName);
  const b = normName(ktpName);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const fa = a.split(" ")[0];
  return fa.length >= 2 && fa === b.split(" ")[0];
}

export const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Compress + hash + store a KTP/selfie capture; returns the photo id (undefined if saving failed). */
export async function persistCapture(capture: Capture, stage: "ktp" | "selfie", uploaderId: ID): Promise<ID | undefined> {
  try {
    const record =
      capture.kind === "blob"
        ? await savePhoto({ blob: capture.blob, stage, uploaderId, source: capture.source, maxSide: 1200 })
        : await saveDemoPhoto(capture.url, { stage, uploaderId });
    return record.id;
  } catch {
    return undefined;
  }
}
