"use client";

import { Clock, Lock, RefreshCw, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Capture } from "@/components/photo/CameraCapture";
import { Button, ButtonLink, Spinner } from "@/components/ui/Button";
import { Container, KV, Notice } from "@/components/ui/Layout";
import { kycStatus, submitKyc, type KycSubmission } from "@/lib/account";
import { useAppConfig } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { compressImage } from "@/lib/photos";
import { isVerified, publicName } from "@/lib/selectors";
import { refreshSnapshot, useAppStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { User } from "@/lib/types";
import { VerifiedStatus } from "./DoneStep";
import { IntroStep, REAL_PRIVACY } from "./IntroStep";
import { KtpStep, type KtpData } from "./KtpStep";
import { randomNik } from "./kyc";
import { SelfieStep } from "./SelfieStep";
import { StepProgress, type VerifyStep } from "./StepProgress";

async function captureBlob(c: Capture): Promise<Blob> {
  const raw = c.kind === "blob" ? c.blob : await (await fetch(c.url)).blob();
  // FR-P7: compress on the client (also strips nothing the server needs; it re-checks the real bytes).
  return (await compressImage(raw, 1600, 0.85)).blob;
}

type Upload = { phase: "sending"; pct: number } | { phase: "failed"; error: string } | null;

/**
 * F6.2, real accounts (OTP sessions): KTP + selfie are uploaded to POST /api/v1/kyc/submissions (multipart, NIK +
 * name on the KTP), encrypted on the server and reviewed by an admin. Demo personas keep the simulated VerifyFlow.
 */
export function RealVerifyFlow({ user, next }: { user: User; next: string | null }) {
  const demoMode = useAppConfig((s) => s.demoMode);
  const submitVerification = useAppStore((s) => s.submitVerification);
  const [status, setStatus] = useState<KycSubmission | null | undefined>(undefined);
  const [step, setStep] = useState<VerifyStep>("intro");
  const [ktp, setKtp] = useState<KtpData | null>(null);
  const [selfie, setSelfie] = useState<Capture | null>(null);
  const [upload, setUpload] = useState<Upload>(null);
  const [nikError, setNikError] = useState<string | null>(null);
  const [redo, setRedo] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const previews = useRef<string[]>([]);
  useEffect(() => {
    const list = previews.current;
    return () => {
      abort.current?.abort();
      list.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  const track = (c: Capture) => c.kind === "blob" && previews.current.push(c.preview);

  const loadStatus = useCallback(() => kycStatus().then((r) => setStatus(r.body.ok ? r.body.submission ?? null : null)), []);
  useEffect(() => {
    let live = true;
    kycStatus().then((r) => live && setStatus(r.body.ok ? r.body.submission ?? null : null));
    return () => {
      live = false;
    };
  }, []);

  const go = (s: VerifyStep) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const send = async (selfieCapture: Capture) => {
    if (!ktp) return go("ktp");
    setUpload({ phase: "sending", pct: 0 });
    let files: [Blob, Blob];
    try {
      files = await Promise.all([captureBlob(ktp.capture), captureBlob(selfieCapture)]);
    } catch {
      return setUpload({ phase: "failed", error: "Gagal memproses foto. Coba foto ulang." });
    }
    abort.current = new AbortController();
    const r = await submitKyc({ ktp: files[0], selfie: files[1], nik: ktp.nik, nameOnKtp: ktp.name }, (pct) => setUpload({ phase: "sending", pct }), abort.current.signal);
    if (r.body.ok && r.body.submission) {
      setUpload(null);
      setStatus(r.body.submission);
      setRedo(false);
      void refreshSnapshot();
      toast("KTP dan selfie terkirim. Admin akan meninjaunya.", "success");
      return go("done");
    }
    // Rule rejections (NIK used/blocked, already pending/verified, bad file) are not fixed by retrying the same data.
    if (r.status === 409 || r.status === 403 || r.status === 400) {
      setUpload(null);
      setSelfie(null);
      setNikError(r.body.error ?? "Data KTP ditolak.");
      toast(r.body.error ?? "Data KTP ditolak.", "error");
      return go("ktp");
    }
    setUpload({ phase: "failed", error: r.body.error ?? "Gagal mengunggah." });
  };

  const onSelfie = (c: Capture) => {
    track(c);
    setSelfie(c);
    void send(c);
  };

  /** Demo/staging servers only: the same instant "Lewati (demo)" as the simulated flow. */
  const skip = demoMode
    ? () => {
        const res = submitVerification(user.id, { method: "demo", nameOnKtp: user.name, nik: randomNik() });
        if (!res.ok) return toast(res.error, "error");
        toast("Verifikasi dilewati (mode demo).", "success");
        setRedo(false);
      }
    : undefined;

  if (status === undefined)
    return (
      <Container narrow className="py-16">
        <p className="flex items-center justify-center gap-2 text-body-sm text-smoke" role="status">
          <Spinner /> Memuat status verifikasi…
        </p>
      </Container>
    );

  const body = () => {
    if (isVerified(user) && !redo) return <VerifiedStatus user={user} next={next} />;
    if (status?.status === "pending" && step !== "done") return <PendingStatus submission={status} next={next} onRefresh={loadStatus} />;
    if (step === "done" && status) return <PendingStatus submission={status} next={next} onRefresh={loadStatus} fresh />;

    const notice =
      status?.status === "rejected" ? (
        <Notice icon={<RotateCcw className="size-4" />} title="Verifikasi sebelumnya ditolak">
          {status.reason ? `Alasan: ${status.reason}. ` : ""}Ulangi dengan foto yang lebih jelas, ya.
        </Notice>
      ) : undefined;

    return (
      <>
        <div className="mb-6">
          <StepProgress current={step} />
        </div>
        {step === "intro" && <IntroStep user={user} onStart={() => go("ktp")} onSkip={skip} notice={notice} real />}
        {step === "ktp" && (
          <KtpStep
            profileName={user.name}
            initial={ktp}
            nikError={nikError}
            onCapture={track}
            onNext={(data) => {
              setKtp(data);
              setNikError(null);
              go("selfie");
            }}
            onSkip={skip}
            manual
            demoSamples={demoMode}
          />
        )}
        {step === "selfie" && (
          <SelfieStep
            capture={selfie}
            matching={!!upload}
            onCapture={onSelfie}
            onBack={() => go("ktp")}
            onSkip={skip}
            demoSamples={demoMode}
            intro="Supaya admin yakin KTP-nya memang milikmu. Setelah selfie, kedua foto langsung dikirim terenkripsi."
            busyView={
              upload && (
                <UploadProgress
                  upload={upload}
                  onRetry={() => selfie && void send(selfie)}
                  onRetake={() => {
                    setUpload(null);
                    setSelfie(null);
                  }}
                />
              )
            }
          />
        )}
      </>
    );
  };

  return (
    <Container narrow className="py-5 lg:py-10">
      <div className="mx-auto max-w-lg">
        {body()}
        <Notice icon={<Lock className="size-4" />} className="mt-8">
          {REAL_PRIVACY}
        </Notice>
      </div>
    </Container>
  );
}

function UploadProgress({ upload, onRetry, onRetake }: { upload: NonNullable<Upload>; onRetry: () => void; onRetake: () => void }) {
  if (upload.phase === "failed")
    return (
      <div className="mx-auto mt-8 max-w-sm text-center" role="alert">
        <p className="text-body font-semibold text-ink">Unggahan gagal</p>
        <p className="mt-1 text-body-sm text-smoke">{upload.error}</p>
        <div className="mt-4 grid gap-2">
          <Button size="lg" block onClick={onRetry}>
            <RefreshCw className="size-4" /> Coba kirim lagi
          </Button>
          <Button variant="secondary" size="lg" block onClick={onRetake}>
            Foto ulang selfie
          </Button>
        </div>
      </div>
    );
  const pct = Math.round(upload.pct * 100);
  return (
    <div className="mx-auto mt-8 max-w-sm text-center" role="status" aria-live="polite">
      <p className="text-body font-semibold text-ink">Mengirim KTP dan selfie…</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-image-gray" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-full bg-ink transition-[width] duration-200" style={{ width: `${Math.max(3, pct)}%` }} />
      </div>
      <p className="mt-2 text-body-sm tabular-nums text-smoke">{pct < 100 ? `${pct}%` : "Menyimpan dengan aman…"}</p>
    </div>
  );
}

/** "Menunggu review": shown right after sending and whenever the latest submission is still pending. */
function PendingStatus({ submission, next, onRefresh, fresh }: { submission: KycSubmission; next: string | null; onRefresh: () => unknown; fresh?: boolean }) {
  const user = useAppStore((s) => s.users.find((u) => u.id === submission.userId));
  return (
    <section aria-labelledby="verif-pending" className="animate-fade-up">
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-soft-gray text-ink">
          <Clock className="size-8" />
        </span>
        <h1 id="verif-pending" className="mt-5 text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">
          {fresh ? "Terkirim, menunggu review" : "Menunggu review admin"}
        </h1>
        <p className="mt-2 text-body text-smoke">Admin meninjau paling lambat 1×24 jam. Kami kabari lewat notifikasi begitu ada keputusan.</p>
      </div>
      <div className="mt-6 rounded-card border border-border-gray px-4 py-2">
        <KV k="NIK" v={<span className="tabular-nums">{submission.nikMasked || "–"}</span>} />
        <KV k="Dikirim" v={submission.createdAt ? formatDateTime(Date.parse(submission.createdAt)) : "–"} />
        <KV k="Status" v="Menunggu review" strong />
        {user && <KV k="Yang dilihat orang lain" v={`${publicName(user)} · Belum terverifikasi`} />}
      </div>
      <div className="mt-6 grid gap-2">
        <ButtonLink href={next ?? "/"} size="lg" block>
          {next ? "Lanjutkan" : "Jelajahi barang dulu"}
        </ButtonLink>
        <Button variant="secondary" size="lg" block onClick={onRefresh}>
          <RefreshCw className="size-4" /> Cek status
        </Button>
      </div>
    </section>
  );
}
