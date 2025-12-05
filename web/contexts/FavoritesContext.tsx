"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getGuestFavorites,
  addGuestFavorite,
  removeGuestFavorite,
  getUserFavorites,
  addUserFavorite,
  removeUserFavorite,
  syncGuestFavoritesToUser,
  type GuestFavorite,
  type Favorite,
} from "@/lib/firebase/favorites";
import {
  getUserFollows,
  followVendor,
  unfollowVendor,
  type Follow,
  type FollowInput,
} from "@/lib/firebase/follows";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FavoriteVendor {
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  vendorImage?: string;
}

interface FavoritesContextValue {
  // Favorites
  favorites: FavoriteVendor[];
  favoriteIds: Set<string>;
  isLoadingFavorites: boolean;
  toggleFavorite: (vendor: {
    id: string;
    slug: string;
    businessName: string;
    logoUrl?: string;
  }) => Promise<boolean>;
  isFavorited: (vendorId: string) => boolean;
  refreshFavorites: () => Promise<void>;

  // Follows
  follows: Follow[];
  followIds: Set<string>;
  isLoadingFollows: boolean;
  toggleFollow: (vendor: FollowInput) => Promise<boolean>;
  isFollowing: (vendorId: string) => boolean;
  refreshFollows: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined
);

// ============================================================================
// PROVIDER
// ============================================================================

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const { user, loading: authLoading } = useAuth();

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteVendor[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  // Follows state
  const [follows, setFollows] = useState<Follow[]>([]);
  const [followIds, setFollowIds] = useState<Set<string>>(new Set());
  const [isLoadingFollows, setIsLoadingFollows] = useState(true);

  // Track if we've synced guest favorites
  const [hasSyncedGuest, setHasSyncedGuest] = useState(false);

  // Load favorites
  const loadFavorites = useCallback(async () => {
    setIsLoadingFavorites(true);
    try {
      if (user) {
        // Load from Firestore
        const userFavorites = await getUserFavorites(user.uid);
        const favs = userFavorites.map((f) => ({
          vendorId: f.vendorId,
          vendorSlug: f.vendorSlug,
          vendorName: f.vendorName,
          vendorImage: f.vendorImage,
        }));
        setFavorites(favs);
        setFavoriteIds(new Set(favs.map((f) => f.vendorId)));
      } else {
        // Load from localStorage
        const guestFavorites = getGuestFavorites();
        const favs = guestFavorites.map((f) => ({
          vendorId: f.vendorId,
          vendorSlug: f.vendorSlug,
          vendorName: f.vendorName,
          vendorImage: f.vendorImage,
        }));
        setFavorites(favs);
        setFavoriteIds(new Set(favs.map((f) => f.vendorId)));
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setIsLoadingFavorites(false);
    }
  }, [user]);

  // Load follows (only for authenticated users)
  const loadFollows = useCallback(async () => {
    if (!user) {
      setFollows([]);
      setFollowIds(new Set());
      setIsLoadingFollows(false);
      return;
    }

    setIsLoadingFollows(true);
    try {
      const userFollows = await getUserFollows(user.uid);
      setFollows(userFollows);
      setFollowIds(new Set(userFollows.map((f) => f.vendorId)));
    } catch (error) {
      console.error("Error loading follows:", error);
    } finally {
      setIsLoadingFollows(false);
    }
  }, [user]);

  // Sync guest favorites when user logs in
  useEffect(() => {
    if (user && !hasSyncedGuest && !authLoading) {
      syncGuestFavoritesToUser(user.uid)
        .then((syncedCount) => {
          if (syncedCount > 0) {
            console.log(`Synced ${syncedCount} guest favorites to user account`);
            loadFavorites();
          }
        })
        .catch(console.error);
      setHasSyncedGuest(true);
    }
  }, [user, hasSyncedGuest, authLoading, loadFavorites]);

  // Load data when auth state changes
  useEffect(() => {
    if (!authLoading) {
      loadFavorites();
      loadFollows();
    }
  }, [authLoading, loadFavorites, loadFollows]);

  // Reset sync flag when user logs out
  useEffect(() => {
    if (!user) {
      setHasSyncedGuest(false);
    }
  }, [user]);

  // Toggle favorite
  const toggleFavorite = useCallback(
    async (vendor: {
      id: string;
      slug: string;
      businessName: string;
      logoUrl?: string;
    }): Promise<boolean> => {
      const wasInFavorites = favoriteIds.has(vendor.id);

      // Optimistic update
      if (wasInFavorites) {
        setFavorites((prev) => prev.filter((f) => f.vendorId !== vendor.id));
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(vendor.id);
          return next;
        });
      } else {
        const newFav = {
          vendorId: vendor.id,
          vendorSlug: vendor.slug,
          vendorName: vendor.businessName,
          vendorImage: vendor.logoUrl,
        };
        setFavorites((prev) => [newFav, ...prev]);
        setFavoriteIds((prev) => new Set(prev).add(vendor.id));
      }

      try {
        if (user) {
          // Update Firestore
          if (wasInFavorites) {
            await removeUserFavorite(user.uid, vendor.id);
          } else {
            await addUserFavorite(user.uid, vendor);
          }
        } else {
          // Update localStorage
          if (wasInFavorites) {
            removeGuestFavorite(vendor.id);
          } else {
            addGuestFavorite(vendor);
          }
        }
        return !wasInFavorites;
      } catch (error) {
        // Revert optimistic update on error
        console.error("Error toggling favorite:", error);
        loadFavorites();
        return wasInFavorites;
      }
    },
    [user, favoriteIds, loadFavorites]
  );

  // Check if favorited
  const isFavorited = useCallback(
    (vendorId: string): boolean => {
      return favoriteIds.has(vendorId);
    },
    [favoriteIds]
  );

  // Toggle follow
  const toggleFollow = useCallback(
    async (vendor: FollowInput): Promise<boolean> => {
      if (!user) {
        // Following requires authentication
        return false;
      }

      const wasFollowing = followIds.has(vendor.vendorId);

      // Optimistic update
      if (wasFollowing) {
        setFollows((prev) => prev.filter((f) => f.vendorId !== vendor.vendorId));
        setFollowIds((prev) => {
          const next = new Set(prev);
          next.delete(vendor.vendorId);
          return next;
        });
      } else {
        // Note: we don't have full Follow data here, so just update the set
        setFollowIds((prev) => new Set(prev).add(vendor.vendorId));
      }

      try {
        if (wasFollowing) {
          await unfollowVendor(user.uid, vendor.vendorId);
        } else {
          await followVendor(user.uid, vendor);
        }
        // Refresh follows to get accurate data
        loadFollows();
        return !wasFollowing;
      } catch (error) {
        console.error("Error toggling follow:", error);
        loadFollows();
        return wasFollowing;
      }
    },
    [user, followIds, loadFollows]
  );

  // Check if following
  const isFollowing = useCallback(
    (vendorId: string): boolean => {
      return followIds.has(vendorId);
    },
    [followIds]
  );

  const value: FavoritesContextValue = {
    favorites,
    favoriteIds,
    isLoadingFavorites,
    toggleFavorite,
    isFavorited,
    refreshFavorites: loadFavorites,
    follows,
    followIds,
    isLoadingFollows,
    toggleFollow,
    isFollowing,
    refreshFollows: loadFollows,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);

  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }

  return context;
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook for a single vendor's favorite/follow status
 */
export function useVendorStatus(vendorId: string) {
  const { isFavorited, toggleFavorite, isFollowing, toggleFollow } =
    useFavorites();

  return {
    isFavorited: isFavorited(vendorId),
    isFollowing: isFollowing(vendorId),
    toggleFavorite,
    toggleFollow,
  };
}
