import type { Metadata } from "next";
import { ReportQueue } from "./_components/ReportQueue";

export const metadata: Metadata = {
  title: "Laporan · Admin",
  description: "Moderasi listing dan pengguna yang dilaporkan.",
};

export default function AdminLaporanPage() {
  return <ReportQueue />;
}
