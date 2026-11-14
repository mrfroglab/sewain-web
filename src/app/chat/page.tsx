"use client";

// Chat inbox: one conversation per booking (PRD 9.6), newest activity first.

import { RequireAuth } from "@/components/ui/Gate";
import { Inbox } from "./_components/Inbox";

export default function ChatInboxPage() {
  return <RequireAuth>{(user) => <Inbox user={user} />}</RequireAuth>;
}
