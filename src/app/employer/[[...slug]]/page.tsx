import { notFound, redirect } from "next/navigation";

type EmployerLegacyPageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function mapEmployerPath(segments: string[]): string | null {
  if (segments.some(segment => segment === "." || segment === ".." || /[\\/]/.test(segment))) return null;
  if (segments.length === 0) return "/org/dashboard";

  const [head, ...rest] = segments;
  const suffix = rest.length ? `/${rest.map(encodeURIComponent).join("/")}` : "";

  switch (head) {
    case "dashboard":
      return `/org/dashboard${suffix}`;
    case "signup":
      return rest.length === 0 ? "/org/signup" : null;
    case "upgrade":
      return rest.length === 0 ? "/org/upgrade" : null;
    case "plans":
      return rest.length === 0 ? "/org/plans" : null;
    case "onboarding":
      return rest.length === 0 ? "/org/onboarding" : null;
    case "checkout":
      return `/org/checkout${suffix}`;
    default:
      return null;
  }
}

export default async function EmployerLegacyRedirectPage({ params, searchParams }: EmployerLegacyPageProps) {
  const resolved = await params;
  const nextPath = mapEmployerPath(resolved.slug ?? []);

  if (!nextPath) {
    notFound();
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (value !== undefined) query.append(key, value);
  }
  redirect(nextPath + (query.size ? `?${query}` : ""));
}
