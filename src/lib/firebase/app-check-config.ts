export type AppCheckConfiguration =
  | { enabled: false }
  | { enabled: true; siteKey: string };

export function shouldEnforceAppCheck(
  enabledValue: string | undefined,
  siteKeyValue: string | undefined,
  hostname: string,
): boolean {
  return getAppCheckConfiguration(enabledValue, siteKeyValue, hostname).enabled;
}

export function getAppCheckConfiguration(
  enabledValue: string | undefined,
  siteKeyValue: string | undefined,
  hostname: string,
): AppCheckConfiguration {
  const siteKey = siteKeyValue?.trim();
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (enabledValue !== "true" || !siteKey || isLocal) return { enabled: false };
  return { enabled: true, siteKey };
}
