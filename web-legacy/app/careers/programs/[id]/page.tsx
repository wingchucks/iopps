import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Training programs have been moved to the Education section.
 * This page redirects to the new location.
 */
export default async function CareersTrainingDetailRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/education/training/${id}`);
}
