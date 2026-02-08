import LandingPage from "@/components/landing/LandingPage";
import { AuthHomeRedirect } from "@/components/AuthHomeRedirect";

export default function HomePage() {
  return (
    <>
      <AuthHomeRedirect />
      <LandingPage />
    </>
  );
}
