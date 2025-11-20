import { useSearchParams as useNextSearchParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

/**
 * Custom hook for managing search parameters with URL synchronization
 * Automatically syncs state with URL params and provides helpers for updating
 */
export function useSearchParams<T extends Record<string, any>>(
  defaultValues: T,
  debounceMs = 300
) {
  const searchParams = useNextSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [params, setParams] = useState<T>(() => {
    // Initialize from URL params if available
    const initialParams = { ...defaultValues };
    for (const [key, defaultValue] of Object.entries(defaultValues)) {
      const urlValue = searchParams?.get(key);
      if (urlValue !== null) {
        // Parse the value based on default value type
        if (typeof defaultValue === 'boolean') {
          initialParams[key as keyof T] = (urlValue === 'true') as any;
        } else if (typeof defaultValue === 'number') {
          const parsed = Number(urlValue);
          initialParams[key as keyof T] = (isNaN(parsed) ? defaultValue : parsed) as any;
        } else {
          initialParams[key as keyof T] = urlValue as any;
        }
      }
    }
    return initialParams;
  });

  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  // Update URL when params change
  useEffect(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    const timeout = setTimeout(() => {
      const newSearchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(params)) {
        const defaultValue = defaultValues[key];
        // Only add to URL if different from default
        if (value !== defaultValue && value !== '' && value !== null && value !== undefined) {
          if (typeof value === 'boolean') {
            if (value) newSearchParams.set(key, 'true');
          } else {
            newSearchParams.set(key, String(value));
          }
        }
      }

      const queryString = newSearchParams.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      // Only update if the URL actually changed
      if (window.location.pathname + window.location.search !== newUrl) {
        router.replace(newUrl, { scroll: false });
      }
    }, debounceMs);

    setDebounceTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, pathname]);

  const updateParam = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateParams = useCallback((updates: Partial<T>) => {
    setParams(prev => ({ ...prev, ...updates }));
  }, []);

  const resetParams = useCallback(() => {
    setParams(defaultValues);
  }, [defaultValues]);

  return {
    params,
    updateParam,
    updateParams,
    resetParams,
    setParams,
  };
}
