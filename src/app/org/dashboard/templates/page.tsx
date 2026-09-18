import { redirect } from "next/navigation";

// The unused email-template editor had no delivery consumer. Keep old bookmarks.
export default function TemplatesPage() {
  redirect("/org/dashboard/jobs");
}
