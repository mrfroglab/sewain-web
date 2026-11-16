"use client";

import { ArrowLeft, Camera, ScanFace } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { CameraCapture, type Capture } from "@/components/photo/CameraCapture";
import { Button } from "@/components/ui/Button";
import { DEMO_SELFIE } from "./demo-images";
import { SkipDemoButton } from "./SkipDemoButton";

const TIPS = ["Pegang KTP di samping wajah, sisi depan menghadap kamera.", "Lepas masker, topi, dan kacamata hitam.", "Cari tempat terang, cahaya dari depan."];

/** Step 3: selfie holding the KTP → simulated face match (FR-A2/A4). */
export function SelfieStep({
  capture,
  matching,
  onCapture,
  onBack,
  onSkip,
  busyView,
  demoSamples = true,
  intro,
}: {
  capture: Capture | null;
  matching: boolean;
  onCapture: (c: Capture) => void;
  onBack: () => void;
  /** undefined = no "Lewati (demo)" */
  onSkip?: () => void;
  /** shown instead of the simulated face match while `matching` (real KYC: upload progress / retry) */
  busyView?: ReactNode;
  demoSamples?: boolean;
  /** replaces the subtitle under the title */
  intro?: ReactNode;
}) {
  const [camOpen, setCamOpen] = useState(false);

  return (
    <section aria-labelledby="verif-selfie" className="animate-fade-up">
      <button type="button" onClick={onBack} disabled={matching} className="-ml-1 mb-3 inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-body-sm font-medium text-ink hover:bg-soft-gray disabled:opacity-40">
        <ArrowLeft className="size-4" /> Kembali ke foto KTP
      </button>
      <h1 id="verif-selfie" className="text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">
        Selfie sambil memegang KTP
      </h1>
      <p className="mt-2 text-body text-smoke">{intro ?? "Supaya kami yakin KTP-nya memang milikmu. Wajahmu dicocokkan dengan foto di KTP."}</p>

      <div className="relative mx-auto mt-6 aspect-[3/4] w-52 overflow-hidden rounded-[50%] bg-soft-gray sm:w-60">
        {capture ? (
          <img src={capture.preview} alt="Selfie yang diambil" className="size-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => setCamOpen(true)}
            className="flex size-full flex-col items-center justify-center gap-2 rounded-[50%] border-2 border-dashed border-ash/60 px-6 text-center text-smoke transition-colors hover:border-ink hover:text-ink"
          >
            <ScanFace className="size-9" strokeWidth={1.5} />
            <span className="text-body-sm font-medium">Ketuk untuk selfie</span>
          </button>
        )}
        {matching && <div className="absolute inset-0 animate-pulse bg-white/30" aria-hidden />}
      </div>

      {matching ? (
        busyView ?? <MatchProgress />
      ) : (
        <>
          <ul className="mx-auto mt-6 max-w-sm space-y-1.5 text-body-sm text-graphite">
            {TIPS.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-3">
            <Button size="lg" block onClick={() => setCamOpen(true)}>
              <Camera className="size-4" /> Buka kamera depan
            </Button>
            {onSkip && <SkipDemoButton onSkip={onSkip} />}
          </div>
        </>
      )}

      <CameraCapture
        open={camOpen}
        onClose={() => setCamOpen(false)}
        onDone={(caps) => caps[0] && onCapture(caps[0])}
        title="Selfie dengan KTP"
        hint="Wajah di dalam oval, KTP di samping wajah"
        frame="selfie"
        facing="user"
        multiple={false}
        demoSources={demoSamples ? [DEMO_SELFIE] : []}
      />
    </section>
  );
}

const STAGES = ["Memastikan ini wajah asli…", "Mencocokkan wajah dengan foto KTP…", "Hampir selesai…"];

/** Fake 1.5 s progress while the "eKYC vendor" works (the parent waits the same 1.5 s). */
function MatchProgress() {
  const [pct, setPct] = useState(3);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [window.setTimeout(() => setPct(100), 40), window.setTimeout(() => setStage(1), 550), window.setTimeout(() => setStage(2), 1150)];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);
  return (
    <div className="mx-auto mt-8 max-w-sm text-center" role="status" aria-live="polite">
      <p className="text-body font-semibold text-ink">Mencocokkan wajah…</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-image-gray">
        <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%`, transition: "width 1400ms cubic-bezier(.25,.7,.3,1)" }} />
      </div>
      <p className="mt-2 text-body-sm text-smoke">{STAGES[stage]}</p>
      <p className="mt-6 text-caption text-ash">Simulasi eKYC: tidak ada data yang dikirim ke mana pun.</p>
    </div>
  );
}
