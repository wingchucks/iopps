import type { Metadata } from "next";
import ActionContent from "./ActionContent";

export const metadata: Metadata = {
  title: "Account action | IOPPS",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function VerificationActionPage() {
  return <ActionContent />;
}
