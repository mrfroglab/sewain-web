"use client";

import { ArrowLeft, ServerOff } from "lucide-react";
import Link from "next/link";
import { RequireAuth } from "@/components/ui/Gate";
import { Container, EmptyState } from "@/components/ui/Layout";
import { useAppConfig } from "@/lib/config";
import type { User } from "@/lib/types";
import { DangerZone } from "./DangerZone";
import { ExportSection } from "./ExportSection";
import { NotificationPrefsSection } from "./NotificationPrefsSection";
import { SessionsSection } from "./SessionsSection";

/** F6.6: account settings backed by the v2 account endpoints. */
export function SettingsClient() {
  return <RequireAuth>{(user) => <Settings user={user} />}</RequireAuth>;
}

function Settings({ user }: { user: User }) {
  const fromServer = useAppConfig((s) => s.fromServer);
  return (
    <Container narrow className="py-5 lg:py-10">
      <Link href="/profil" className="-ml-1 mb-3 inline-flex h-9 items-center gap-1.5 rounded-control px-2 text-body-sm font-medium text-ink hover:bg-soft-gray">
        <ArrowLeft className="size-4" /> Profil
      </Link>
      <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.6px] text-ink">Pengaturan akun</h1>
      <p className="mt-1 text-body-sm text-smoke">Perangkat yang sedang masuk, notifikasi, dan data pribadimu.</p>
      {fromServer ? (
        <>
          <SessionsSection />
          <NotificationPrefsSection />
          <ExportSection user={user} />
          <DangerZone user={user} />
        </>
      ) : (
        <EmptyState
          className="mt-8"
          icon={<ServerOff className="size-5" />}
          title="Belum tersedia di versi demo ini"
          description="Sesi aktif, preferensi notifikasi, ekspor data, dan hapus akun butuh server Sewain v2."
        />
      )}
    </Container>
  );
}
