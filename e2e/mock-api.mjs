// Mock of the sewain-api v2 account endpoints, in front of a real (v1/DEMO_MODE) API such as staging.
// Used by e2e/auth-otp.mjs and e2e/account.mjs until the integration build is on staging.
//
//   node e2e/mock-api.mjs <port> <upstream>          e.g. node e2e/mock-api.mjs 3403 https://sewain-staging.hallojanu.me
//   MOCK_DEMO_MODE=false   config.demoMode (default true; false = production-like cookie sessions, no persona picker)
//   MOCK_OTP=echo|demo     config.auth.otpProvider (default echo)
//   MOCK_RESEND=60         seconds of the OTP resend countdown
//
// Implemented here, following sewain-api docs/integration/auth.md + notify.md and the integrate-v2 handlers:
//   GET /api/v1/config, POST /api/v1/auth/otp/request|verify, POST /api/v1/auth/logout, GET /api/v1/auth/me,
//   GET/DELETE /api/v1/auth/sessions[/{id}], POST /api/v1/kyc/submissions, GET /api/v1/kyc/status,
//   GET /api/v1/admin/kyc[/{id}[/files/{kind}]], POST /api/v1/admin/kyc/{id}/decision, GET /api/v1/push/vapid-key,
//   POST/DELETE /api/v1/push/subscriptions, GET/PUT /api/v1/me/notification-prefs, GET /api/v1/me/export, DELETE /api/v1/me
// Mock-only: GET /__mock/audit (KYC file reads), POST /__mock/config ({demoMode, otpProvider}).
// Everything else (state, actions, photos, search, events WebSocket, demo-login) goes to the upstream API with the
// session translated to its bearer token. Accounts are real upstream accounts (registerUser + demo-login), so the
// rest of the app works on them unchanged.
//
// Differences from the real v2 server, on purpose: a revoked/expired token gets 401 on every endpoint (v2 answers
// /state as guest); KYC "pending" is an overlay on /state until the admin decides (then upstream submitVerification
// records the approval); no rate limits, no CSRF check.
import { generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import http from "node:http";
import net from "node:net";
import tls from "node:tls";

const port = Number(process.argv[2] ?? 3403);
const upstream = (process.argv[3] ?? "https://sewain-staging.hallojanu.me").replace(/\/$/, "");
const config = {
  demoMode: (process.env.MOCK_DEMO_MODE ?? "true") !== "false",
  otpProvider: process.env.MOCK_OTP ?? "echo",
};
const RESEND = Number(process.env.MOCK_RESEND ?? 60);

const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const VAPID = publicKey.export({ format: "jwk" });
const vapidKey = Buffer.concat([Buffer.from([4]), Buffer.from(VAPID.x, "base64url"), Buffer.from(VAPID.y, "base64url")]).toString("base64url");

/* ------------------------------------------------------------------ state */

const challenges = new Map(); // phone(+62) → {code, expiresAt, resendAt, tries}
const sessions = new Map(); // token → {id, userId, role, createdAt, lastSeenAt, expiresAt, userAgent, ip, revoked}
const submissions = []; // KYC
const audit = [];
const pushSubs = new Map(); // endpoint → userId
const prefs = new Map(); // userId → prefs
const deleted = new Set();

const now = () => new Date().toISOString();
const sid = (p) => `${p}-${randomBytes(6).toString("hex")}`;

function normalizePhone(raw) {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("62")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  if (!/^8\d{8,11}$/.test(d)) return null;
  return `+62${d}`;
}
const localPhone = (e164) => `0${e164.slice(3)}`;

/* --------------------------------------------------------------- upstream */

async function up(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${upstream}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

let adminToken = null;
async function upAdmin(path, opts = {}) {
  if (!adminToken) adminToken = (await up("/api/v1/auth/demo-login", { method: "POST", body: { userId: "u-admin" } })).body.token;
  let r = await up(path, { ...opts, token: adminToken });
  if (r.status === 401) {
    adminToken = (await up("/api/v1/auth/demo-login", { method: "POST", body: { userId: "u-admin" } })).body.token;
    r = await up(path, { ...opts, token: adminToken });
  }
  return r;
}
async function fullState() {
  for (let i = 0; i < 3; i++) {
    const r = await upAdmin("/api/v1/state");
    if (Array.isArray(r.body?.users)) return r.body;
    console.error(`mock: upstream state ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
    adminToken = null;
    await new Promise((ok) => setTimeout(ok, 500 * (i + 1)));
  }
  throw new Error("upstream /api/v1/state tidak memberi snapshot");
}
const action = (name, args, token) => up(`/api/v1/actions/${name}`, { method: "POST", token, body: { args, idempotencyKey: randomUUID() } });

/* -------------------------------------------------------------- sessions */

function newSession(token, userId, role, req) {
  const t = now();
  const s = { id: sid("s"), userId, role, createdAt: t, lastSeenAt: t, expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(), userAgent: req.headers["user-agent"] ?? "", ip: req.socket.remoteAddress ?? "", revoked: false };
  sessions.set(token, s);
  return s;
}

function tokenOf(req) {
  const h = req.headers.authorization ?? "";
  if (h.startsWith("Bearer ")) return { token: h.slice(7), cookie: false };
  const m = /(?:^|;\s*)sewain_session=([^;]+)/.exec(req.headers.cookie ?? "");
  return m ? { token: decodeURIComponent(m[1]), cookie: true } : { token: null, cookie: false };
}

/** The signed-in session, or null (guest) / "revoked". Unknown bearer tokens (persona demo-login) are learned once. */
async function viewer(req) {
  const { token } = tokenOf(req);
  if (!token) return null;
  let s = sessions.get(token);
  if (!s) {
    const me = await up("/api/v1/auth/me", { token });
    if (!me.body.ok) return null;
    s = newSession(token, me.body.user.id, me.body.user.role === "admin" ? "admin" : "user", req);
  }
  if (s.revoked || deleted.has(s.userId)) return "revoked";
  s.lastSeenAt = now();
  return { ...s, token };
}

/* ------------------------------------------------------------------- http */

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key, If-None-Match");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
  res.setHeader("Access-Control-Expose-Headers", "ETag, Idempotency-Replayed, X-Original-SHA256, X-Content-SHA256");
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}
const err = (res, status, error, extra = {}, headers = {}) => send(res, status, { ok: false, error, ...extra }, headers);

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}
const json = (buf) => {
  try {
    return JSON.parse(buf.toString() || "{}");
  } catch {
    return {};
  }
};

const cookieHeader = (token, maxAge) => `sewain_session=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;

const DEFAULT_PREFS = () => ({
  channels: {
    inapp: { booking: true, chat: true, sengketa: true, sistem: true },
    webpush: { booking: true, chat: true, sengketa: true, sistem: true },
    email: { booking: false, chat: false, sengketa: true, sistem: true },
    whatsapp: { booking: false, chat: false, sengketa: false, sistem: false },
  },
  quietHours: { enabled: true, start: "22:00", end: "06:00", timezone: "Asia/Jakarta" },
});
const prefsBody = (userId) => ({
  ok: true,
  prefs: prefs.get(userId) ?? DEFAULT_PREFS(),
  available: { inapp: true, webpush: true, email: true, whatsapp: false },
  pushSubscriptions: [...pushSubs.values()].filter((u) => u === userId).length,
});

const publicSub = (s, admin = false) => {
  const { files, nameOnKtp, nik, ...rest } = s;
  void files;
  void nik;
  return admin ? { ...rest, nameOnKtp } : rest;
};

/** Overlay pending/rejected mock KYC onto a snapshot, the way v2 mirrors submissions into verification_requests. */
function overlayState(state) {
  if (!state || !Array.isArray(state.users)) return state;
  for (const s of submissions) {
    if (s.status === "approved") continue;
    const latest = submissions.filter((x) => x.userId === s.userId).at(-1);
    if (latest !== s) continue;
    const u = state.users.find((x) => x.id === s.userId);
    if (u && u.verification?.status !== "terverifikasi") u.verification = { status: s.status === "pending" ? "menunggu" : "ditolak", method: "manual" };
    if (Array.isArray(state.verifications) && !state.verifications.some((v) => v.id === `v-${s.id}`))
      state.verifications.unshift({
        id: `v-${s.id}`,
        userId: s.userId,
        submittedAt: Date.parse(s.createdAt),
        method: "manual",
        nameOnKtp: "",
        nikMasked: s.nikMasked,
        status: s.status === "pending" ? "menunggu" : "ditolak",
        reason: s.reason || undefined,
        auto: false,
      });
  }
  return state;
}

const OPEN = new Set(["REQUESTED", "ACCEPTED", "ACTIVE", "DISPUTED"]);

async function handle(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const route = `${req.method} ${p}`;

  if (route === "GET /__mock/audit") return send(res, 200, { ok: true, audit });
  if (route === "POST /__mock/config") {
    Object.assign(config, json(await readBody(req)));
    return send(res, 200, { ok: true, config });
  }
  if (route === "GET /api/v1/config")
    return send(res, 200, { ok: true, appEnv: "staging", demoMode: config.demoMode, paymentMode: "simulated", auth: { otpProvider: config.otpProvider }, push: { vapidPublicKey: vapidKey }, legal: { termsVersion: "2026-11-draft-1", privacyVersion: "2026-11-draft-1" } }, { "Cache-Control": "public, max-age=60" });

  /* ---- OTP */
  if (route === "POST /api/v1/auth/otp/request") {
    const phone = normalizePhone(json(await readBody(req)).phone);
    if (!phone) return err(res, 400, "Nomor HP tidak valid. Pakai nomor seluler Indonesia, mis. 0812 3456 7890.");
    const prev = challenges.get(phone);
    if (prev && prev.resendAt > Date.now()) {
      const wait = Math.ceil((prev.resendAt - Date.now()) / 1000);
      return err(res, 429, `Tunggu ${wait} detik sebelum minta kode baru.`, { retryAfter: wait });
    }
    const code = config.otpProvider === "demo" ? "123456" : String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + 5 * 60e3).toISOString();
    challenges.set(phone, { code, expiresAt, resendAt: Date.now() + RESEND * 1000, tries: 0 });
    return send(res, 200, { ok: true, phone, expiresAt, resendAfter: RESEND, channel: config.otpProvider, devCode: code });
  }
  if (route === "POST /api/v1/auth/otp/verify") {
    const b = json(await readBody(req));
    const phone = normalizePhone(b.phone);
    const ch = phone && challenges.get(phone);
    if (!ch || Date.parse(ch.expiresAt) < Date.now() || ch.code !== String(b.code ?? "").trim()) {
      if (ch && ++ch.tries >= 5) {
        challenges.delete(phone);
        return err(res, 429, "Terlalu banyak percobaan. Minta kode baru, ya.");
      }
      return err(res, 400, "Kode salah atau sudah kedaluwarsa.");
    }
    const bearer = String(b.transport ?? "").toLowerCase() === "bearer";
    if (bearer && !config.demoMode) return err(res, 400, "Mode token tidak tersedia. Masuk lewat browser.");
    const state = await fullState();
    let user = state.users.find((u) => u.phone === localPhone(phone) && !deleted.has(u.id));
    if (process.env.MOCK_DEBUG) console.log("verify", localPhone(phone), user?.id ?? "-", state.users?.length, state.ok);
    let isNew = false;
    if (!user) {
      if (b.acceptTerms !== true) return err(res, 400, "Setujui Syarat & Ketentuan dan Kebijakan Privasi dulu.", { code: "consent_required" });
      const r = await action("registerUser", [{ name: "Pengguna baru", phone: localPhone(phone), accountType: "individu", areaId: "ugm" }]);
      if (!r.body.ok) return err(res, 502, `Gagal membuat akun di upstream: ${r.body.error}`);
      user = { id: r.body.value, role: "user", status: "aktif" };
      isNew = true;
    }
    if (user.status === "blacklist") return err(res, 403, "Akun ini diblokir.");
    challenges.delete(phone);
    const login = await up("/api/v1/auth/demo-login", { method: "POST", body: { userId: user.id } });
    if (!login.body.ok) return err(res, 502, "Gagal membuat sesi di upstream.");
    const s = newSession(login.body.token, user.id, user.role === "admin" ? "admin" : "user", req);
    const out = { ok: true, userId: user.id, role: s.role, isNew, session: { id: s.id, expiresAt: s.expiresAt } };
    if (bearer) return send(res, 200, { ...out, token: login.body.token });
    return send(res, 200, out, { "Set-Cookie": cookieHeader(login.body.token, 2592000) });
  }
  if (route === "POST /api/v1/auth/logout") {
    const { token } = tokenOf(req);
    const s = token && sessions.get(token);
    if (s) s.revoked = true;
    return send(res, 200, { ok: true }, { "Set-Cookie": cookieHeader("", 0) });
  }
  if (route === "POST /api/v1/auth/demo-login") {
    const r = await up(p, { method: "POST", body: json(await readBody(req)) });
    if (r.body.ok && r.body.token) {
      const me = await up("/api/v1/auth/me", { token: r.body.token });
      newSession(r.body.token, r.body.userId ?? me.body.user?.id, me.body.user?.role === "admin" ? "admin" : "user", req);
    }
    return send(res, r.status, r.body);
  }

  /* ---- everything below knows the viewer */
  let v = await viewer(req);
  // Public endpoints treat a dead session as a guest (like v2); the rest answer 401 so the web signs out.
  if (v === "revoked" && (p === "/api/health" || p === "/api/v1/listings/search" || (req.method === "GET" && p.startsWith("/api/v1/photos/")))) v = null;
  if (process.env.MOCK_DEBUG) console.log(route, tokenOf(req).cookie ? "cookie" : tokenOf(req).token ? "bearer" : "guest", v === "revoked" ? "REVOKED" : v ? v.userId : "-");
  if (v === "revoked") return err(res, 401, "Masuk dulu, ya.", {}, { "Set-Cookie": cookieHeader("", 0) });
  const needUser = () => {
    if (!v) err(res, 401, "Masuk dulu, ya.");
    return !!v;
  };
  const needAdmin = () => {
    if (!needUser()) return false;
    if (v.role !== "admin") err(res, 403, "Hanya admin.");
    return v.role === "admin";
  };

  if (route === "GET /api/v1/auth/me" && tokenOf(req).cookie) {
    if (!needUser()) return;
    return send(res, 200, { ok: true, user: { id: v.userId, role: v.role } });
  }
  if (route === "GET /api/v1/auth/sessions") {
    if (!needUser()) return;
    const list = [...sessions.entries()].filter(([, s]) => s.userId === v.userId && !s.revoked).map(([t, s]) => ({ id: s.id, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, expiresAt: s.expiresAt, userAgent: s.userAgent, ip: s.ip, current: t === v.token }));
    return send(res, 200, { ok: true, sessions: list });
  }
  if (route === "DELETE /api/v1/auth/sessions") {
    if (!needUser()) return;
    let revoked = 0;
    for (const [t, s] of sessions) if (s.userId === v.userId && t !== v.token && !s.revoked) (s.revoked = true), revoked++;
    return send(res, 200, { ok: true, revoked });
  }
  let m = /^DELETE \/api\/v1\/auth\/sessions\/([^/]+)$/.exec(route);
  if (m) {
    if (!needUser()) return;
    const entry = [...sessions.entries()].find(([, s]) => s.id === m[1] && s.userId === v.userId && !s.revoked);
    if (!entry) return err(res, 404, "Sesi tidak ditemukan.");
    entry[1].revoked = true;
    return send(res, 200, { ok: true }, entry[0] === v.token ? { "Set-Cookie": cookieHeader("", 0) } : {});
  }

  /* ---- KYC */
  if (route === "POST /api/v1/kyc/submissions") {
    if (!needUser()) return;
    const buf = await readBody(req);
    let form;
    try {
      form = await new Request("http://x", { method: "POST", headers: { "content-type": req.headers["content-type"] ?? "" }, body: buf }).formData();
    } catch {
      return err(res, 400, "Unggahan tidak valid.");
    }
    const nik = String(form.get("nik") ?? "");
    const nameOnKtp = String(form.get("nameOnKtp") ?? "").trim();
    const ktp = form.get("ktp");
    const selfie = form.get("selfie");
    if (!/^\d{16}$/.test(nik)) return err(res, 400, "NIK harus 16 digit.");
    if (nameOnKtp.length < 3) return err(res, 400, "Nama di KTP wajib diisi.");
    if (!(ktp instanceof Blob) || !(selfie instanceof Blob)) return err(res, 400, "Foto KTP dan selfie wajib.");
    if (ktp.size > 8 << 20 || selfie.size > 8 << 20) return err(res, 413, "Foto terlalu besar (maks. 8 MB).");
    if (![ktp.type, selfie.type].every((t) => /^image\/(jpeg|png|webp)$/.test(t))) return err(res, 415, "Foto harus JPG, PNG, atau WebP.");
    if (submissions.some((s) => s.userId === v.userId && s.status === "pending")) return err(res, 409, "Pengajuanmu sebelumnya masih ditinjau.");
    if (submissions.some((s) => s.nik === nik && s.userId !== v.userId && s.status !== "rejected")) return err(res, 409, "NIK ini sudah dipakai akun lain. Satu NIK hanya untuk satu akun.");
    const sub = {
      id: sid("kyc"),
      userId: v.userId,
      nikMasked: `${nik.slice(0, 4)}********${nik.slice(-4)}`,
      status: "pending",
      reason: "",
      provider: "manual",
      createdAt: now(),
      decidedAt: null,
      filesPurgeAfter: null,
      filesPurgedAt: null,
      nameOnKtp: nameOnKtp.toUpperCase(),
      nik,
      files: { ktp: { type: ktp.type, buf: Buffer.from(await ktp.arrayBuffer()) }, selfie: { type: selfie.type, buf: Buffer.from(await selfie.arrayBuffer()) } },
    };
    submissions.push(sub);
    return send(res, 201, { ok: true, submission: publicSub(sub) });
  }
  if (route === "GET /api/v1/kyc/status") {
    if (!needUser()) return;
    const s = submissions.filter((x) => x.userId === v.userId).at(-1);
    return send(res, 200, { ok: true, submission: s ? publicSub(s) : null });
  }
  if (route === "GET /api/v1/admin/kyc") {
    if (!needAdmin()) return;
    const st = url.searchParams.get("status") ?? "pending";
    return send(res, 200, { ok: true, submissions: submissions.filter((s) => st === "all" || s.status === st).map((s) => publicSub(s, true)) });
  }
  m = /^GET \/api\/v1\/admin\/kyc\/([^/]+)\/files\/([^/]+)$/.exec(route);
  if (m) {
    if (!needAdmin()) return;
    audit.push({ actor: v.userId, action: "kyc.file.read", target: `kyc_submission:${m[1]}/${m[2]}`, at: now() });
    const s = submissions.find((x) => x.id === m[1]);
    const f = s?.files?.[m[2]];
    if (!f) return err(res, 404, "Berkas tidak ditemukan.");
    res.writeHead(200, { "Content-Type": f.type, "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" });
    return res.end(f.buf);
  }
  m = /^POST \/api\/v1\/admin\/kyc\/([^/]+)\/decision$/.exec(route);
  if (m) {
    if (!needAdmin()) return;
    const b = json(await readBody(req));
    const s = submissions.find((x) => x.id === m[1]);
    if (!s) return err(res, 404, "Pengajuan tidak ditemukan.");
    if (s.status !== "pending") return err(res, 409, "Pengajuan ini sudah diputuskan.");
    if (b.decision !== "approve" && b.decision !== "reject") return err(res, 400, "Keputusan harus approve atau reject.");
    if (b.decision === "reject" && !String(b.reason ?? "").trim()) return err(res, 400, "Alasan penolakan wajib diisi.");
    if (b.decision === "approve") {
      // Upstream (v1) records the identity with a demo-style instant approval for this user.
      const token = (await up("/api/v1/auth/demo-login", { method: "POST", body: { userId: s.userId } })).body.token;
      const r = await action("submitVerification", [s.userId, { method: "manual", nameOnKtp: s.nameOnKtp, nik: s.nik }], token);
      if (!r.body.ok) return err(res, 409, r.body.error ?? "Gagal menyetujui.");
    }
    Object.assign(s, { status: b.decision === "approve" ? "approved" : "rejected", reason: String(b.reason ?? ""), decidedAt: now(), decidedBy: v.userId, filesPurgeAfter: new Date(Date.now() + 30 * 864e5).toISOString() });
    audit.push({ actor: v.userId, action: `kyc.${b.decision}`, target: `kyc_submission:${s.id}`, at: now() });
    return send(res, 200, { ok: true, submission: publicSub(s, true) });
  }
  m = /^GET \/api\/v1\/admin\/kyc\/([^/]+)$/.exec(route);
  if (m) {
    if (!needAdmin()) return;
    const s = submissions.find((x) => x.id === m[1]);
    return s ? send(res, 200, { ok: true, submission: publicSub(s, true) }) : err(res, 404, "Pengajuan tidak ditemukan.");
  }

  /* ---- push + prefs */
  if (route === "GET /api/v1/push/vapid-key") return send(res, 200, { ok: true, publicKey: vapidKey });
  if (route === "POST /api/v1/push/subscriptions") {
    if (!needUser()) return;
    const b = json(await readBody(req));
    if (!/^https:\/\//.test(b.endpoint ?? "") || !b.keys?.p256dh || !b.keys?.auth) return err(res, 400, "Langganan push tidak valid.");
    pushSubs.set(b.endpoint, v.userId);
    return send(res, 201, { ok: true });
  }
  if (route === "DELETE /api/v1/push/subscriptions") {
    if (!needUser()) return;
    const b = json(await readBody(req));
    const removed = pushSubs.get(b.endpoint) === v.userId && pushSubs.delete(b.endpoint);
    return send(res, 200, { ok: true, removed });
  }
  if (route === "GET /api/v1/me/notification-prefs") {
    if (!needUser()) return;
    return send(res, 200, prefsBody(v.userId));
  }
  if (route === "PUT /api/v1/me/notification-prefs") {
    if (!needUser()) return;
    const b = json(await readBody(req));
    const cur = structuredClone(prefs.get(v.userId) ?? DEFAULT_PREFS());
    for (const [ch, cats] of Object.entries(b.channels ?? {})) {
      if (!(ch in cur.channels) || ch === "inapp") return err(res, 400, `Channel tidak dikenal: ${ch}`);
      for (const [cat, on] of Object.entries(cats)) {
        if (!(cat in cur.channels[ch])) return err(res, 400, `Kategori tidak dikenal: ${cat}`);
        cur.channels[ch][cat] = !!on;
      }
    }
    if (b.quietHours) {
      const q = { ...cur.quietHours, ...b.quietHours };
      if (![q.start, q.end].every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))) return err(res, 400, "Jam harus berformat JJ:MM.");
      cur.quietHours = q;
    }
    prefs.set(v.userId, cur);
    return send(res, 200, prefsBody(v.userId));
  }

  /* ---- export / delete */
  if (route === "GET /api/v1/me/export") {
    if (!needUser()) return;
    const st = await fullState();
    const mine = (list, ...keys) => (list ?? []).filter((x) => keys.some((k) => x[k] === v.userId));
    const data = {
      exportedAt: now(),
      profile: st.users.find((u) => u.id === v.userId) ?? null,
      listings: mine(st.listings, "ownerId"),
      bookings: mine(st.bookings, "renterId", "providerId"),
      reviews: mine(st.reviews, "fromId", "toId"),
      notifications: mine(st.notifications, "userId"),
      kycSubmissions: submissions.filter((s) => s.userId === v.userId).map((s) => publicSub(s)),
      notificationPrefs: prefsBody(v.userId).prefs,
      sessions: [...sessions.values()].filter((s) => s.userId === v.userId).map(({ id, createdAt, lastSeenAt, userAgent }) => ({ id, createdAt, lastSeenAt, userAgent })),
    };
    return send(res, 200, { ok: true, export: data }, { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="sewain-data-${v.userId}.json"` });
  }
  if (route === "DELETE /api/v1/me") {
    if (!needUser()) return;
    const st = await fullState();
    if ((st.bookings ?? []).some((b) => (b.renterId === v.userId || b.providerId === v.userId) && OPEN.has(b.status)))
      return err(res, 409, "Masih ada sewaan yang berjalan. Selesaikan atau batalkan dulu sebelum menghapus akun.");
    deleted.add(v.userId);
    for (const s of sessions.values()) if (s.userId === v.userId) s.revoked = true;
    return send(res, 200, { ok: true }, { "Set-Cookie": cookieHeader("", 0) });
  }

  /* ---- proxy */
  return proxy(req, res, v, url);
}

async function proxy(req, res, v, url) {
  const headers = {};
  for (const k of ["content-type", "if-none-match", "idempotency-key", "range"]) if (req.headers[k]) headers[k] = req.headers[k];
  if (v?.token) headers.authorization = `Bearer ${v.token}`;
  const body = ["GET", "HEAD"].includes(req.method) ? undefined : await readBody(req);
  let r;
  try {
    r = await fetch(`${upstream}${url.pathname}${url.search}`, { method: req.method, headers, body, redirect: "manual" });
  } catch (e) {
    return err(res, 502, `Upstream tidak terjangkau: ${e.message}`);
  }
  const out = {};
  r.headers.forEach((val, key) => {
    if (!key.startsWith("access-control-") && !["content-encoding", "content-length", "transfer-encoding", "connection"].includes(key)) out[key] = val;
  });
  let buf = Buffer.from(await r.arrayBuffer());
  if (url.pathname === "/api/v1/state" && r.ok) {
    buf = Buffer.from(JSON.stringify(overlayState(JSON.parse(buf.toString()))));
    delete out.etag; // the overlay changes the body
  }
  res.writeHead(r.status, out);
  res.end(buf);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error("mock:", e);
    if (!res.headersSent) err(res, 500, "Terjadi kesalahan di mock.");
  });
});

// WebSocket change feed: tunnel the upgrade to the upstream API (token from the cookie/bearer as ?token=).
server.on("upgrade", (req, socket, head) => {
  const u = new URL(upstream);
  const { token } = tokenOf(req);
  const target = new URL(req.url, upstream);
  if (token && !target.searchParams.get("token")) target.searchParams.set("token", token);
  const secure = u.protocol === "https:";
  const conn = secure ? tls.connect({ host: u.hostname, port: Number(u.port || 443), servername: u.hostname }) : net.connect({ host: u.hostname, port: Number(u.port || 80) });
  conn.on("connect", () => void 0);
  conn.once(secure ? "secureConnect" : "connect", () => {
    const lines = [`GET ${target.pathname}${target.search} HTTP/1.1`, `Host: ${u.host}`];
    for (const [k, val] of Object.entries(req.headers)) if (!["host", "origin", "cookie"].includes(k)) lines.push(`${k}: ${val}`);
    if (token) lines.push(`Authorization: Bearer ${token}`);
    conn.write(`${lines.join("\r\n")}\r\n\r\n`);
    if (head?.length) conn.write(head);
    conn.pipe(socket);
    socket.pipe(conn);
  });
  const close = () => {
    socket.destroy();
    conn.destroy();
  };
  conn.on("error", close);
  socket.on("error", close);
});

server.listen(port, () => console.log(`mock-api :${port} → ${upstream} (demoMode=${config.demoMode}, otp=${config.otpProvider})`));
