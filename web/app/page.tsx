import LandingPage from "@/components/landing/LandingPage";
import { RoleRedirect } from "@/components/auth/RoleRedirect";

export default function HomePage() {
  return (
    <>
      <RoleRedirect />
      <LandingPage />
    </>
  );
}
