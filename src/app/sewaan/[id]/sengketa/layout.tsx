import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Sengketa" };

export default function SengketaLayout({ children }: { children: ReactNode }) {
  return children;
}
