import type { Metadata } from "next";
import ActionContent from "./ActionContent";

export const metadata: Metadata = {
  title: "Verify your email | IOPPS",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function VerificationActionPage() {
  return <ActionContent />;
}
