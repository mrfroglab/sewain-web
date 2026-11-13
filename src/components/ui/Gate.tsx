"use client";

import { IdCard, LogIn } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCurrentUser, useReady } from "@/lib/session";
import type { User } from "@/lib/types";
import { ButtonLink } from "./Button";
import { Container, EmptyState, PageSkeleton } from "./Layout";

/** Render children only after localStorage data + tab session are loaded (avoids hydration mismatches). */
export function Ready({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const ready = useReady();
  return <>{ready ? children : fallback ?? <PageSkeleton />}</>;
}

/** Signed-in only. Guests see a sign-in prompt that returns them here afterwards. */
export function RequireAuth({ children, role }: { children: (user: User) => ReactNode; role?: "admin" }) {
  const ready = useReady();
  const user = useCurrentUser();
  const path = usePathname();
  if (!ready) return <PageSkeleton />;
  if (!user)
    return (
      <Container className="py-10">
        <EmptyState
          icon={<LogIn className="size-5" />}
          title="Masuk dulu, yuk"
          description="Halaman ini butuh akun. Pakai akun demo atau daftar dengan nomor HP (OTP simulasi)."
          action={<ButtonLink href={`/masuk?next=${encodeURIComponent(path)}`}>Masuk / daftar</ButtonLink>}
        />
      </Container>
    );
  if (role === "admin" && user.role !== "admin")
    return (
      <Container className="py-10">
        <EmptyState title="Khusus admin" description="Ganti ke akun Admin lewat tombol Mode demo untuk membuka panel admin." action={<ButtonLink href="/masuk">Ganti akun</ButtonLink>} />
      </Container>
    );
  return <>{children(user)}</>;
}

/**
 * FR-A6: unverified users may browse but not request or list.
 * Wrap an action area; shows a CTA to /verifikasi instead when the user is not verified.
 */
export function RequireVerified({ user, children, compact }: { user: User | null; children: ReactNode; compact?: boolean }) {
  const path = usePathname();
  if (!user)
    return (
      <ButtonLink href={`/masuk?next=${encodeURIComponent(path)}`} block>
        <LogIn className="size-4" /> Masuk untuk melanjutkan
      </ButtonLink>
    );
  if (user.verification.status !== "terverifikasi")
    return compact ? (
      <ButtonLink href={`/verifikasi?next=${encodeURIComponent(path)}`} block>
        <IdCard className="size-4" /> Verifikasi KTP dulu
      </ButtonLink>
    ) : (
      <div className="rounded-[12px] bg-soft-gray p-4">
        <p className="text-body-sm font-semibold text-ink">Verifikasi identitas dulu</p>
        <p className="mt-1 text-caption text-smoke">
          Akun yang belum terverifikasi bisa menjelajah, tapi belum bisa menyewa atau menyewakan. Prosesnya ±1 menit (scan KTP + selfie).
        </p>
        <ButtonLink href={`/verifikasi?next=${encodeURIComponent(path)}`} className="mt-3" size="sm">
          <IdCard className="size-4" /> Verifikasi sekarang
        </ButtonLink>
      </div>
    );
  if (user.status !== "aktif") return <p className="rounded-[12px] bg-soft-gray p-4 text-body-sm text-graphite">Akunmu sedang {user.status === "suspend" ? "ditangguhkan" : "diblokir"}. Hubungi admin.</p>;
  return <>{children}</>;
}
