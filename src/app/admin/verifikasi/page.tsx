import type { Metadata } from "next";
import { VerificationQueue } from "./_components/VerificationQueue";

export const metadata: Metadata = {
  title: "Verifikasi identitas · Admin",
  description: "Antrean review manual KTP + selfie.",
};

export default function AdminVerifikasiPage() {
  return <VerificationQueue />;
}
