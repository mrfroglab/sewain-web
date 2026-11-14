import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui/Layout";
import { UserDirectory } from "./_components/UserDirectory";

export const metadata: Metadata = {
  title: "Pengguna · Admin",
  description: "Kelola strike, suspend, dan blacklist pengguna.",
};

export default function AdminPenggunaPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UserDirectory />
    </Suspense>
  );
}
