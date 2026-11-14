import type { Metadata } from "next";
import { JaminanView } from "./_components/JaminanView";

export const metadata: Metadata = { title: "Saran jaminan · Admin" };

export default function AdminJaminanPage() {
  return <JaminanView />;
}
