"use client";

// Chat per booking (PRD 9.6, FR-C1–C3): text + photo, kept as evidence for the mediator.
// Only the two parties can write; the admin mediator reads along.

import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/ui/Gate";
import { ChatRoom } from "./_components/ChatRoom";

export default function BookingChatPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireAuth>{(user) => <ChatRoom id={id} user={user} />}</RequireAuth>;
}
