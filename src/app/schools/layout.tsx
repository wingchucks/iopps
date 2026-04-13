import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schools & Education",
  description:
    "Explore schools, colleges, universities, and Indigenous institutes showcasing programs, student supports, scholarships, and career pathways for Indigenous learners in Canada.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
