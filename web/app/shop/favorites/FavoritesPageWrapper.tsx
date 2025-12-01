"use client";

import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { FavoritesPageClient } from "./FavoritesPageClient";

/**
 * Client component wrapper that ensures FavoritesProvider and FavoritesPageClient
 * are in the same client boundary for proper context access during SSG/SSR.
 */
export function FavoritesPageWrapper() {
  return (
    <FavoritesProvider>
      <FavoritesPageClient />
    </FavoritesProvider>
  );
}
