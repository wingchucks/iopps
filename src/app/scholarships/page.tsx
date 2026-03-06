import { getScholarshipsServer } from "@/lib/firestore-server";
import ScholarshipsClient from "./ScholarshipsClient";
import type { Scholarship } from "@/lib/firestore/scholarships";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scholarships - Financial Support for Indigenous Students | IOPPS",
  description:
    "Browse scholarships, bursaries, and grants for Indigenous students and learners across Canada.",
};

export const revalidate = 120;

export default async function ScholarshipsPage() {
  const scholarships = (await getScholarshipsServer()) as unknown as Scholarship[];
  return <ScholarshipsClient initialScholarships={scholarships} />;
}
