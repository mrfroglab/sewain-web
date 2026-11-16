// Layar OTP saat plafon kirim OTP harian tercapai (503 `code:"otp_daily_cap"` + Retry-After). Hanya jalan di depan
// mock-api.mjs (plafon tidak bisa dipicu di staging tanpa mengirim ribuan OTP); tanpa mock dilewati (exit 0).
//
//   node e2e/mock-api.mjs 3403 https://sewain-staging.hallojanu.me &
//   NEXT_PUBLIC_API_URL=http://localhost:3403 pnpm exec next dev -p 3402
//   node e2e/otp-daily-cap.mjs http://localhost:3402 http://localhost:3403 [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
import { harness, randomPhone, requireEcho } from "./otp-helpers.mjs";

const [base, apiArg, outArg] = process.argv.slice(2);
const api = (apiArg ?? base).replace(/\/$/, "");
const out = outArg ?? `/tmp/sewain-otp-daily-cap-${Date.now()}`;
fs.mkdirSync(out, { recursive: true });

const isMock = await fetch(`${api}/__mock/audit`).then((r) => r.ok, () => false);
if (!isMock) {
  console.log("↷ otp-daily-cap dilewati: butuh e2e/mock-api.mjs sebagai API (plafon harian hanya bisa dipicu di mock)");
  process.exit(0);
}
await requireEcho(api, "otp-daily-cap");

const mock = (cfg) => fetch(`${api}/__mock/config`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) }).then((r) => r.json());

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), headless: true });
const { mk, step, finish } = harness(browser, out);
const viewport = { width: 360, height: 780 };
const sendBtn = (p) => p.getByRole("button", { name: /Kirim OTP/ });
const notice = (p) => p.getByTestId("otp-daily-cap");

async function noHorizontalScroll(p) {
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 1) throw new Error(`scroll horizontal ${over}px di 360 px`);
}

async function openPhoneStep(p) {
  await p.goto(`${base}/masuk`, { waitUntil: "load" });
  await p.getByLabel("Nomor HP").fill(randomPhone());
}

try {
  await step("Kirim OTP saat plafon harian tercapai → pesan server + 'besok', tombol nonaktif", async () => {
    await mock({ dailyCap: 7200, resend: 3 });
    const P = await mk("tamu", { viewport });
    await openPhoneStep(P);
    await sendBtn(P).click();
    await notice(P).waitFor();
    const text = await notice(P).innerText();
    if (!/pengiriman kode OTP hari ini sudah mencapai batas/.test(text)) throw new Error(`pesan server tidak tampil: ${text}`);
    if (!/besok/i.test(text)) throw new Error("saran coba lagi besok tidak ada");
    if (!/pukul \d{2}[.:]\d{2} WIB/.test(text)) throw new Error(`jam buka kembali tidak tampil: ${text}`);
    if (!(await sendBtn(P).isDisabled())) throw new Error("'Kirim OTP' masih aktif");
    if (await P.getByTestId("staging-otp").count()) throw new Error("layar kode terbuka padahal OTP tidak terkirim");
    await noHorizontalScroll(P);
  });

  await step("Kirim ulang di layar kode kena plafon → pesan + 'Kirim ulang kode' nonaktif, juga setelah 'Ubah nomor'", async () => {
    await mock({ dailyCap: 0, resend: 3 });
    const P = await mk("kirim-ulang", { viewport });
    await openPhoneStep(P);
    await sendBtn(P).click();
    await P.getByTestId("staging-otp").waitFor({ timeout: 15000 });
    await mock({ dailyCap: 7200 });
    const resend = P.getByRole("button", { name: "Kirim ulang kode" });
    await resend.waitFor({ timeout: 10000 });
    await resend.click();
    await notice(P).waitFor();
    if (!(await resend.isDisabled())) throw new Error("'Kirim ulang kode' masih aktif");
    await noHorizontalScroll(P);
    await P.getByRole("button", { name: "Ubah nomor" }).click();
    await notice(P).waitFor();
    if (!(await sendBtn(P).isDisabled())) throw new Error("'Kirim OTP' aktif lagi setelah 'Ubah nomor'");
  });

  await step("Retry-After pendek habis → 'Kirim OTP' aktif lagi dan kode terkirim", async () => {
    await mock({ dailyCap: 4, resend: 3 });
    const P = await mk("retry-after", { viewport });
    await openPhoneStep(P);
    await sendBtn(P).click();
    await notice(P).waitFor();
    if (!(await sendBtn(P).isDisabled())) throw new Error("'Kirim OTP' masih aktif");
    await mock({ dailyCap: 0 });
    await P.waitForFunction(() => !document.querySelector('[data-testid="otp-daily-cap"]'), null, { timeout: 10000 });
    if (await sendBtn(P).isDisabled()) throw new Error("'Kirim OTP' tetap nonaktif setelah Retry-After habis");
    await sendBtn(P).click();
    await P.getByTestId("staging-otp").waitFor({ timeout: 15000 });
  });
} finally {
  await mock({ dailyCap: 0, resend: Number(process.env.MOCK_RESEND ?? 60) }).catch(() => {});
}
await finish();
