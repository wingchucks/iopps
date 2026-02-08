import { NextRequest } from "next/server";
import { handleJobAlertCron } from "../shared";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  return handleJobAlertCron(request, "weekly");
}
