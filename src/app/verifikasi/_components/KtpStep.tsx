"use client";

import { ArrowRight, Camera, IdCard, Pencil, RotateCcw, ScanText, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CameraCapture, type Capture } from "@/components/photo/CameraCapture";
import { Button, Spinner } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { KV } from "@/components/ui/Layout";
import { DEMO_KTP } from "./demo-images";
import { maskNikPretty, nameMatches, randomNik } from "./kyc";
import { SkipDemoButton } from "./SkipDemoButton";

export interface KtpData {
  capture: Capture;
  name: string;
  nik: string;
}

/** Demo helper for FR-A3: same first/last 4 digits as a seeded account (Raka) → "NIK sudah dipakai". */
const TAKEN_NIK_SAMPLE = "3374120101000011";

const TIPS = ["Pakai KTP asli, bukan fotokopi atau foto dari layar.", "Seluruh sudut kartu masuk bingkai.", "Hindari pantulan lampu atau flash di atas kartu."];

/** Step 2: photo of the KTP → simulated OCR result (editable) → name check against the profile (FR-A2). */
export function KtpStep({
  profileName,
  initial,
  nikError,
  onCapture,
  onNext,
  onSkip,
  manual = false,
  demoSamples = true,
}: {
  profileName: string;
  initial: KtpData | null;
  /** e.g. duplicate NIK returned by submitVerification */
  nikError: string | null;
  onCapture: (c: Capture) => void;
  onNext: (data: KtpData) => void;
  /** undefined = no "Lewati (demo)" (real KYC outside demo mode) */
  onSkip?: () => void;
  /** real KYC (F6.2): no simulated OCR; the user types name + NIK as printed on the card */
  manual?: boolean;
  /** offer "Pakai foto contoh" in the camera (demo/staging only) */
  demoSamples?: boolean;
}) {
  const [capture, setCapture] = useState<Capture | null>(initial?.capture ?? null);
  const [phase, setPhase] = useState<"empty" | "reading" | "result">(initial ? "result" : "empty");
  const [name, setName] = useState(initial?.name ?? "");
  const [nik, setNik] = useState(initial?.nik ?? "");
  const [editing, setEditing] = useState(!!nikError);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(nikError);
  const [camOpen, setCamOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onDone = (caps: Capture[]) => {
    const c = caps[0];
    if (!c) return;
    onCapture(c);
    setCapture(c);
    setPhase("reading");
    setEditing(false);
    setConfirmed(false);
    setError(null);
    window.clearTimeout(timer.current);
    if (manual) {
      setName((n) => n || profileName.toUpperCase());
      setEditing(true);
      setPhase("result");
      return;
    }
    // Simulated OCR: reads the profile name and a NIK from "the card".
    timer.current = window.setTimeout(() => {
      setName(profileName.toUpperCase());
      setNik(randomNik());
      setPhase("result");
    }, 1400);
  };

  const nameValid = name.trim().length >= 3;
  const nikValid = /^\d{16}$/.test(nik);
  const matches = nameMatches(profileName, name);
  const canContinue = phase === "result" && nameValid && nikValid && !error && (matches || confirmed);

  const next = () => {
    if (!capture || !canContinue) return;
    onNext({ capture, name: name.trim().replace(/\s+/g, " ").toUpperCase(), nik });
  };

  return (
    <section aria-labelledby="verif-ktp" className="animate-fade-up">
      <h1 id="verif-ktp" className="text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">
        Foto KTP
      </h1>
      <p className="mt-2 text-body text-smoke">Pakai kamera belakang. Kami baca nama dan NIK-nya otomatis, kamu tinggal cek.</p>

      <div className="relative mt-5 aspect-[1.586] w-full overflow-hidden rounded-image bg-soft-gray">
        {capture ? (
          <img src={capture.preview} alt="Foto KTP yang diambil" className="size-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => setCamOpen(true)}
            className="flex size-full flex-col items-center justify-center gap-2 rounded-image border-2 border-dashed border-ash/60 text-smoke transition-colors hover:border-ink hover:text-ink"
          >
            <IdCard className="size-9" strokeWidth={1.5} />
            <span className="text-body-sm font-medium">Ketuk untuk memotret KTP</span>
          </button>
        )}
        {phase === "reading" && (
          <div className="absolute inset-0 grid place-items-center bg-white/75" role="status">
            <span className="flex items-center gap-2 rounded-control bg-white px-4 py-2 text-body-sm font-semibold text-ink shadow-floating">
              <Spinner /> Membaca data KTP…
            </span>
          </div>
        )}
      </div>

      {phase === "empty" && (
        <ul className="mt-4 space-y-1.5 text-body-sm text-graphite">
          {TIPS.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      )}

      {phase === "result" && (
        <div className="animate-fade-up mt-5 rounded-card border border-border-gray p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-body-sm font-semibold text-ink">
              <ScanText className="size-4" /> {manual ? "Data di KTP" : "Hasil baca KTP"}
            </p>
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} className="-mr-2 inline-flex h-9 items-center gap-1.5 rounded-control px-3 text-body-sm font-semibold text-ink hover:bg-soft-gray">
                <Pencil className="size-3.5" /> Ubah
              </button>
            )}
          </div>
          {editing ? (
            <div className="mt-3 space-y-3">
              <TextField
                label="Nama sesuai KTP"
                value={name}
                autoCapitalize="characters"
                onChange={(e) => setName(e.target.value.toUpperCase())}
                error={!nameValid && "Nama minimal 3 huruf."}
              />
              <TextField
                label="NIK"
                value={nik}
                inputMode="numeric"
                maxLength={16}
                onChange={(e) => {
                  setNik(e.target.value.replace(/\D/g, "").slice(0, 16));
                  setError(null);
                }}
                error={error ?? (!nikValid && `NIK harus 16 digit (sekarang ${nik.length}).`)}
                help="16 digit di baris paling atas KTP."
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                {!manual && <button
                  type="button"
                  onClick={() => {
                    setNik(TAKEN_NIK_SAMPLE);
                    setError(null);
                  }}
                  className="inline-flex h-9 items-center rounded-control px-1 text-caption text-smoke underline underline-offset-2 hover:text-ink"
                >
                  Uji demo: pakai NIK yang sudah terdaftar
                </button>}
                {manual && <span />}
                <Button variant="secondary" onClick={() => setEditing(false)} disabled={!nameValid || !nikValid || !!error}>
                  Simpan
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <KV k="Nama" v={name} strong />
              <KV k="NIK" v={<span className="tabular-nums">{maskNikPretty(nik)}</span>} />
              {error && <p className="mt-1 text-caption text-sale-text">{error}</p>}
            </div>
          )}
          <p className="mt-2 text-caption text-smoke">
            {manual
              ? "Tulis persis seperti di KTP. NIK dikirim terenkripsi, setelah itu hanya tampil tersamar."
              : "Ada huruf yang salah baca? Ketuk Ubah. NIK disimpan tersamar dan tidak ditampilkan ke siapa pun."}
          </p>
        </div>
      )}

      {phase === "result" && nameValid && !matches && (
        <div className="animate-fade-up mt-3 rounded-card border border-ink p-4">
          <p className="flex items-center gap-2 text-body-sm font-semibold text-ink">
            <TriangleAlert className="size-4 shrink-0" /> Nama di KTP beda dengan nama profil
          </p>
          <p className="mt-1 text-body-sm text-graphite">
            Profil: <b className="text-ink">{profileName}</b>. {manual ? "Admin akan mencocokkan nama ini saat meninjau." : "Di aplikasi asli, beda nama akan ditinjau manual oleh tim Sewain (maks. 1×24 jam) sebelum akunmu bisa bertransaksi."}
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-body-sm text-ink">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-ink" />
            Data di KTP sudah benar, lanjutkan untuk ditinjau.
          </label>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {phase === "result" ? (
          <>
            <Button size="lg" block onClick={next} disabled={!canContinue || editing}>
              Lanjut ke selfie <ArrowRight className="size-4" />
            </Button>
            <Button variant="secondary" size="lg" block onClick={() => setCamOpen(true)}>
              <RotateCcw className="size-4" /> Foto ulang
            </Button>
          </>
        ) : (
          <Button size="lg" block onClick={() => setCamOpen(true)} disabled={phase === "reading"}>
            <Camera className="size-4" /> Buka kamera
          </Button>
        )}
        {onSkip && <SkipDemoButton onSkip={onSkip} disabled={phase === "reading"} />}
      </div>

      <CameraCapture
        open={camOpen}
        onClose={() => setCamOpen(false)}
        onDone={onDone}
        title="Foto KTP"
        hint="Seluruh kartu masuk bingkai, tulisan terbaca"
        frame="ktp"
        facing="environment"
        multiple={false}
        demoSources={demoSamples ? [DEMO_KTP] : []}
      />
    </section>
  );
}
