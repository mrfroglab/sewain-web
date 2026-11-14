"use client";

import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/ui/Gate";
import { safeNext } from "@/app/masuk/_components/helpers";
import { VerifyFlow } from "./VerifyFlow";

/** Reads ?next= — must sit inside <Suspense> (see page.tsx). */
export function VerifikasiClient() {
  const next = safeNext(useSearchParams().get("next"));
  // Keyed by user so switching accounts from the demo dock restarts the flow cleanly.
  return <RequireAuth>{(user) => <VerifyFlow key={user.id} user={user} next={next} />}</RequireAuth>;
}
