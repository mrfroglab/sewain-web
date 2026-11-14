import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/Layout";
import { VerifikasiClient } from "./_components/VerifikasiClient";

export const metadata: Metadata = {
  title: "Verifikasi identitas",
  description: "Verifikasi KTP + selfie sekali saja supaya bisa menyewa dan menyewakan. Di prototipe, eKYC disimulasikan.",
};

export default function VerifikasiPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <VerifikasiClient />
    </Suspense>
  );
}
