"use client";

import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/ui/Gate";
import { safeNext } from "@/app/masuk/_components/helpers";
import { useRealSession } from "@/lib/session";
import { RealVerifyFlow } from "./RealVerifyFlow";
import { VerifyFlow } from "./VerifyFlow";

/** Reads ?next= — must sit inside <Suspense> (see page.tsx). */
export function VerifikasiClient() {
  const next = safeNext(useSearchParams().get("next"));
  // Real OTP accounts upload to the server (F6.2); demo personas keep the simulated eKYC.
  const real = useRealSession();
  // Keyed by user so switching accounts from the demo dock restarts the flow cleanly.
  return <RequireAuth>{(user) => (real ? <RealVerifyFlow key={user.id} user={user} next={next} /> : <VerifyFlow key={user.id} user={user} next={next} />)}</RequireAuth>;
}
