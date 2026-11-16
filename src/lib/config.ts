"use client";

// App configuration from the server (GET /api/v1/config, v2). v1 has no such endpoint (404): the app then keeps the
// demo defaults below, which is exactly how the demo behaves today.

import { create } from "zustand";
import { fetchConfig, type ServerConfig } from "./api";

/**
 * simulated = "Bayar via Sewain (simulasi)" (demo).
 * offline   = pilot: renter pays the provider directly once the item is in hand, nothing paid in the app.
 * gateway   = real payments (Fase 8), not available yet.
 */
export type PaymentMode = "simulated" | "offline" | "gateway";

export interface AppConfig {
  /** true once /api/v1/config answered (v2 server) */
  fromServer: boolean;
  appEnv: string;
  demoMode: boolean;
  paymentMode: PaymentMode;
  otpProvider: string | null;
  vapidPublicKey: string | null;
  termsVersion: string;
  privacyVersion: string;
}

/** Versions of the draft legal pages shipped with this build (src/app/syarat, src/app/privasi). */
export const LEGAL_DRAFT = { termsVersion: "0.1-draf", privacyVersion: "0.1-draf", date: "16 November 2026" } as const;

const DEFAULTS: AppConfig = {
  fromServer: false,
  appEnv: "demo",
  demoMode: true,
  paymentMode: "simulated",
  otpProvider: null,
  vapidPublicKey: null,
  termsVersion: LEGAL_DRAFT.termsVersion,
  privacyVersion: LEGAL_DRAFT.privacyVersion,
};

const PAYMENT_MODES: PaymentMode[] = ["simulated", "offline", "gateway"];

/** Dev-only override to try the payment UIs without a v2 server: NEXT_PUBLIC_PAYMENT_MODE=offline|gateway. */
const DEV_PAYMENT_MODE = process.env.NODE_ENV !== "production" ? (process.env.NEXT_PUBLIC_PAYMENT_MODE as PaymentMode | undefined) : undefined;

export const useAppConfig = create<AppConfig>(() => ({
  ...DEFAULTS,
  paymentMode: DEV_PAYMENT_MODE && PAYMENT_MODES.includes(DEV_PAYMENT_MODE) ? DEV_PAYMENT_MODE : DEFAULTS.paymentMode,
}));

export function applyServerConfig(c: ServerConfig) {
  const mode = PAYMENT_MODES.includes(c.paymentMode as PaymentMode) ? (c.paymentMode as PaymentMode) : DEFAULTS.paymentMode;
  useAppConfig.setState({
    fromServer: true,
    appEnv: c.appEnv ?? DEFAULTS.appEnv,
    demoMode: c.demoMode ?? DEFAULTS.demoMode,
    paymentMode: DEV_PAYMENT_MODE && PAYMENT_MODES.includes(DEV_PAYMENT_MODE) ? DEV_PAYMENT_MODE : mode,
    otpProvider: c.auth?.otpProvider ?? null,
    vapidPublicKey: c.push?.vapidPublicKey ?? null,
    termsVersion: c.legal?.termsVersion ?? DEFAULTS.termsVersion,
    privacyVersion: c.legal?.privacyVersion ?? DEFAULTS.privacyVersion,
  });
}

/** Load once at boot. Never throws; on v1 or offline the defaults stay. */
export async function loadConfig(): Promise<void> {
  const c = await fetchConfig();
  if (c) applyServerConfig(c);
}

export const usePaymentMode = () => useAppConfig((s) => s.paymentMode);
