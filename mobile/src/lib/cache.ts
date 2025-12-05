import AsyncStorage from "@react-native-async-storage/async-storage";
import { cacheLogger } from "./logger";

// Cache configuration
const CACHE_PREFIX = "@iopps:";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default TTL

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Get an item from cache
 * Returns null if not found or expired
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache has expired
    if (now - entry.timestamp > entry.ttl) {
      // Expired, remove from cache
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return entry.data;
  } catch (error) {
    cacheLogger.error("Cache read error", error);
    return null;
  }
}

/**
 * Save an item to cache with optional TTL
 */
export async function saveToCache<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL
): Promise<void> {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    cacheLogger.error("Cache write error", error);
  }
}

/**
 * Remove an item from cache
 */
export async function removeFromCache(key: string): Promise<void> {
  try {
    const cacheKey = CACHE_PREFIX + key;
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    cacheLogger.error("Cache remove error", error);
  }
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    cacheLogger.error("Cache clear error", error);
  }
}

/**
 * Clear expired entries from cache
 */
export async function clearExpiredCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    const now = Date.now();

    for (const key of cacheKeys) {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        try {
          const entry = JSON.parse(cached);
          if (now - entry.timestamp > entry.ttl) {
            await AsyncStorage.removeItem(key);
          }
        } catch {
          // Invalid cache entry, remove it
          await AsyncStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    cacheLogger.error("Clear expired cache error", error);
  }
}

// Cache keys for different data types
export const CACHE_KEYS = {
  JOBS: "jobs",
  JOB_DETAIL: (id: string) => `job:${id}`,
  CONFERENCES: "conferences",
  CONFERENCE_DETAIL: (id: string) => `conference:${id}`,
  SCHOLARSHIPS: "scholarships",
  SCHOLARSHIP_DETAIL: (id: string) => `scholarship:${id}`,
  VENDORS: "vendors",
  VENDOR_DETAIL: (id: string) => `vendor:${id}`,
  POWWOWS: "powwows",
  POWWOW_DETAIL: (id: string) => `powwow:${id}`,
  LIVE_STREAMS: "liveStreams",
  USER_PROFILE: (id: string) => `user:${id}`,
  SAVED_JOBS: (userId: string) => `savedJobs:${userId}`,
  APPLICATIONS: (userId: string) => `applications:${userId}`,
  JOB_ALERTS: (userId: string) => `jobAlerts:${userId}`,
  CONVERSATIONS: (userId: string) => `conversations:${userId}`,
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
};

// TTL configurations (in milliseconds)
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,        // 1 minute - for frequently changing data
  MEDIUM: 5 * 60 * 1000,       // 5 minutes - default
  LONG: 15 * 60 * 1000,        // 15 minutes - for semi-static data
  VERY_LONG: 60 * 60 * 1000,   // 1 hour - for static content
};

/**
 * Helper hook-style function to fetch with cache
 * First returns cached data, then fetches fresh data
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL
): Promise<{ data: T; fromCache: boolean }> {
  // Try to get from cache first
  const cached = await getFromCache<T>(key);

  if (cached !== null) {
    // Return cached data immediately, but also trigger background refresh
    fetcher().then((freshData) => {
      saveToCache(key, freshData, ttlMs);
    }).catch((err) => cacheLogger.error("Background refresh error", err));

    return { data: cached, fromCache: true };
  }

  // No cache, fetch fresh data
  const data = await fetcher();
  await saveToCache(key, data, ttlMs);

  return { data, fromCache: false };
}
