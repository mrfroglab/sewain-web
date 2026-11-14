import type { Metadata } from "next";
import { PublicProfile } from "./_components/PublicProfile";

export const metadata: Metadata = { title: "Profil pengguna" };

export default async function ProfilePage({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  return <PublicProfile id={id} />;
}
