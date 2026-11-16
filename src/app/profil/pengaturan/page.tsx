import type { Metadata } from "next";
import { SettingsClient } from "./_components/SettingsClient";

export const metadata: Metadata = {
  title: "Pengaturan akun",
  description: "Sesi aktif, preferensi notifikasi, ekspor data, dan hapus akun Sewain.",
};

export default function PengaturanPage() {
  return <SettingsClient />;
}
