import { redirect } from "next/navigation";

// Redirect from legacy URL to the correct route
export default function ConferenceNewRedirect() {
  redirect("/organization/conferences/new");
}
