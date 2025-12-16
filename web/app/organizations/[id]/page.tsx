import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

// Redirect to canonical /employers/[id] URL
export default async function OrganizationProfilePage({ params }: Props) {
  const { id } = await params;
  redirect(`/employers/${id}`);
}
