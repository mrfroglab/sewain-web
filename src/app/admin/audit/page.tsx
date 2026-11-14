import type { Metadata } from "next";
import { AuditView } from "./_components/AuditView";

export const metadata: Metadata = { title: "Log audit · Admin" };

export default function AdminAuditPage() {
  return <AuditView />;
}
