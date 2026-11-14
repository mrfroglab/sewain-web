import type { Metadata } from "next";
import { KeywordEditor } from "./_components/KeywordEditor";

export const metadata: Metadata = {
  title: "Kata terlarang · Admin",
  description: "Daftar kata kunci larangan untuk filter listing.",
};

export default function AdminKataTerlarangPage() {
  return <KeywordEditor />;
}
