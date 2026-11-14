import type { Metadata } from "next";
import { KomisiView } from "./_components/KomisiView";

export const metadata: Metadata = { title: "Komisi · Admin" };

export default function AdminKomisiPage() {
  return <KomisiView />;
}
