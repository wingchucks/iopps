import { redirect } from "next/navigation";

// Legacy browsing URLs must never resolve another member's profile.
export default function RetiredPage() {
  redirect("/org/dashboard/applications");
}
