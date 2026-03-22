import { redirect } from "next/navigation";

export default function OrgDashboardProfileRedirect() {
  redirect("/org/dashboard?tab=Edit%20Profile&section=Identity");
}
