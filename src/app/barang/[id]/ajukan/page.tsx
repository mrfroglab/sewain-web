import type { Metadata } from "next";
import { RequestFlow } from "./_components/RequestFlow";

export const metadata: Metadata = { title: "Ajukan sewa" };

export default async function RequestPage({ params }: PageProps<"/barang/[id]/ajukan">) {
  const { id } = await params;
  return <RequestFlow id={id} />;
}
