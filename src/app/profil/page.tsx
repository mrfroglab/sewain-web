import type { Metadata } from "next";
import { ProfilClient } from "./_components/ProfilClient";

export const metadata: Metadata = {
  title: "Profil",
  description: "Akun, verifikasi, reputasi, dan pengaturan Sewain-mu.",
};

export default function ProfilPage() {
  return <ProfilClient />;
}
