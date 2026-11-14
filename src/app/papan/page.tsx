import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/Layout";
import { BoardView } from "./_components/BoardView";

export const metadata: Metadata = {
  title: "Papan permintaan",
  description: "Tulis barang yang kamu cari. Penyedia di sekitar kampus langsung dapat notifikasi.",
};

// BoardView reads ?buat=1&q= with useSearchParams(), so it must sit under a Suspense boundary.
export default function PapanPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BoardView />
    </Suspense>
  );
}
