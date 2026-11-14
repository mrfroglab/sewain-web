import type { Metadata } from "next";
import { ListingDetail } from "./_components/ListingDetail";

export const metadata: Metadata = { title: "Detail barang" };

export default async function ListingPage({ params }: PageProps<"/barang/[id]">) {
  const { id } = await params;
  return <ListingDetail id={id} />;
}
