import { redirect } from "next/navigation";

interface ShopSetupPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function ShopSetupPage({ searchParams }: ShopSetupPageProps) {
  const params = await searchParams;
  const plan = params.plan;

  // Redirect to shop dashboard which handles vendor onboarding
  // Pass along the plan parameter if provided (e.g., ?plan=annual)
  redirect(`/organization/shop/dashboard${plan ? `?plan=${plan}` : ""}`);
}
