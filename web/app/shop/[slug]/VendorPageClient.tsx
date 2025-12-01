"use client";

import { useState, useEffect } from "react";
import { VendorCTA } from "@/components/shop/VendorCTA";
import type { Vendor } from "@/lib/firebase/vendors";

interface VendorPageClientProps {
  vendor: Vendor;
}

export function VendorPageClient({ vendor }: VendorPageClientProps) {
  const [isFavorited, setIsFavorited] = useState(false);

  // Load favorite state from localStorage on mount
  useEffect(() => {
    const favorites = localStorage.getItem("shopIndigenousFavorites");
    if (favorites) {
      try {
        const parsed = JSON.parse(favorites) as string[];
        setIsFavorited(parsed.includes(vendor.id));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [vendor.id]);

  const handleFavoriteClick = () => {
    const favorites = localStorage.getItem("shopIndigenousFavorites");
    let parsed: string[] = [];

    if (favorites) {
      try {
        parsed = JSON.parse(favorites) as string[];
      } catch {
        // Invalid JSON, start fresh
      }
    }

    if (isFavorited) {
      // Remove from favorites
      parsed = parsed.filter((id) => id !== vendor.id);
    } else {
      // Add to favorites
      parsed.push(vendor.id);
    }

    localStorage.setItem("shopIndigenousFavorites", JSON.stringify(parsed));
    setIsFavorited(!isFavorited);
  };

  return (
    <VendorCTA
      vendor={vendor}
      isFavorited={isFavorited}
      onFavoriteClick={handleFavoriteClick}
    />
  );
}
