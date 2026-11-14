import type { Metadata } from "next";
import { EditListing } from "../_components/ListingEditor";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: PageProps<"/penyedia/barang/[id]">) {
  const { id } = await params;
  return <EditListing id={id} />;
}
