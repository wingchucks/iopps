export type PartnerInterestSurface =
  | "homepage"
  | "partner_strip"
  | "partners_page";

export type ContactIntentCategory =
  | "general"
  | "partnership"
  | "support"
  | "listing";

export type ApplyIntentContentType =
  | "job"
  | "program"
  | "scholarship"
  | "school";

export type SignupCompletedAccountType = "community" | "organization";
export type SignupCompletedMethod = "email" | "google";

export interface AnalyticsEventProperties {
  partner_interest: {
    surface: PartnerInterestSurface;
  };
  contact_intent: {
    category: ContactIntentCategory;
  };
  apply_intent: {
    contentType: ApplyIntentContentType;
  };
  signup_completed: {
    accountType: SignupCompletedAccountType;
    method: SignupCompletedMethod;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventProperties;

export type AnalyticsEventPayload<Name extends AnalyticsEventName> =
  AnalyticsEventProperties[Name];
