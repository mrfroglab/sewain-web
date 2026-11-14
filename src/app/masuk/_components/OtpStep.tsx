"use client";

import { ArrowLeft, FlaskConical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Help } from "@/components/ui/Field";
import { toast } from "@/lib/toast";
import { DEMO_OTP, OTP_RESEND_SECONDS, formatPhone } from "./helpers";

const LENGTH = DEMO_OTP.length;

/** Step 2: enter the 6-digit OTP. DEMO_MODE shows the code on screen (PRD 7.2). */
export function OtpStep({ phone, onBack, onVerified }: { phone: string; onBack: () => void; onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(OTP_RESEND_SECONDS);
  const timer = useRef<number | undefined>(undefined);

  // Resend countdown (UI only — not business time, so the demo clock is not involved).
  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const verify = (value: string) => {
    if (busy) return;
    if (value.length < LENGTH) return setError("Masukkan 6 digit kode OTP.");
    if (value !== DEMO_OTP) return setError("Kodenya salah. Cek lagi, ya.");
    setError(null);
    setBusy(true);
    timer.current = window.setTimeout(onVerified, 600); // a beat of "memverifikasi…"
  };

  const change = (value: string) => {
    setCode(value);
    if (error) setError(null);
    if (value.length === LENGTH) verify(value);
  };

  const resend = () => {
    setLeft(OTP_RESEND_SECONDS);
    setCode("");
    setError(null);
    toast(`Kode baru dikirim ke ${formatPhone(phone)}. Mode demo: tetap ${DEMO_OTP}.`, "info");
  };

  return (
    <section aria-labelledby="otp-title">
      <button type="button" onClick={onBack} className="-ml-1 mb-4 inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-body-sm font-medium text-ink hover:bg-soft-gray">
        <ArrowLeft className="size-4" /> Ubah nomor
      </button>
      <h1 id="otp-title" className="text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">
        Masukkan kode OTP
      </h1>
      <p className="mt-2 text-body text-smoke">
        Kode 6 digit dikirim ke <b className="font-semibold text-ink">{formatPhone(phone)}</b>.
      </p>

      <div className="mt-5 flex items-center gap-3 rounded-[12px] bg-ink p-3.5 text-white">
        <FlaskConical className="size-4 shrink-0" />
        <p className="min-w-0 flex-1 text-body-sm">
          Mode demo: kode OTP <b className="font-semibold tracking-[0.12em]">{DEMO_OTP}</b> (tanpa SMS)
        </p>
        <button type="button" onClick={() => change(DEMO_OTP)} disabled={busy} className="inline-flex h-9 shrink-0 items-center rounded-control bg-white px-3 text-caption font-semibold text-ink hover:bg-soft-gray disabled:opacity-50">
          Isi otomatis
        </button>
      </div>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          verify(code);
        }}
      >
        <OtpBoxes value={code} onChange={change} invalid={!!error} disabled={busy} />
        {error && <Help error>{error}</Help>}
        <Button type="submit" size="lg" block className="mt-5" loading={busy} disabled={code.length < LENGTH}>
          {busy ? "Memverifikasi…" : "Verifikasi"}
        </Button>
      </form>

      <p className="mt-4 text-center text-body-sm text-smoke" aria-live="polite">
        {left > 0 ? (
          <>
            Tidak menerima kode? Kirim ulang dalam <span className="font-semibold tabular-nums text-ink">0:{String(left).padStart(2, "0")}</span>
          </>
        ) : (
          <button type="button" onClick={resend} className="inline-flex h-9 items-center rounded-control px-3 font-semibold text-ink underline underline-offset-4 hover:bg-soft-gray">
            Kirim ulang kode
          </button>
        )}
      </p>
    </section>
  );
}

/**
 * Six visual boxes backed by one real input: native paste, SMS autofill (one-time-code)
 * and backspace all work, including on Android keyboards that do not report key codes.
 */
function OtpBoxes({ value, onChange, invalid, disabled }: { value: string; onChange: (v: string) => void; invalid?: boolean; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    input.current?.focus();
  }, []);
  const active = Math.min(value.length, LENGTH - 1);

  return (
    <div className="relative">
      <input
        ref={input}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={LENGTH}
        disabled={disabled}
        aria-label="Kode OTP 6 digit"
        aria-invalid={invalid || undefined}
        className="absolute inset-0 z-10 size-full cursor-text text-[16px] opacity-0"
      />
      <div className="grid grid-cols-6 gap-2" aria-hidden>
        {Array.from({ length: LENGTH }, (_, i) => {
          const digit = value[i];
          const isActive = focused && i === active && !disabled;
          return (
            <div
              key={i}
              className={cn(
                "grid h-14 place-items-center rounded-[12px] border bg-white text-[22px] font-semibold tabular-nums text-ink transition-colors",
                invalid ? "border-sale-text" : isActive ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : digit ? "border-ash" : "border-border-gray",
                disabled && "bg-soft-gray",
              )}
            >
              {digit ?? (isActive ? <span className="h-6 w-px animate-pulse bg-ink" /> : null)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
