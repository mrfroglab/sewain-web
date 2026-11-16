"use client";

import { Eye, Lock, SearchX } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { ButtonLink } from "@/components/ui/Button";
import { Container, EmptyState } from "@/components/ui/Layout";
import { useEnsureUsers } from "@/lib/profiles";
import { bookingRole, publicName, unreadMessages } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import type { ID, User } from "@/lib/types";
import { ChatHeader } from "./ChatHeader";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";

/** Height of the sticky site header, kept in sync with its two rows (fallback ≈ 109px). */
function useSiteHeaderHeight(): number {
  const [h, setH] = useState(109);
  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>("body > header") ?? document.querySelector<HTMLElement>("header");
    if (!el) return;
    const update = () => setH(Math.round(el.getBoundingClientRect().height));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return h;
}

/** Phones: the chat fills the screen between header and tab bar, so the page itself must not scroll. */
function useLockPageScrollOnPhones() {
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(max-width: 1023.98px)");
    const apply = () => {
      root.style.overflow = mq.matches ? "hidden" : "";
      if (mq.matches) window.scrollTo(0, 0);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      root.style.overflow = "";
    };
  }, []);
}

/**
 * Full-height chat shell. Phones: exactly the space between the site header and the tab bar,
 * with the composer pinned at the bottom (above the tab bar). Desktop: a bordered panel.
 */
function ChatShell({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const top = useSiteHeaderHeight();
  useLockPageScrollOnPhones();
  return (
    <div
      style={{ "--chat-top": `${top}px` } as CSSProperties}
      className="mx-auto flex h-[calc(100dvh_-_var(--chat-top)_-_var(--tabbar-h)_-_env(safe-area-inset-bottom))] w-full max-w-3xl flex-col bg-white lg:mt-6 lg:h-[calc(100dvh_-_var(--chat-top)_-_48px)] lg:overflow-hidden lg:rounded-card lg:shadow-hairline"
    >
      {children}
      {/* Bottom band. On phones the floating "Demo" chip sits at its left, so the text starts after it. */}
      <div className="flex min-h-12 shrink-0 items-center gap-2 border-t border-border-gray py-1.5 pl-[116px] pr-4 text-micro text-smoke sm:pl-[180px] lg:min-h-10 lg:pl-4">
        {footer}
      </div>
    </div>
  );
}

export function ChatRoom({ id, user }: { id: ID; user: User }) {
  const booking = useAppStore((s) => s.bookings.find((b) => b.id === id));
  const listing = useAppStore((s) => (booking ? s.listings.find((l) => l.id === booking.listingId) : undefined));
  const renter = useAppStore((s) => (booking ? s.users.find((u) => u.id === booking.renterId) : undefined));
  const provider = useAppStore((s) => (booking ? s.users.find((u) => u.id === booking.providerId) : undefined));
  useEnsureUsers([booking?.renterId, booking?.providerId]);
  const raw = useAppStore(useShallow((s) => s.messages.filter((m) => m.bookingId === id)));
  const messages = useMemo(() => [...raw].sort((a, b) => a.at - b.at), [raw]);
  const role = booking ? bookingRole(booking, user.id) : null;
  const mediator = !role && user.role === "admin";
  const unread = useAppStore((s) => (role ? unreadMessages(s, user.id, id) : 0));
  const otherId = booking && role ? (role === "penyewa" ? booking.providerId : booking.renterId) : null;
  const readByOtherAt = useAppStore((s) => (otherId ? s.chatReads[`${otherId}:${id}`] ?? 0 : null));
  const chatNotifs = useAppStore(useShallow((s) => s.notifications.filter((n) => n.userId === user.id && !n.read && n.kind === "chat" && n.href === `/sewaan/${id}/chat`).map((n) => n.id)));
  const markThreadRead = useAppStore((s) => s.markThreadRead);
  const markNotificationsRead = useAppStore((s) => s.markNotificationsRead);
  const now = useNow();

  // Opening the thread (and every new message from the other side, also from another tab) marks it read.
  useEffect(() => {
    if (role) markThreadRead(user.id, id);
  }, [role, user.id, id, markThreadRead]);
  useEffect(() => {
    if (role && unread > 0) markThreadRead(user.id, id);
  }, [role, unread, user.id, id, markThreadRead]);
  // "Pesan dari …" notifications for this thread are read once you're looking at it.
  useEffect(() => {
    if (chatNotifs.length) markNotificationsRead(user.id, chatNotifs);
  }, [chatNotifs, user.id, markNotificationsRead]);

  if (!booking || !listing)
    return (
      <Container className="py-10">
        <EmptyState
          icon={<SearchX className="size-5" />}
          title="Chat tidak ditemukan"
          description="Mungkin link-nya keliru, atau data demo baru saja di-reset."
          action={<ButtonLink href="/chat">Ke daftar chat</ButtonLink>}
        />
      </Container>
    );

  if (!role && !mediator)
    return (
      <Container className="py-10">
        <EmptyState
          icon={<Lock className="size-5" />}
          title="Khusus pihak yang bersewa"
          description="Chat sewa hanya bisa dibuka penyewa, penyedia, dan mediator Sewain."
          action={<ButtonLink href="/chat">Ke chat saya</ButtonLink>}
        />
      </Container>
    );

  const other = role === "penyewa" ? provider : renter;
  const nameOf = (uid: ID) => (uid === booking.renterId ? `${publicName(renter)} · Penyewa` : uid === booking.providerId ? `${publicName(provider)} · Penyedia` : "Pengguna");
  const demoPhoto = listing.photos.find((p) => !p.startsWith("idb:"));

  return (
    <ChatShell
      footer={
        mediator ? (
          <>
            <Eye className="size-3.5 shrink-0 text-graphite" aria-hidden />
            <span>Mode mediator: chat dibaca sebagai bukti. Admin tidak mengirim pesan di sini.</span>
          </>
        ) : (
          <>
            <Lock className="size-3.5 shrink-0 text-graphite" aria-hidden />
            <span>Chat tersimpan sebagai bukti dan tidak bisa dihapus selama sewa berjalan/sengketa.</span>
          </>
        )
      }
    >
      <ChatHeader
        booking={booking}
        listing={listing}
        other={other}
        otherRole={role === "penyewa" ? "Penyedia" : "Penyewa"}
        mediator={mediator ? { renter, provider } : undefined}
      />
      <MessageList
        booking={booking}
        messages={messages}
        rightId={mediator ? booking.providerId : user.id}
        nameOf={nameOf}
        showNames={mediator}
        readByOtherAt={readByOtherAt}
        now={now}
        emptyHint={mediator ? "Kedua pihak belum saling mengirim pesan." : `Sapa ${publicName(other)} dulu, yuk. Atur titik temu dan jam serah terima di sini.`}
      />
      {!mediator && <Composer booking={booking} userId={user.id} demoPhoto={demoPhoto} />}
    </ChatShell>
  );
}
