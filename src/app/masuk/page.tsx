import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/Layout";
import { MasukClient } from "./_components/MasukClient";

export const metadata: Metadata = {
  title: "Masuk atau daftar",
  description: "Masuk atau daftar Sewain dengan nomor HP. Di prototipe, kode OTP disimulasikan.",
};

export default function MasukPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MasukClient />
    </Suspense>
  );
}
