import { authIntentHref, postSignupDestination, safeAuthRedirect } from "@/lib/auth-redirect";

type Query = { get(name: string): string | null };

/** Only the authenticated account endpoint, not query role hints, selects a workspace. */
export function setupDestination(destination: unknown, query: Query, resolveOnly = false, photoRepair = false): string | null {
  const intent: Query = { get: name => {
    const value = query.get(name);
    return name === "redirect" && value && /^\/(setup|onboarding)(?:[/?#]|$)/.test(value) ? null : value;
  } };
  if (destination === "/setup") return resolveOnly ? destination : null;
  if (destination === "/feed") {
    if (!resolveOnly && (query.get("edit") === "1" || photoRepair)) return null;
    return setupCompletionDestination(query);
  }
  if (destination === "/signup?resume=organization&type=employer") return authIntentHref(destination, intent);
  if (destination === "/org/dashboard") return postSignupDestination(intent, destination);
  if (typeof destination === "string" && safeAuthRedirect(destination) && /^\/org\/onboarding(?:\?|$)/.test(destination)) return authIntentHref(destination, intent);
  if (destination === "/admin") return destination;
  throw new Error("We couldn’t load your account. Please retry.");
}

export function setupCompletionDestination(query: Query): string {
  const redirect = safeAuthRedirect(query.get("redirect"));
  if (!redirect || /^\/(setup|onboarding)(?:[/?#]|$)/.test(redirect)) return "/feed";
  return redirect;
}
