type CacheableResponse = {
  headers: {
    set(name: string, value: string): void;
  };
};

// Used by related-job suggestions, which must drop a closed listing promptly
// (listing-lifecycle): a short CDN window with a short stale period, never a day.
export const PUBLIC_DETAIL_CACHE_SECONDS = 60;
export const PUBLIC_DETAIL_CACHE_CONTROL =
  "public, s-maxage=60, stale-while-revalidate=60";

export function withPublicDetailCache<T extends CacheableResponse>(response: T): T {
  response.headers.set("Cache-Control", PUBLIC_DETAIL_CACHE_CONTROL);
  return response;
}
