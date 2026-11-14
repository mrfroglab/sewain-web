"use client";

import { ArrowLeftRight, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";

/** "Ganti akun (demo)" and "Keluar". */
export function AccountActions() {
  const router = useRouter();
  const signOut = useSession((s) => s.signOut);

  const logout = () => {
    router.push("/");
    signOut();
    toast("Kamu sudah keluar.", "success");
  };

  return (
    <section className="mt-10 grid gap-2 sm:grid-cols-2" aria-label="Akun">
      <ButtonLink href="/masuk?ganti=1" variant="secondary" size="lg" block>
        <ArrowLeftRight className="size-4" /> Ganti akun (demo)
      </ButtonLink>
      <Button variant="secondary" size="lg" block onClick={logout}>
        <LogOut className="size-4" /> Keluar
      </Button>
    </section>
  );
}
