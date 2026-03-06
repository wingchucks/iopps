import { getTrainingBySlugServer } from "@/lib/firestore-server";
import TrainingDetailClient from "./TrainingDetailClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { TrainingProgram } from "@/lib/firestore/training";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const program = await getTrainingBySlugServer(slug);
  if (!program) return { title: "Training Program Not Found | IOPPS" };
  const title = program.title as string;
  const desc =
    (program.description as string | undefined)?.slice(0, 160) ||
    `${title} - Enroll in this Indigenous-led training program on IOPPS.`;
  return {
    title: `${title} | IOPPS Training`,
    description: desc,
  };
}

export default async function TrainingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const program = await getTrainingBySlugServer(slug);
  if (!program) notFound();
  return <TrainingDetailClient program={program as unknown as TrainingProgram} />;
}
