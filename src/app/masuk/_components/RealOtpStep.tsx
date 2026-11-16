"use client";

import { ArrowLeft, ArrowRight, FlaskConical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConsentCheckbox } from "@/components/legal/ConsentCheckbox";
import { Button } from "@/components/ui/Button";
import { Help } from "@/components/ui/Field";
import { requestOtp, verifyOtp, type OtpRequestResult, type OtpVerifyResult } from "@/lib/account";
import { useAppConfig } from "@/lib/config";
import type { SessionTransport } from "@/lib/session";
import { toast } from "@/lib/toast";
import { formatPhone } from "./helpers";
import { DailyCapNotice, noteDailyCap, useActiveDailyCap } from "./otpDailyCap";
import { OtpBoxes } from "./OtpStep";

const LENGTH = 6;

export interface VerifiedLogin {
  result: OtpVerifyResult;
  transport: Exclude<SessionTransport, "demo">;
}

/**
 * Demo/staging servers allow a per-tab bearer session (SESSION_BEARER_LOGIN), which keeps the multi-account demo
 * working and lets a local web talk to the staging API cross-site. Production: HttpOnly cookie only.
 */
async function verify(phone: string, code: string, acceptTerms: boolean) {
  const preferBearer = useAppConfig.getState().demoMode;
  if (preferBearer) {
    const r = await verifyOtp({ phone, code, acceptTerms, transport: "bearer" });
    // "Mode token tidak tersedia": this server only does cookies. The code is still valid.
    if (r.body.ok || r.status !== 400 || r.body.code || !/token/i.test(r.body.error ?? "")) return { r, transport: "bearer" as const };
  }
  return { r: await verifyOtp({ phone, code, acceptTerms, transport: "cookie" }), transport: "cookie" as const };
}

/** Step 2 (real OTP, F6.1): the 6-digit code sent over WhatsApp/SMS. Provider `echo` shows it as a staging test aid. */
export function RealOtpStep({
  phone,
  challenge,
  onBack,
  onVerified,
  onNeedsConsent,
}: {
  phone: string;
  challenge: OtpRequestResult;
  onBack: () => void;
  onVerified: (login: VerifiedLogin) => void;
  onNeedsConsent: (code: string) => void;
}) {
  const [current, setCurrent] = useState(challenge);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [left, setLeft] = useState(Math.max(0, Math.round(challenge.resendAfter ?? 60)));
  const busyRef = useRef(false);
  const cap = useActiveDailyCap();

  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);

  const submit = async (value: string) => {
    if (busyRef.current) return;
    if (value.length < LENGTH) return setError("Masukkan 6 digit kode OTP.");
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const { r, transport } = await verify(phone, value, false);
    busyRef.current = false;
    setBusy(false);
    if (r.body.ok) return onVerified({ result: r.body, transport });
    if (r.body.code === "consent_required") return onNeedsConsent(value);
    setError(r.body.error ?? "Kodenya salah. Cek lagi, ya.");
    if (r.status === 429) setCode("");
  };

  const change = (value: string) => {
    setCode(value);
    if (error) setError(null);
    if (value.length === LENGTH) void submit(value);
  };

  const resend = async () => {
    setResending(true);
    const r = await requestOtp(phone);
    setResending(false);
    const capped = noteDailyCap(r);
    if (capped) return setLeft(Math.max(1, Math.ceil((capped.until - Date.now()) / 1000)));
    if (!r.body.ok) {
      if (r.body.retryAfter) setLeft(Math.round(r.body.retryAfter));
      return toast(r.body.error ?? "Gagal mengirim ulang kode.", "error");
    }
    setCurrent(r.body);
    setLeft(Math.max(0, Math.round(r.body.resendAfter ?? 60)));
    setCode("");
    setError(null);
    toast(`Kode baru dikirim ke ${formatPhone(phone)}.`, "info");
  };

  const via = current.channel === "zenziva" ? "WhatsApp atau SMS" : "WhatsApp/SMS";
  const hh = Math.floor(left / 3600);
  const mm = hh ? String(Math.floor((left % 3600) / 60)).padStart(2, "0") : String(Math.floor(left / 60));
  const ss = String(left % 60).padStart(2, "0");

  return (
    <section aria-labelledby="otp-title">
      <button type="button" onClick={onBack} className="-ml-1 mb-4 inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-body-sm font-medium text-ink hover:bg-soft-gray">
        <ArrowLeft className="size-4" /> Ubah nomor
      </button>
      <h1 id="otp-title" className="text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">
        Masukkan kode OTP
      </h1>
      <p className="mt-2 text-body text-smoke">
        Kode 6 digit dikirim lewat {via} ke <b className="font-semibold text-ink">{formatPhone(phone)}</b>. Berlaku 5 menit.
      </p>

      {current.devCode && (
        <div className="mt-5 flex items-center gap-3 rounded-[12px] border border-dashed border-ink p-3.5" data-testid="staging-otp">
          <FlaskConical className="size-4 shrink-0 text-ink" />
          <p className="min-w-0 flex-1 text-body-sm text-ink">
            Kode uji staging: <b className="font-semibold tracking-[0.12em] tabular-nums">{current.devCode}</b>
            <span className="block text-caption text-smoke">Hanya muncul di server uji. Di produksi kode dikirim ke HP.</span>
          </p>
          <button type="button" onClick={() => change(current.devCode!)} disabled={busy} className="inline-flex h-9 shrink-0 items-center rounded-control bg-ink px-3 text-caption font-semibold text-white hover:bg-ink/90 disabled:opacity-50">
            Isi otomatis
          </button>
        </div>
      )}

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(code);
        }}
      >
        <OtpBoxes value={code} onChange={change} invalid={!!error} disabled={busy} />
        {error && <Help error>{error}</Help>}
        <Button type="submit" size="lg" block className="mt-5" loading={busy} disabled={code.length < LENGTH}>
          {busy ? "Memverifikasi…" : "Verifikasi"}
        </Button>
      </form>

      {cap && <DailyCapNotice cap={cap} className="mt-4" />}
      <p className="mt-4 text-center text-body-sm text-smoke" aria-live="polite">
        {cap ? (
          <button type="button" disabled className="inline-flex h-9 items-center rounded-control px-3 font-semibold text-ink underline underline-offset-4 disabled:opacity-50">
            Kirim ulang kode
          </button>
        ) : left > 0 ? (
          <>
            Tidak menerima kode? Kirim ulang dalam{" "}
            <span className="font-semibold tabular-nums text-ink">
              {hh ? `${hh}:` : ""}
              {mm}:{ss}
            </span>
          </>
        ) : (
          <button type="button" onClick={resend} disabled={resending} className="inline-flex h-9 items-center rounded-control px-3 font-semibold text-ink underline underline-offset-4 hover:bg-soft-gray disabled:opacity-50">
            {resending ? "Mengirim…" : "Kirim ulang kode"}
          </button>
        )}
      </p>
    </section>
  );
}

