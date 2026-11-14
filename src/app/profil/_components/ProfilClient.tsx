"use client";

import { useMemo } from "react";
import { RequireAuth } from "@/components/ui/Gate";
import { Container } from "@/components/ui/Layout";
import { isOpenBooking, trustScore, unreadNotifications, userRating } from "@/lib/selectors";
import { useAppStore, useNow } from "@/lib/store";
import type { User } from "@/lib/types";
import { AccountActions } from "./AccountActions";
import { LinksSection } from "./LinksSection";
import { PersonalSection } from "./PersonalSection";
import { ProfileHeader } from "./ProfileHeader";
import { StatsRow } from "./StatsRow";
import { StoreSection } from "./StoreSection";
import { StrikesSection } from "./StrikesSection";

export function ProfilClient() {
  return <RequireAuth>{(user) => <ProfileView user={user} />}</RequireAuth>;
}

function ProfileView({ user }: { user: User }) {
  const now = useNow();
  const users = useAppStore((s) => s.users);
  const reviews = useAppStore((s) => s.reviews);
  const bookings = useAppStore((s) => s.bookings);
  const disputes = useAppStore((s) => s.disputes);
  const strikes = useAppStore((s) => s.strikes);
  const notifications = useAppStore((s) => s.notifications);

  const rating = useMemo(() => userRating({ users, reviews }, user.id, now), [users, reviews, user.id, now]);
  const trust = useMemo(() => trustScore({ users, reviews, bookings, disputes }, user.id, now), [users, reviews, bookings, disputes, user.id, now]);
  const myStrikes = useMemo(() => strikes.filter((s) => s.userId === user.id).sort((a, b) => b.at - a.at), [strikes, user.id]);
  const unread = useMemo(() => unreadNotifications({ notifications }, user.id), [notifications, user.id]);
  const openRentals = useMemo(() => bookings.filter((b) => (b.renterId === user.id || b.providerId === user.id) && isOpenBooking(b)).length, [bookings, user.id]);

  return (
    <Container narrow className="py-5 lg:py-10">
      <ProfileHeader user={user} />
      <StatsRow rating={rating} trust={trust} strikes={user.strikes} className="mt-6" />
      {user.role !== "admin" && <StoreSection key={`store-${user.id}`} user={user} />}
      <PersonalSection key={`me-${user.id}`} user={user} />
      <LinksSection user={user} unread={unread} openRentals={openRentals} />
      {(myStrikes.length > 0 || user.strikes > 0) && <StrikesSection strikes={myStrikes} />}
      <AccountActions />
    </Container>
  );
}
