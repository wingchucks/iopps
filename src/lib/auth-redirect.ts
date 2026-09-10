export function signupPasswordError(password: string): string | null {
  if (!password) return 'Password is required.';
  return password.length < 8 ? 'Password must be at least 8 characters.' : null;
}

type IntentQuery = { get(name: string): string | null };
const PLAN_IDS = ['tier1', 'tier2', 'tier3', 'standard-post', 'featured-post', 'program-post'];

/** Query intent is navigation only, never an entitlement or checkout authorization. */
export function authIntentHref(path: string, query: IntentQuery): string {
  const params = new URLSearchParams();
  const redirect = safeAuthRedirect(query.get('redirect'));
  const plan = query.get('plan');
  if (redirect) params.set('redirect', redirect);
  if (plan && PLAN_IDS.includes(plan)) params.set('plan', plan);
  return path + (params.size ? `${path.includes('?') ? '&' : '?'}${params}` : '');
}

export function postSignupDestination(query: IntentQuery, fallback: string): string {
  const plan = query.get('plan');
  const redirect = safeAuthRedirect(query.get('redirect'));
  if (plan && PLAN_IDS.includes(plan)) {
    const params = new URLSearchParams({ plan });
    if (redirect) params.set('redirect', redirect);
    return `/org/checkout?${params}`;
  }
  return redirect || fallback;
}

/** Accept only a local route when resuming a signed-out visitor's journey. */
export function safeAuthRedirect(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return null;
  return value;
}
