import type { Metadata } from "next";
import { DisputeQueue } from "./_components/DisputeQueue";

export const metadata: Metadata = { title: "Sengketa · Admin" };

export default function AdminSengketaPage() {
  return <DisputeQueue />;
}
