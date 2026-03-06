import { getTrainingProgramsServer } from "@/lib/firestore-server";
import TrainingClient from "./TrainingClient";
import type { TrainingProgram } from "@/lib/firestore/training";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Training Hub - Indigenous-Led Programs | IOPPS",
  description:
    "Build skills with Indigenous-led training programs in technology, business, trades, health, and culture.",
};

export const revalidate = 120;

export default async function TrainingPage() {
  const programs = (await getTrainingProgramsServer()) as unknown as TrainingProgram[];
  return <TrainingClient initialPrograms={programs} />;
}
