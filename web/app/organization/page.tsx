import { redirect } from "next/navigation";

// Redirect /organization to the unified employer dashboard at /organization/dashboard
// The new dashboard includes all features: Overview, Opportunities, Applications,
// Messages, Videos, Events (Pow Wows), Shop, Billing, and Profile
export default function EmployerDashboardRedirect() {
  redirect("/organization/dashboard");
}
