import type { Timestamp } from "firebase/firestore";

export type UserRole = "community" | "employer" | "moderator" | "admin";
export type EmployerStatus = "pending" | "approved" | "rejected";

export interface Interview {
  id: string;
  videoUrl: string;
  videoProvider: "youtube" | "vimeo" | "custom";
  videoId?: string;
  title?: string;
  description?: string;
  highlights?: string[];
  transcript?: string;
  interviewDate?: Timestamp | null;
  duration?: string;
  viewsCount?: number;
  order?: number;
  active?: boolean;
  createdAt?: Timestamp | null;
}

export interface EmployerProfile {
  id: string;
  userId: string;
  organizationName: string;
  description?: string;
  website?: string;
  location?: string;
  logoUrl?: string;
  interviews?: Interview[];
  status?: EmployerStatus;
  approvedAt?: Timestamp | null;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface JobPosting {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  location: string;
  employmentType: string;
  remoteFlag?: boolean;
  indigenousPreference?: boolean;
  description: string;
  responsibilities?: string[];
  qualifications?: string[];
  requirements?: string;
  benefits?: string;
  salaryRange?: string;
  applicationLink?: string;
  applicationEmail?: string;
  createdAt?: Timestamp | null;
  closingDate?: Timestamp | string | null;
  active: boolean;
  viewsCount?: number;
  applicationsCount?: number;
}

export interface Conference {
  id: string;
  employerId: string;
  employerName?: string;
  organizerName?: string;
  title: string;
  description: string;
  location: string;
  startDate: Timestamp | string | null;
  endDate: Timestamp | string | null;
  registrationLink?: string;
  registrationUrl?: string;
  cost?: string;
  format?: string;
  active: boolean;
  createdAt?: Timestamp | null;
}

export type ApplicationStatus =
  | "submitted"
  | "reviewed"
  | "shortlisted"
  | "rejected"
  | "hired"
  | "withdrawn";

export interface JobApplication {
  id: string;
  jobId: string;
  employerId: string;
  memberId: string;
  memberEmail?: string;
  memberDisplayName?: string;
  status: ApplicationStatus;
  resumeUrl?: string;
  coverLetter?: string;
  note?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  tags?: string[];
}

export interface MemberProfile {
  id: string;
  userId: string;
  displayName?: string;
  location?: string;
  skills?: string[];
  experience?: WorkExperience[];
  experienceSummary?: string; // Legacy field for backward compatibility
  education?: Education[];
  educationSummary?: string; // Legacy field for backward compatibility
  portfolio?: PortfolioItem[];
  resumeUrl?: string;
  coverLetterTemplate?: string;
  indigenousAffiliation?: string;
  availableForInterviews?: string;
  messagingHandle?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface SavedJob {
  id: string;
  jobId: string;
  memberId: string;
  createdAt?: Timestamp | null;
  job?: JobPosting | null;
}

export type JobAlertFrequency = "instant" | "daily" | "weekly";

export interface JobAlert {
  id: string;
  memberId: string;
  alertName?: string;
  keyword?: string;
  location?: string;
  employmentType?: string;
  remoteOnly?: boolean;
  indigenousOnly?: boolean;
  minSalary?: number;
  maxSalary?: number;
  frequency: JobAlertFrequency;
  active: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  lastSent?: Timestamp | null;
}

export interface Scholarship {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  provider: string;
  description: string;
  amount?: string;
  deadline?: Timestamp | string | null;
  level: string;
  region?: string;
  type: string;
  createdAt?: Timestamp | null;
  active: boolean;
}

export interface ScholarshipApplication {
  id: string;
  scholarshipId: string;
  employerId: string;
  memberId: string;
  memberEmail?: string;
  memberDisplayName?: string;
  status: ApplicationStatus;
  education?: string;
  essay?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ShopListing {
  id: string;
  employerId: string;
  vendorId?: string;
  owner?: string;
  name: string;
  description: string;
  category: string;
  location: string;
  shipsCanadaWide?: boolean;
  onlineStore?: boolean;
  tags?: string[];
  website?: string;
  createdAt?: Timestamp | null;
  active: boolean;
}

export interface VendorProfile {
  id: string;
  ownerUserId: string;
  businessName: string;
  tagline?: string;
  category?: string;
  location?: string;
  region?: string;
  websiteUrl?: string;
  shopUrl?: string;
  isIndigenousOwned: boolean;
  about?: string;
  originStory?: string;
  communityConnections?: string;
  offerings?: string;
  shipsCanadaWide?: boolean;
  isOnlineOnly?: boolean;
  hasInPersonLocation?: boolean;
  contactEmail?: string;
  contactPhone?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  otherLink?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  galleryImageUrls?: string[];
  active?: boolean;
  featured?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface PowwowEvent {
  id: string;
  employerId: string;
  name: string;
  host?: string;
  location: string;
  season?: string;
  startDate?: Timestamp | string | null;
  endDate?: Timestamp | string | null;
  dateRange?: string;
  description: string;
  registrationStatus?: string;
  livestream?: boolean;
  createdAt?: Timestamp | null;
  active: boolean;
}

export interface LiveStreamEvent {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  host: string;
  description: string;
  category: string;
  startTime: string;
  status: "Live Now" | "Upcoming" | "Replay" | string;
  platform: string;
  createdAt?: Timestamp | null;
  active: boolean;
}

export interface PowwowRegistration {
  id: string;
  powwowId: string;
  employerId: string;
  name: string;
  email: string;
  numberOfAttendees: number;
  specialRequests?: string;
  createdAt?: Timestamp | null;
}

export interface ProductServiceListing {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  category: string;
  price?: string;
  tags?: string[];
  imageUrl?: string;
  createdAt?: Timestamp | null;
  active: boolean;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  createdAt?: Timestamp | null;
  status?: "new" | "read" | "responded";
}
