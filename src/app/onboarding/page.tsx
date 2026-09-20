import { redirect } from "next/navigation";
import { authIntentHref } from "@/lib/auth-redirect";

/** Legacy bookmarks use the same guarded, saving member wizard as signup. */
export default async function OnboardingPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string") query.set(key, value);
  }
  redirect(authIntentHref("/setup", query));
}
