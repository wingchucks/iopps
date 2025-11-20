import { NextRequest, NextResponse } from "next/server";
import { generateJobDescription, JobDescriptionInput } from "@/lib/googleAi";

export async function POST(req: NextRequest) {
  try {
    const body: JobDescriptionInput = await req.json();

    if (!body.title) {
      return NextResponse.json(
        { error: "Job title is required" },
        { status: 400 }
      );
    }

    const result = await generateJobDescription(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating job description:", error);
    return NextResponse.json(
      { error: "Failed to generate job description" },
      { status: 500 }
    );
  }
}
