"use client";

import { Clock, FlaskConical, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Capture } from "@/components/photo/CameraCapture";
import { Container, Notice } from "@/components/ui/Layout";
import { isVerified } from "@/lib/selectors";
import { useAppStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { User } from "@/lib/types";
import { DoneStep, VerifiedStatus, type VerifyResult } from "./DoneStep";
import { IntroStep } from "./IntroStep";
import { KtpStep, type KtpData } from "./KtpStep";
import { nameMatches, persistCapture, randomNik, wait } from "./kyc";
import { SelfieStep } from "./SelfieStep";
import { StepProgress, type VerifyStep } from "./StepProgress";

/** Simulated eKYC (PRD 7.2): intro → KTP → selfie → done, with "Lewati (demo)" on every step. */
export function VerifyFlow({ user, next }: { user: User; next: string | null }) {
  const submitVerification = useAppStore((s) => s.submitVerification);
  const latestRequest = useAppStore((s) => s.verifications.find((v) => v.userId === user.id));
  const [showStatus, setShowStatus] = useState(() => isVerified(user));
  const [step, setStep] = useState<VerifyStep>("intro");
  const [ktp, setKtp] = useState<KtpData | null>(null);
  const [selfie, setSelfie] = useState<Capture | null>(null);
  const [matching, setMatching] = useState(false);
  const [nikError, setNikError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);

  // Object URLs of captured photos, released when leaving the page.
  const previews = useRef<string[]>([]);
  useEffect(() => {
    const list = previews.current;
    return () => list.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  const track = (c: Capture) => c.kind === "blob" && previews.current.push(c.preview);

  const go = (s: VerifyStep) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** "Lewati (demo)": verify instantly with a generated NIK (retries on the rare masked-NIK collision). */
  const skip = () => {
    let error = "Gagal memverifikasi.";
    for (let i = 0; i < 5; i++) {
      const nik = randomNik();
      const res = submitVerification(user.id, { method: "demo", nameOnKtp: user.name, nik });
      if (res.ok) {
        setResult({ method: "demo", nameOnKtp: user.name.toUpperCase(), nik, mismatch: false });
        toast("Verifikasi dilewati (mode demo).", "success");
        return go("done");
      }
      error = res.error;
    }
    toast(error, "error");
  };

  const finish = async (selfieCapture: Capture) => {
    if (!ktp) return go("ktp");
    track(selfieCapture);
    setSelfie(selfieCapture);
    setMatching(true);
    const [, ktpPhotoId, selfiePhotoId] = await Promise.all([
      wait(1500),
      persistCapture(ktp.capture, "ktp", user.id),
      persistCapture(selfieCapture, "selfie", user.id),
    ]);
    const res = submitVerification(user.id, { method: "ekyc", nameOnKtp: ktp.name, nik: ktp.nik, ktpPhotoId, selfiePhotoId });
    setMatching(false);
    if (!res.ok) {
      // e.g. FR-A3 "NIK ini sudah dipakai akun lain" → back to the KTP data to fix it.
      toast(res.error, "error");
      setNikError(res.error);
      setSelfie(null);
      return go("ktp");
    }
    setResult({ method: "ekyc", nameOnKtp: ktp.name, nik: ktp.nik, mismatch: !nameMatches(user.name, ktp.name) });
    go("done");
  };

  const statusNotice =
    user.verification.status === "menunggu" ? (
      <Notice icon={<Clock className="size-4" />} title="Pengajuanmu sedang ditinjau admin">
        Mau lebih cepat? Ulangi lewat scan otomatis di bawah.
      </Notice>
    ) : user.verification.status === "ditolak" ? (
      <Notice icon={<RotateCcw className="size-4" />} title="Verifikasi sebelumnya ditolak">
        {latestRequest?.reason ? `Alasan: ${latestRequest.reason}. ` : ""}Ulangi dengan foto yang lebih jelas, ya.
      </Notice>
    ) : undefined;

  return (
    <Container narrow className="py-5 lg:py-10">
      <div className="mx-auto max-w-lg">
        {showStatus ? (
          <VerifiedStatus user={user} next={next} onRedo={() => setShowStatus(false)} />
        ) : (
          <>
            <div className="mb-6">
              <p className="mb-3 flex items-center gap-1.5 text-caption text-smoke">
                <FlaskConical className="size-3.5" /> Prototipe: eKYC disimulasikan, tanpa vendor.
              </p>
              <StepProgress current={step} />
            </div>
            {step === "intro" && <IntroStep user={user} onStart={() => go("ktp")} onSkip={skip} notice={statusNotice} />}
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
              />
            )}
            {step === "selfie" && <SelfieStep capture={selfie} matching={matching} onCapture={finish} onBack={() => go("ktp")} onSkip={skip} />}
            {step === "done" && result && <DoneStep user={user} result={result} next={next} />}
          </>
        )}
      </div>
    </Container>
  );
}
