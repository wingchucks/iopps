import { redirect } from "next/navigation";

/**
 * Training programs have been moved to the Education section.
 * This page redirects to the unified programs page with the provider filter.
 */
export default function CareersTrainingRedirect() {
  redirect("/education/programs?source=provider");
}
