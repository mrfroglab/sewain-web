"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";
import { Ready } from "@/components/ui/Gate";
import { publicName } from "@/lib/selectors";
import { useCurrentUser, useSession } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { User } from "@/lib/types";
import { DemoAccounts } from "./DemoAccounts";
import { safeNext } from "./helpers";
import { OtpStep } from "./OtpStep";
import { PhoneStep } from "./PhoneStep";
import { RegisterStep } from "./RegisterStep";
import { SignedInCard } from "./SignedInCard";

/** Reads ?next= (and ?ganti=1 from "Ganti akun") — must sit inside <Suspense> (see page.tsx). */
export function MasukClient() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const switching = params.get("ganti") === "1";
  return (
    <Ready>
      <MasukFlow next={next} startSwitching={switching} />
    </Ready>
  );
}

type Step = { name: "phone" } | { name: "otp"; phone: string } | { name: "register"; phone: string } | { name: "leaving" };

function MasukFlow({ next, startSwitching }: { next: string | null; startSwitching: boolean }) {
  const router = useRouter();
  const user = useCurrentUser();
  const signIn = useSession((s) => s.signIn);
  const [step, setStep] = useState<Step>({ name: "phone" });
  const [switching, setSwitching] = useState(startSwitching);
  const [phoneDraft, setPhoneDraft] = useState("");

  const leave = (href: string) => {
    setStep({ name: "leaving" });
    router.push(href);
  };

  /** Sign in and continue to ?next= (admin lands on the admin panel when there is no next). */
  const enter = (u: User, message: string) => {
    signIn(u.id);
    toast(message, "success");
    leave(next ?? (u.role === "admin" ? "/admin" : "/"));
  };

  const onOtpVerified = (phone: string) => {
    const existing = useAppStore.getState().users.find((u) => u.phone === phone);
    if (!existing) return setStep({ name: "register", phone });
    if (existing.status === "blacklist") {
      toast("Nomor ini terhubung ke akun yang diblokir. Hubungi admin Sewain.", "error");
      return setStep({ name: "phone" });
    }
    enter(existing, `Selamat datang kembali, ${publicName(existing)}!`);
  };

  const onRegistered = (userId: string) => {
    signIn(userId);
    toast("Akun dibuat! Satu langkah lagi: verifikasi KTP.", "success");
    leave(`/verifikasi${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  };

  if (step.name === "leaving")
    return (
      <Container narrow className="py-20">
        <p className="flex items-center justify-center gap-2 text-body-sm text-smoke" role="status">
          <Spinner /> Mengalihkan…
        </p>
      </Container>
    );

  if (user && !switching && step.name === "phone") return <SignedInCard user={user} next={next} onSwitch={() => setSwitching(true)} />;

  if (step.name === "otp")
    return (
      <Container narrow className="py-6 lg:py-12">
        <div className="mx-auto max-w-md">
          <OtpStep phone={step.phone} onBack={() => setStep({ name: "phone" })} onVerified={() => onOtpVerified(step.phone)} />
        </div>
      </Container>
    );

  if (step.name === "register")
    return (
      <Container narrow className="py-6 lg:py-12">
        <div className="mx-auto max-w-md">
          <RegisterStep phone={step.phone} onBack={() => setStep({ name: "phone" })} onRegistered={onRegistered} />
        </div>
      </Container>
    );

  return (
    <Container className="py-6 lg:py-12">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:gap-16">
        <PhoneStep
          value={phoneDraft}
          onChange={setPhoneDraft}
          onSubmit={(phone) => setStep({ name: "otp", phone })}
          currentUser={switching ? user : null}
        />
        <DemoAccounts currentUserId={user?.id} onPick={(u) => enter(u, `Masuk sebagai ${publicName(u)}.`)} />
      </div>
    </Container>
  );
}
