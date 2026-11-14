"use client";

// In-app notifications (PRD 9.6 FR-C2): live in the prototype. Web push and email come later.

import { RequireAuth } from "@/components/ui/Gate";
import { NotificationCenter } from "./_components/NotificationCenter";

export default function NotificationsPage() {
  return <RequireAuth>{(user) => <NotificationCenter user={user} />}</RequireAuth>;
}
