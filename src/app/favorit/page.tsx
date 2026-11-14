import type { Metadata } from "next";
import { FavoriteList } from "./_components/FavoriteList";

export const metadata: Metadata = { title: "Favorit" };

export default function FavoritPage() {
  return <FavoriteList />;
}
