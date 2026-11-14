import type { Metadata } from "next";
import { MediatorWorkspace } from "./_components/MediatorWorkspace";

export const metadata: Metadata = { title: "Mediasi sengketa · Admin" };

export default async function AdminSengketaDetailPage({ params }: PageProps<"/admin/sengketa/[id]">) {
  const { id } = await params;
  return <MediatorWorkspace id={id} />;
}