/**
 * New number only: the server confirmed the code and asks for consent (`consent_required`, the code is not used up).
 * The recorded consent names the versions in /api/v1/config (F6.8).
 */
export function ConsentStep({ phone, code, onBack, onVerified }: { phone: string; code: string; onBack: () => void; onVerified: (login: VerifiedLogin) => void }) {
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!checked) return setError("Centang dulu persetujuannya untuk membuat akun.");
    setBusy(true);
    setError(null);
    const { r, transport } = await verify(phone, code, true);
    setBusy(false);
    if (r.body.ok) return onVerified({ result: r.body, transport });
    setError(r.body.error ?? "Gagal membuat akun.");
  };

  return (
    <section aria-labelledby="consent-title">
      <button type="button" onClick={onBack} className="-ml-1 mb-4 inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-body-sm font-medium text-ink hover:bg-soft-gray">
        <ArrowLeft className="size-4" /> Pakai nomor lain
      </button>
      <h1 id="consent-title" className="text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">
        Buat akun baru
      </h1>
      <p className="mt-2 text-body text-smoke">
        Nomor <b className="font-semibold text-ink">{formatPhone(phone)}</b> sudah terverifikasi dan belum terdaftar. Sebelum lanjut, baca dan setujui dulu aturan mainnya.
      </p>
      <div className="mt-6">
        <ConsentCheckbox
          checked={checked}
          onChange={(v) => {
            setChecked(v.accepted);
            if (v.accepted) setError(null);
          }}
          error={error ?? undefined}
        />
      </div>
      <Button size="lg" block className="mt-5" loading={busy} onClick={submit}>
        Setuju dan lanjut <ArrowRight className="size-4" />
      </Button>
      <p className="mt-3 text-center text-caption text-smoke">Berikutnya: nama dan tipe akun, lalu verifikasi KTP + selfie.</p>
    </section>
  );
}
