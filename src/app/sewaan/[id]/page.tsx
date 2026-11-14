"use client";

import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/ui/Gate";
import { BookingDetail } from "./_components/BookingDetail";

/** /sewaan/[id] — booking detail, the hub of the rental cycle (status × role driven). */
export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <RequireAuth>{(user) => <BookingDetail bookingId={id} user={user} />}</RequireAuth>;
}
