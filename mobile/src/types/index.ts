export interface JobPosting {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  location: string;
  employmentType: string;
  remoteFlag?: boolean;
  indigenousPreference?: boolean;
  quickApplyEnabled?: boolean;
  salaryRange?: string;
  closingDate?: string;
  description: string;
  responsibilities?: string[];
  qualifications?: string[];
  applicationLink?: string;
  applicationEmail?: string;
  active: boolean;
  featured?: boolean;
  createdAt: any;
  updatedAt?: any;
  expiresAt?: any;
  viewsCount?: number;
  applicationsCount?: number;
  paymentStatus?: "paid" | "pending" | "failed";
  paymentId?: string;
  companyLogoUrl?: string;
}

export interface EmployerProfile {
  id: string;
  organizationName: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  location?: string;
  indigenousOwned: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: "user" | "employer" | "admin" | "moderator";
  createdAt: any;
}

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  employerId: string;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  resumeUrl?: string;
  coverLetter?: string;
  createdAt: any;
}
