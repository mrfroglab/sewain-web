import type { Metadata } from "next";
import { ProviderDashboard } from "./_components/ProviderDashboard";

export const metadata: Metadata = { title: "Dashboard penyedia" };

export default function ProviderPage() {
  return <ProviderDashboard />;
}
