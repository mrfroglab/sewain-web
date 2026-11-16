// Shared steps for the real-OTP suites (auth-otp.mjs, account.mjs). Real OTP = sewain-api v2 with a provider other
// than "demo"; on staging that is "echo", which returns the code in the response (shown as "Kode uji staging").

/** GET /api/v1/config, or null on v1 (404) / unreachable. */
export async function serverConfig(api) {
  try {
    const r = await fetch(`${api}/api/v1/config`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/** Exit 0 with a clear "skipped" line when the server cannot run these suites. */
export async function requireEcho(api, suite) {
  const cfg = await serverConfig(api);
  if (cfg?.auth?.otpProvider !== "echo") {
    console.log(`↷ ${suite} dilewati: butuh sewain-api v2 dengan OTP_PROVIDER=echo (config: ${cfg ? `otpProvider=${cfg.auth?.otpProvider}` : "tidak ada /api/v1/config"})`);
    process.exit(0);
  }
  return cfg;
}

export const randomPhone = () => `0813${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;

/**
 * "Kirim OTP", waiting out the server's resend window ("Tunggu N detik…", 60 s per number, also right after a
 * successful sign-in on another device).
 */
export async function requestCode(page) {
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: /Kirim OTP/ }).click();
    const box = page.getByTestId("staging-otp");
    const wait = page.getByText(/Tunggu (\d+) detik/);
    await Promise.race([box.waitFor({ timeout: 15000 }), wait.waitFor({ timeout: 15000 })]);
    if (await box.count()) return;
    const secs = Number(/(\d+)/.exec(await wait.innerText())?.[1] ?? 30);
    await page.waitForTimeout((secs + 1) * 1000);
  }
  throw new Error("kode OTP tidak terkirim");
}

/** /masuk → nomor → kode uji staging → (new) consent → profile name → lands on /verifikasi. */
export async function signUpWithOtp(page, base, { phone, name }) {
  await page.goto(`${base}/masuk`, { waitUntil: "load" });
  await page.getByLabel("Nomor HP").fill(phone);
  await requestCode(page);
  const box = page.getByTestId("staging-otp");
  if (!/Kode uji staging/.test(await box.innerText())) throw new Error("label 'Kode uji staging' tidak ada");
  await box.getByRole("button", { name: "Isi otomatis" }).click();
  await page.getByRole("heading", { name: "Buat akun baru" }).waitFor();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Setuju dan lanjut/ }).click();
  await page.getByRole("heading", { name: "Lengkapi akunmu" }).waitFor({ timeout: 15000 });
  await page.getByLabel("Nama lengkap").fill(name);
  await page.getByRole("button", { name: /Buat akun/ }).click();
  await page.waitForURL(/\/verifikasi/, { timeout: 10000 });
}

/** Existing number: /masuk → kode → straight in. */
export async function signInWithOtp(page, base, phone) {
  await page.goto(`${base}/masuk`, { waitUntil: "load" });
  await page.getByLabel("Nomor HP").fill(phone);
  await requestCode(page);
  await page.getByTestId("staging-otp").getByRole("button", { name: "Isi otomatis" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/masuk"), { timeout: 15000 });
}

export function harness(browser, out) {
  const errors = [];
  const pages = [];
  let n = 0;
  let failed = 0;
  const mk = async (tag, { userId, viewport = { width: 390, height: 844 } } = {}) => {
    const c = await browser.newContext({ viewport, permissions: ["camera"], acceptDownloads: true });
    const p = await c.newPage();
    if (userId) await p.addInitScript((id) => sessionStorage.setItem("sewain-session", JSON.stringify({ state: { userId: id }, version: 0 })), userId);
    p.on("pageerror", (e) => errors.push(`[${tag}] ${e.message}`));
    p.on("console", (m) => m.type() === "error" && !m.text().includes("Failed to load resource") && errors.push(`[${tag} console] ${m.text().slice(0, 200)}`));
    p.setDefaultTimeout(10000);
    pages.push([tag, p]);
    return p;
  };
  const step = async (name, fn) => {
    n++;
    try {
      await fn();
      console.log(`✓ ${n}. ${name}`);
    } catch (e) {
      failed++;
      console.log(`✗ ${n}. ${name}\n   ${e.message.split("\n")[0]}`);
      for (const [tag, p] of pages) await p.screenshot({ path: `${out}/fail-${n}-${tag}.png`, fullPage: true }).catch(() => {});
    }
  };
  const finish = async () => {
    await browser.close();
    console.log(failed ? `${failed} step(s) failed` : "all steps passed");
    console.log(errors.length ? "JS errors:\n" + errors.join("\n") : "no JS errors");
    process.exit(failed || errors.length ? 1 : 0);
  };
  return { mk, step, finish, errors };
}

const SAMPLE = new URL("../public/img/listings/tenda-dome-4p-1.webp", import.meta.url).pathname;

/**
 * In an open camera sheet: "Foto contoh" on demo servers; outside demo mode there are no samples, so upload a
 * picture through the gallery input like a user without a camera would.
 */
export async function pickSamplePhoto(page) {
  const sample = page.getByRole("button", { name: "Foto contoh" });
  await page.getByRole("dialog").last().waitFor();
  if (await sample.count()) return sample.click();
  await page.getByRole("dialog").last().locator('input[type="file"]').setInputFiles(SAMPLE);
}
