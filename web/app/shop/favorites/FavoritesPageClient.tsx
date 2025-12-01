"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useFavorites } from "@/contexts/FavoritesContext";
import { VendorCard, VendorCardSkeleton } from "@/components/shop/VendorCard";
import { getVendorById, type Vendor } from "@/lib/firebase/vendors";

export function FavoritesPageClient() {
  const { user, loading: authLoading } = useAuth();
  const { favorites, isLoadingFavorites, follows, isLoadingFollows } =
    useFavorites();

  const [favoriteVendors, setFavoriteVendors] = useState<Vendor[]>([]);
  const [followedVendors, setFollowedVendors] = useState<Vendor[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [activeTab, setActiveTab] = useState<"favorites" | "following">(
    "favorites"
  );

  // Load full vendor data for favorites
  useEffect(() => {
    async function loadVendors() {
      if (isLoadingFavorites) return;

      setIsLoadingVendors(true);
      try {
        const vendorPromises = favorites.map((f) => getVendorById(f.vendorId));
        const vendors = await Promise.all(vendorPromises);
        setFavoriteVendors(vendors.filter((v): v is Vendor => v !== null));
      } catch (error) {
        console.error("Error loading favorite vendors:", error);
      } finally {
        setIsLoadingVendors(false);
      }
    }

    loadVendors();
  }, [favorites, isLoadingFavorites]);

  // Load full vendor data for follows
  useEffect(() => {
    async function loadVendors() {
      if (isLoadingFollows || !user) return;

      try {
        const vendorPromises = follows.map((f) => getVendorById(f.vendorId));
        const vendors = await Promise.all(vendorPromises);
        setFollowedVendors(vendors.filter((v): v is Vendor => v !== null));
      } catch (error) {
        console.error("Error loading followed vendors:", error);
      }
    }

    loadVendors();
  }, [follows, isLoadingFollows, user]);

  // Show loading state
  if (authLoading || isLoadingFavorites) {
    return (
      <>
        <header>
          <h1 className="text-2xl font-bold text-slate-50 md:text-3xl">
            My Favorites
          </h1>
          <p className="mt-2 text-slate-400">
            Vendors you&apos;ve saved for later
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <VendorCardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  const currentVendors =
    activeTab === "favorites" ? favoriteVendors : followedVendors;
  const isLoading =
    activeTab === "favorites" ? isLoadingVendors : isLoadingFollows;
  const isEmpty = currentVendors.length === 0 && !isLoading;

  return (
    <>
      <header>
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/shop" className="hover:text-[#14B8A6]">
            Shop Indigenous
          </Link>
          <span>/</span>
          <span className="text-slate-200">
            {activeTab === "favorites" ? "Favorites" : "Following"}
          </span>
        </nav>

        <h1 className="mt-6 text-2xl font-bold text-slate-50 md:text-3xl">
          {activeTab === "favorites" ? "My Favorites" : "Following"}
        </h1>
        <p className="mt-2 text-slate-400">
          {activeTab === "favorites"
            ? "Vendors you've saved for later"
            : "Vendors you're following for updates"}
        </p>
      </header>

      {/* Tabs */}
      <div className="mt-6 flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("favorites")}
          className={`relative px-4 py-3 text-sm font-medium transition ${
            activeTab === "favorites"
              ? "text-[#14B8A6]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Favorites
          {favorites.length > 0 && (
            <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs">
              {favorites.length}
            </span>
          )}
          {activeTab === "favorites" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14B8A6]" />
          )}
        </button>

        {user && (
          <button
            onClick={() => setActiveTab("following")}
            className={`relative px-4 py-3 text-sm font-medium transition ${
              activeTab === "following"
                ? "text-[#14B8A6]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Following
            {follows.length > 0 && (
              <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs">
                {follows.length}
              </span>
            )}
            {activeTab === "following" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14B8A6]" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <VendorCardSkeleton key={i} />
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState
            type={activeTab}
            isAuthenticated={!!user}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {currentVendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
      </div>

      {/* Guest user prompt */}
      {!user && favorites.length > 0 && (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
          <p className="text-slate-300">
            Your favorites are saved locally on this device.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Sign in to sync your favorites across devices and follow vendors for
            updates.
          </p>
          <Link
            href="/login?redirect=/shop/favorites"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#14B8A6] px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#0D9488]"
          >
            Sign In to Sync
          </Link>
        </div>
      )}
    </>
  );
}

// Empty state component
function EmptyState({
  type,
  isAuthenticated,
}: {
  type: "favorites" | "following";
  isAuthenticated: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
      {type === "favorites" ? (
        <>
          <svg
            className="mx-auto h-12 w-12 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-slate-200">
            No favorites yet
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Start exploring and save vendors you love by clicking the heart icon.
          </p>
        </>
      ) : (
        <>
          <svg
            className="mx-auto h-12 w-12 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-slate-200">
            Not following anyone
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Follow vendors to stay updated on their latest news and products.
          </p>
        </>
      )}

      <Link
        href="/shop"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#14B8A6] px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#0D9488]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        Browse Vendors
      </Link>
    </div>
  );
}
