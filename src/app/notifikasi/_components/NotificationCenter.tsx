"use client";

import { Bell, BellRing, CheckCheck, Mail, Smartphone } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PushToggle } from "@/components/push/PushToggle";
import { Button } from "@/components/ui/Button";
import { Container, EmptyState, PageHeader } from "@/components/ui/Layout";
import { Tabs } from "@/components/ui/Tabs";
import { useAppConfig } from "@/lib/config";
import { isoDate } from "@/lib/format";
import { useAppStore, useNow } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { User } from "@/lib/types";
import { NotificationItem } from "./NotificationItem";

type Filter = "semua" | "belum-dibaca";

/** FR-C2 channels: in-app is live in the prototype; web push and email are planned. */
function Channels() {
  const chip = "inline-flex h-7 items-center gap-1.5 rounded-control px-3 text-caption font-medium";
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Saluran notifikasi">
      <span className={`${chip} bg-ink text-white`}>
        <BellRing className="size-3.5" aria-hidden /> Di aplikasi · aktif
      </span>
      <span className={`${chip} border border-border-gray text-graphite`}>
        <Smartphone className="size-3.5" aria-hidden /> Web push · segera
      </span>
      <span className={`${chip} border border-border-gray text-graphite`}>
        <Mail className="size-3.5" aria-hidden /> Email · segera
      </span>
    </div>
  );
}

export function NotificationCenter({ user }: { user: User }) {
  const now = useNow();
  const all = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationsRead);
  // v2 servers: real web push + preferences (F6.5/F6.6); v1/demo keeps the "segera" chips.
  const fromServer = useAppConfig((s) => s.fromServer);
  const [filter, setFilter] = useState<Filter>("semua");
  const mine = useMemo(() => all.filter((n) => n.userId === user.id).sort((a, b) => b.at - a.at), [all, user.id]);
  const unread = mine.filter((n) => !n.read).length;
  const shown = filter === "semua" ? mine : mine.filter((n) => !n.read);
  const today = isoDate(now);
  const groups = [
    { title: "Hari ini", items: shown.filter((n) => isoDate(n.at) === today) },
    { title: "Sebelumnya", items: shown.filter((n) => isoDate(n.at) !== today) },
  ].filter((g) => g.items.length);
  const onRead = (id: string) => markRead(user.id, [id]);

  return (
    <Container narrow className="py-2 lg:py-4">
      <PageHeader
        title="Notifikasi"
        subtitle={unread ? `${unread} belum dibaca` : "Semua sudah dibaca"}
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled={!unread}
            onClick={() => {
              markRead(user.id);
              toast("Semua notifikasi ditandai dibaca.", "success");
            }}
          >
            <CheckCheck className="size-4" />
            <span className="hidden min-[400px]:inline">Tandai semua dibaca</span>
            <span className="min-[400px]:hidden">Baca semua</span>
          </Button>
        }
      />
      {fromServer ? (
        <div className="mb-4">
          <PushToggle />
          <Link href="/profil/pengaturan#notifikasi" className="mt-2 inline-flex h-9 items-center gap-1 rounded-control text-body-sm font-medium text-ink underline underline-offset-4">
            Atur jenis notifikasi dan jam tenang
          </Link>
        </div>
      ) : (
        <Channels />
      )}

      {mine.length === 0 ? (
        <EmptyState icon={<Bell className="size-5" />} title="Belum ada notifikasi" description="Kabar soal request sewa, chat, serah terima, dan sengketa akan muncul di sini." />
      ) : (
        <>
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { value: "semua", label: "Semua" },
              { value: "belum-dibaca", label: "Belum dibaca", count: unread },
            ]}
            className="mb-2"
          />
          {groups.length === 0 ? (
            <p className="rounded-card bg-soft-gray px-4 py-8 text-center text-body-sm text-smoke">Semua notifikasi sudah kamu baca.</p>
          ) : (
            groups.map((g) => (
              <section key={g.title} className="mt-4" aria-label={g.title}>
                <h2 className="mb-1 text-caption font-semibold uppercase tracking-[0.08em] text-ink">{g.title}</h2>
                <ul className="-mx-2 divide-y divide-border-gray">
                  {g.items.map((n) => (
                    <NotificationItem key={n.id} n={n} now={now} onRead={onRead} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </Container>
  );
}
