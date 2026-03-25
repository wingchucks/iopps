"use client";

import { track } from "@vercel/analytics";
import type {
  AnalyticsEventName,
  AnalyticsEventPayload,
  ApplyIntentContentType,
  ContactIntentCategory,
  PartnerInterestSurface,
  SignupCompletedAccountType,
  SignupCompletedMethod,
} from "./events";

function sendAnalyticsEvent<Name extends AnalyticsEventName>(
  name: Name,
  properties: AnalyticsEventPayload<Name>,
) {
  try {
    track(name, properties);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`[analytics] Failed to track ${name}:`, error);
    }
  }
}

export function trackPartnerInterest(surface: PartnerInterestSurface) {
  sendAnalyticsEvent("partner_interest", { surface });
}

export function trackContactIntent(category: ContactIntentCategory) {
  sendAnalyticsEvent("contact_intent", { category });
}

export function trackApplyIntent(contentType: ApplyIntentContentType) {
  sendAnalyticsEvent("apply_intent", { contentType });
}

export function trackSignupCompleted(
  accountType: SignupCompletedAccountType,
  method: SignupCompletedMethod,
) {
  sendAnalyticsEvent("signup_completed", { accountType, method });
}
