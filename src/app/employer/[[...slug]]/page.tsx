import { notFound, redirect } from "next/navigation";

type EmployerLegacyPageProps = {
  params: Promise<{ slug?: string[] }>;
};

function mapEmployerPath(segments: string[]): string | null {
  if (segments.length === 0) return "/org/dashboard";

  const [head, ...rest] = segments;
  const suffix = rest.length ? `/${rest.join("/")}` : "";

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

export default async function EmployerLegacyRedirectPage({ params }: EmployerLegacyPageProps) {
  const resolved = await params;
  const nextPath = mapEmployerPath(resolved.slug ?? []);

  if (!nextPath) {
    notFound();
  }

  redirect(nextPath);
}
