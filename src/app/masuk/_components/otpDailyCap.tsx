"use client";

// 503 `code:"otp_daily_cap"`: the server-wide daily OTP send cap (OTP_MAX_SENDS_PER_DAY, counted per WIB day) is
// reached. Sending is blocked for everyone until 00.00 WIB (`Retry-After`), so both the phone step and "Kirim ulang"
// stay disabled until then, whatever number is typed.

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { Notice } from "@/components/ui/Layout";
import type { ApiResult } from "@/lib/api";

export interface OtpDailyCap {
  message: string;
  /** epoch ms when sending is allowed again */
  until: number;
}

export const useOtpDailyCap = create<{ cap: OtpDailyCap | null }>(() => ({ cap: null }));

const WIB_OFFSET_MS = 7 * 3600_000;

/** Seconds until the next 00.00 WIB (fallback when the server sent no Retry-After). */
export function secondsUntilWibMidnight(now = Date.now()): number {
  const day = 24 * 3600_000;
  const next = Math.floor((now + WIB_OFFSET_MS) / day + 1) * day - WIB_OFFSET_MS;
  return Math.ceil((next - now) / 1000);
}

const FALLBACK = "Maaf, pengiriman kode OTP hari ini sudah mencapai batas.";

/** Recognise the daily cap answer and remember it. Returns the cap, or null for any other answer. */
export function noteDailyCap(r: ApiResult<object>): OtpDailyCap | null {
  if (r.status !== 503 || r.body.code !== "otp_daily_cap") return null;
  const wait = r.body.retryAfter && r.body.retryAfter > 0 ? r.body.retryAfter : secondsUntilWibMidnight();
  const cap = { message: r.body.error?.trim() || FALLBACK, until: Date.now() + wait * 1000 };
  useOtpDailyCap.setState({ cap });
  return cap;
}

/** The active cap, or null once its time has passed (re-renders each minute and when it ends). */
export function useActiveDailyCap(): OtpDailyCap | null {
  const cap = useOtpDailyCap((s) => s.cap);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!cap) return;
    const ms = cap.until - now;
    if (ms <= 0) return;
    const id = window.setTimeout(() => setNow(Date.now()), Math.min(ms, 60_000));
    return () => window.clearTimeout(id);
  }, [cap, now]);
  return cap && cap.until > now ? cap : null;
}

function waitLabel(until: number): string {
  const mins = Math.max(1, Math.ceil((until - Date.now()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} jam${m ? ` ${m} menit` : ""}` : `${m} menit`;
}

/** Polite notice with the server's message and when to try again. */
export function DailyCapNotice({ cap, className }: { cap: OtpDailyCap; className?: string }) {
  const at = new Date(cap.until).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  const tomorrow = /besok/i.test(cap.message);
  return (
    <Notice icon={<Clock className="size-4" />} title="Batas kirim kode hari ini tercapai" tone="outline" className={className}>
      <div role="status" data-testid="otp-daily-cap">
        <p>{cap.message}</p>
        <p className="mt-1 text-caption text-smoke">
          {tomorrow ? "" : "Coba lagi besok, ya. "}Pengiriman kode dibuka lagi pukul {at} WIB (sekitar {waitLabel(cap.until)} lagi).
        </p>
      </div>
    </Notice>
  );
}
