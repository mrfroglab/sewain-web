// Smoke test semua rute untuk tamu, penyewa, penyedia, dan admin di layar 360 px: tidak ada error JavaScript, tidak
// ada scroll horizontal, dan halaman yang seharusnya ada tidak berakhir di "tidak ditemukan". Hanya membaca data.
// Berguna untuk mode snapshot terbatas (v2 `scoped`, atau web dev dengan NEXT_PUBLIC_SIMULATE_SCOPED=1).
//
//   node e2e/routes-smoke.mjs <web-base> [outDir]
import { chromium } from "playwright";
import fs from "node:fs";

const base = (process.argv[2] ?? "").replace(/\/$/, "");
const out = process.argv[3] ?? `${process.env.TMPDIR ?? "/tmp"}/sewain-routes-smoke`;
fs.mkdirSync(out, { recursive: true });

const common = ["/", "/cari", "/cari?mulai=2030-01-01&selesai=2030-01-03", "/barang/l-kompor-lapangan", "/barang/l-kompor-lapangan/ajukan", "/u/u-bayu", "/u/u-tini", "/papan", "/bantuan", "/masuk", "/syarat", "/privasi"];
const signedIn = ["/favorit", "/chat", "/notifikasi", "/profil", "/profil/pengaturan", "/sewaan", "/verifikasi", "/penyedia", "/penyedia/barang/baru"];
const personas = [
  { id: null, tag: "tamu", routes: common },
  { id: "u-raka", tag: "raka", routes: [...common, ...signedIn, "/sewaan/b-accepted", "/sewaan/b-accepted/chat", "/sewaan/b-accepted/serah-terima", "/sewaan/b-overdue/pengembalian", "/sewaan/b-disputed/sengketa"] },
  { id: "u-bayu", tag: "bayu", routes: [...common, ...signedIn, "/sewaan/b-active", "/sewaan/b-active/chat", "/penyedia/barang/l-kompor-lapangan"] },
  { id: "u-admin", tag: "admin", routes: ["/admin", "/admin/audit", "/admin/jaminan", "/admin/kata-terlarang", "/admin/komisi", "/admin/laporan", "/admin/pengguna", "/admin/sengketa", "/admin/sengketa/d-lensa", "/admin/verifikasi", "/sewaan/b-disputed"] },
];
const NOT_FOUND = /tidak ditemukan|Halaman tidak ada/i;

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), headless: true });
let failed = 0;
let checked = 0;
for (const persona of personas) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  if (persona.id) await page.addInitScript((u) => sessionStorage.setItem("sewain-session", JSON.stringify({ state: { userId: u }, version: 0 })), persona.id);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of persona.routes) {
    errors.length = 0;
    checked++;
    try {
      await page.goto(base + route, { waitUntil: "load" });
      await page.waitForTimeout(1800);
      const res = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        text: document.querySelector("main")?.innerText ?? "",
        scope: (() => {
          try {
            return JSON.parse(localStorage.getItem("sewain-demo") ?? "{}").state?.scope ?? null;
          } catch {
            return null;
          }
        })(),
      }));
      const problems = [];
      if (errors.length) problems.push(`error JS: ${errors[0].slice(0, 160)}`);
      if (res.overflow > 1) problems.push(`scroll horizontal ${res.overflow}px`);
      if (NOT_FOUND.test(res.text.slice(0, 400))) problems.push("tampil 'tidak ditemukan'");
      if (problems.length) {
        failed++;
        console.log(`✗ [${persona.tag}] ${route} (${res.scope}): ${problems.join("; ")}`);
        await page.screenshot({ path: `${out}/${persona.tag}${route.replace(/[/?=&]/g, "_")}.png`, fullPage: true });
      } else console.log(`✓ [${persona.tag}] ${route}${res.scope ? ` (${res.scope})` : ""}`);
    } catch (e) {
      failed++;
      console.log(`✗ [${persona.tag}] ${route}: ${String(e.message).split("\n")[0]}`);
    }
  }
  await ctx.close();
}
await browser.close();
console.log(failed ? `\n${failed}/${checked} rute bermasalah. Screenshot: ${out}` : `\n${checked} rute lulus.`);
process.exit(failed ? 1 : 0);
