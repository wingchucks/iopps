type CacheableResponse = {
  headers: {
    set(name: string, value: string): void;
  };
};

export const PUBLIC_DETAIL_CACHE_SECONDS = 900;
export const PUBLIC_DETAIL_CACHE_CONTROL =
  "public, s-maxage=900, stale-while-revalidate=86400";

export function withPublicDetailCache<T extends CacheableResponse>(response: T): T {
  response.headers.set("Cache-Control", PUBLIC_DETAIL_CACHE_CONTROL);
  return response;
}
