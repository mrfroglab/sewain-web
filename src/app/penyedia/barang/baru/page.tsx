import type { Metadata } from "next";
import { CreateListing } from "../_components/ListingEditor";

export const metadata: Metadata = { title: "Sewakan barang" };

export default function NewListingPage() {
  return <CreateListing />;
}
