import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { FavoritesPageClient } from "./FavoritesPageClient";

export const metadata: Metadata = {
  title: "My Favorites | Shop Indigenous",
  description:
    "View and manage your favorite Indigenous vendors and artisans.",
};

export default function FavoritesPage() {
  return (
    <PageShell>
      <FavoritesPageClient />
    </PageShell>
  );
}
