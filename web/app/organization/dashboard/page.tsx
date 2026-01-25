import { redirect } from "next/navigation";

// Redirect legacy /organization/dashboard to new /organization route
// The new dashboard at /organization uses the (dashboard) route group with OrganizationShell
export default function LegacyDashboardRedirect() {
  redirect("/organization");
}
