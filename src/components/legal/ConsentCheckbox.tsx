"use client";

import Link from "next/link";
import { useId } from "react";
import { useAppConfig } from "@/lib/config";

/** What the sign-up form sends to POST /api/v1/auth/otp/verify (recorded in `consents`, F6.8). */
export interface ConsentValue {
  accepted: boolean;
  termsVersion: string;
  privacyVersion: string;
}

/**
 * "Saya setuju dengan S&K dan Kebijakan privasi" for the OTP sign-up (phase B). Versions come from the server
 * config (v2) or the draft shipped with this build, so the recorded consent names exactly what the user saw.
 * Links open in a new tab so the half-filled form is not lost.
 */
export function ConsentCheckbox({ checked, onChange, error }: { checked: boolean; onChange: (v: ConsentValue) => void; error?: string }) {
  const id = useId();
  const termsVersion = useAppConfig((s) => s.termsVersion);
  const privacyVersion = useAppConfig((s) => s.privacyVersion);
  const link = "font-medium text-ink underline underline-offset-2";
  return (
    <div>
      <div className="flex items-start gap-3 rounded-[12px] border border-border-gray p-3.5 transition-colors has-[:checked]:border-ink">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange({ accepted: e.target.checked, termsVersion, privacyVersion })}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-ink"
          required
        />
        <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-body-sm text-ink">
          Saya sudah membaca dan setuju dengan{" "}
          <Link href="/syarat" target="_blank" className={link}>
            Syarat & ketentuan
          </Link>{" "}
          serta{" "}
          <Link href="/privasi" target="_blank" className={link}>
            Kebijakan privasi
          </Link>
          , termasuk pemrosesan foto KTP dan selfie untuk verifikasi.
          <span className="mt-0.5 block text-caption text-smoke">
            Versi {termsVersion} / {privacyVersion}
          </span>
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-caption text-sale-text">
          {error}
        </p>
      )}
    </div>
  );
}
