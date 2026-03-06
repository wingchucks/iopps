import { getProgramsServer } from "@/lib/firestore-server";
import ProgramsClient from "./ProgramsClient";
import type { Post } from "@/lib/firestore/posts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Programs - Community Initiatives | IOPPS",
  description:
    "Explore Indigenous community programs and initiatives across Saskatchewan.",
};

export const revalidate = 120;

export default async function ProgramsPage() {
  const programs = (await getProgramsServer()) as unknown as Post[];
  return <ProgramsClient initialPrograms={programs} />;
}
