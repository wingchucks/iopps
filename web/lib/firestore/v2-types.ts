// V2 data model types for IOPPS platform migration
import type { Timestamp, FieldValue } from "firebase/firestore";

type TimestampField = Timestamp | FieldValue | Date | null;

// Organization types
export type OrgType = "company" | "school" | "vendor" | "nonprofit" | "government" | "other";
export type OrgStatus = "pending" | "active" | "rejected";

export interface V2Organization {
  id?: string;
  name: string;
  type: OrgType;
  status: OrgStatus;
  ownerUid: string;
  adminUids: string[];
  logoPath?: string;
  coverPath?: string;
  about?: string;
  website?: string;
  rejectReason?: string;
  createdAt: TimestampField;
  updatedAt: TimestampField;
}

export interface UserPrivate {
  defaultResumeId?: string;
  defaultResumeSource?: "upload" | "builder";
  updatedAt: TimestampField;
}

export interface V2Resume {
  id?: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  uploadedAt: TimestampField;
}

export interface V2Certificate {
  id?: string;
  title: string;
  storagePath: string;
  mimeType: string;
  uploadedAt: TimestampField;
}

export interface V2Application {
  id?: string;
  applicantId: string;
  organizationId: string;
  opportunityType: "job" | "program" | "scholarship" | "event";
  opportunityId: string;
  status: "submitted" | "reviewed" | "shortlisted" | "accepted" | "rejected" | "withdrawn";
  resumeAttachment?: { storagePath: string; fileName: string; mimeType: string };
  certificateAttachments?: { storagePath: string; title: string; mimeType: string }[];
  createdAt: TimestampField;
  updatedAt: TimestampField;
}

export interface AuditLogEntry {
  id?: string;
  adminUid: string;
  action: "approve_org" | "reject_org" | "request_edits";
  orgId: string;
  timestamp: TimestampField;
  metadata?: Record<string, string>;
}
