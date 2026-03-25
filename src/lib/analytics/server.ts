import { track } from "@vercel/analytics/server";
import type { SignupCompletedMethod } from "./events";

export async function trackOrganizationSignupCompleted(
  method: SignupCompletedMethod,
  headers?: Headers,
) {
  try {
    await track(
      "signup_completed",
      {
        accountType: "organization",
        method,
      },
      headers ? { request: { headers } } : undefined,
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[analytics] Failed to track organization signup:", error);
    }
  }
}
