import { redirect } from "next/navigation";

// Redirect from legacy URL to the correct route
export default function PowwowNewRedirect() {
  redirect("/organization/powwows/new");
}
