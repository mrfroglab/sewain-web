import type { Metadata } from "next";
import { Ringkasan } from "./_components/ringkasan/Ringkasan";

export const metadata: Metadata = {
  title: "Ringkasan admin",
  description: "Ringkasan data Sewain: booking per status, nilai sewa, komisi, sengketa, dan sewa selesai per minggu.",
};

export default function AdminPage() {
  return <Ringkasan />;
}
