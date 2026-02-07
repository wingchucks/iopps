import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join IOPPS",
  description:
    "Sign up for IOPPS as a community member or organization. Access Indigenous jobs, scholarships, conferences, and business opportunities across Canada.",
  openGraph: {
    title: "Join IOPPS | Create Your Account",
    description:
      "Sign up for IOPPS to access Indigenous job opportunities, scholarships, and community resources across Canada.",
    url: "/signup",
  },
  alternates: {
    canonical: "/signup",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
