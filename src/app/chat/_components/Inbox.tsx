"use client";

import { MessagesSquare, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ButtonLink } from "@/components/ui/Button";
import { Container, EmptyState, PageHeader } from "@/components/ui/Layout";
import { Tabs } from "@/components/ui/Tabs";
import { useEnsureUsers } from "@/lib/profiles";
import { useAppStore, useNow } from "@/lib/store";
import type { User } from "@/lib/types";
import { InboxRow } from "./InboxRow";
import { buildThreads } from "./threads";

type Filter = "semua" | "belum-dibaca" | "penyewa" | "penyedia";

export function Inbox({ user }: { user: User }) {
  const now = useNow();
  const data = useAppStore(useShallow((s) => ({ bookings: s.bookings, messages: s.messages, listings: s.listings, users: s.users, chatReads: s.chatReads })));
  const threads = useMemo(() => buildThreads(data, user.id), [data, user.id]);
  useEnsureUsers(threads.map((t) => (t.role === "penyewa" ? t.booking.providerId : t.booking.renterId)));
  const [filter, setFilter] = useState<Filter>("semua");

  if (user.role === "admin")
    return (
      <Container narrow className="py-6">
        <PageHeader title="Chat" className="pt-0 lg:pt-2" />
        <EmptyState
          icon={<Scale className="size-5" />}
          title="Admin tidak punya chat sewa"
          description="Sebagai mediator, kamu membaca chat kedua pihak dari halaman sengketa. Chat tidak bisa dikirim dari akun admin."
          action={<ButtonLink href="/admin/sengketa">Buka antrean sengketa</ButtonLink>}
        />
      </Container>
    );

  const unreadThreads = threads.filter((t) => t.unread > 0).length;
  const asRenter = threads.filter((t) => t.role === "penyewa").length;
  const asProvider = threads.length - asRenter;
  const shown = threads.filter((t) => (filter === "semua" ? true : filter === "belum-dibaca" ? t.unread > 0 : t.role === filter));
  const items: { value: Filter; label: string; count?: number }[] = [
    { value: "semua", label: "Semua" },
    { value: "belum-dibaca", label: "Belum dibaca", count: unreadThreads },
  ];
  // Role filters only help when the user is on both sides (e.g. a provider who also rents).
  if (asRenter && asProvider) items.push({ value: "penyewa", label: "Saya menyewa" }, { value: "penyedia", label: "Saya menyewakan" });

  return (
    <Container narrow className="py-2 lg:py-4">
      <PageHeader title="Chat" subtitle="Satu percakapan untuk tiap sewaan. Semua pesan tersimpan sebagai bukti kalau ada sengketa." />

      {threads.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare className="size-5" />}
          title="Belum ada chat"
          description="Chat muncul setelah kamu mengajukan request sewa atau menerima request dari penyewa."
          action={<ButtonLink href="/cari">Cari barang</ButtonLink>}
        />
      ) : (
        <>
          <Tabs value={filter} onChange={setFilter} items={items} className="-mx-4 mb-2 px-4" />
          {shown.length === 0 ? (
            <p className="rounded-card bg-soft-gray px-4 py-8 text-center text-body-sm text-smoke">
              {filter === "belum-dibaca" ? "Semua pesan sudah kamu baca." : "Belum ada chat di sini."}
            </p>
          ) : (
            <ul className="-mx-2 divide-y divide-border-gray">
              {shown.map((t) => (
                <InboxRow key={t.booking.id} thread={t} userId={user.id} now={now} />
              ))}
            </ul>
          )}
        </>
      )}
    </Container>
  );
}
