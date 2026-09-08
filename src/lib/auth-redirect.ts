/** Accept only a local route when resuming a signed-out visitor's journey. */
export function safeAuthRedirect(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return null;
  return value;
}
