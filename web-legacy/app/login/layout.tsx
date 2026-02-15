import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Log in to your IOPPS account to access job opportunities, track applications, and connect with Indigenous employers and community across Canada.",
  openGraph: {
    title: "Sign In | IOPPS.ca",
    description:
      "Log in to your IOPPS account to access Indigenous job opportunities, scholarships, and community resources.",
    url: "/login",
  },
  alternates: {
    canonical: "/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
