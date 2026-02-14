import { redirect } from "next/navigation";

// Organization dashboard is deprecated — employers now use the feed
// and manage their org via the profile page at /organizations/[slug]
export default function OrganizationDashboardHome() {
  redirect("/discover");
}
