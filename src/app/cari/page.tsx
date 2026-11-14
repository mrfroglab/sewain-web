import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/Layout";
import { SearchView } from "./_components/SearchView";

export const metadata: Metadata = {
  title: "Cari barang",
  description: "Cari barang sewaan di sekitar kampus: atur radius, filter jaminan, tanggal, dan cara serah terima.",
};

// useSearchParams() lives in SearchView, so it must sit under a Suspense boundary.
export default function CariPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SearchView />
    </Suspense>
  );
}
