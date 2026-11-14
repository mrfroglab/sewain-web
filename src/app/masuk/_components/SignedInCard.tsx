"use client";

import { ArrowRight, ArrowLeftRight, BadgeCheck, IdCard } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";
import { maskPhone } from "@/lib/format";
import { isVerified, providerLabel } from "@/lib/selectors";
import type { User } from "@/lib/types";

/** Already signed in on this tab: say who, then continue or switch. */
export function SignedInCard({ user, next, onSwitch }: { user: User; next: string | null; onSwitch: () => void }) {
  const verified = isVerified(user);
  const target = next ?? (user.role === "admin" ? "/admin" : "/");
  return (
    <Container narrow className="py-10 lg:py-16">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <Avatar name={user.name} size={72} dark={user.role === "admin"} />
        <p className="mt-5 text-body-sm text-smoke">Kamu sedang masuk sebagai</p>
        <h1 className="mt-1 text-[24px] font-semibold leading-tight tracking-[-0.6px] text-ink">{user.name}</h1>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          {verified ? (
            <Badge tone="ink" icon={<BadgeCheck className="size-3" />}>
              Terverifikasi
            </Badge>
          ) : (
            <Badge tone="outline">Belum verifikasi</Badge>
          )}
          <Badge tone="soft">{user.role === "admin" ? "Admin" : user.accountType === "toko" ? `Toko · ${providerLabel(user)}` : "Individu"}</Badge>
          <span className="text-caption text-smoke">{maskPhone(user.phone)}</span>
        </div>

        <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
          <ButtonLink href={target} size="lg" block>
            Lanjut <ArrowRight className="size-4" />
          </ButtonLink>
          <Button variant="secondary" size="lg" block onClick={onSwitch}>
            <ArrowLeftRight className="size-4" /> Ganti akun
          </Button>
        </div>

        {!verified && (
          <ButtonLink href={`/verifikasi${next ? `?next=${encodeURIComponent(next)}` : ""}`} variant="link" className="mt-5 text-body-sm">
            <IdCard className="size-4" /> Verifikasi KTP dulu supaya bisa menyewa
          </ButtonLink>
        )}
      </div>
    </Container>
  );
}
