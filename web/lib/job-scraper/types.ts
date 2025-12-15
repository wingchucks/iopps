/**
 * Shared types for job scraping and RSS feed processing
 */

export interface FieldMappings {
  jobIdOrUrl?: string;
  title?: string;
  description?: string;
  jobType?: string;
  category?: string;
  experience?: string;
  applyUrl?: string;
  expirationDate?: string;
  featured?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  remote?: string;
  salaryString?: string;
  salaryFrom?: string;
  salaryTo?: string;
  salaryPeriod?: string;
}

export interface RSSFeedConfig {
  id?: string;
  employerId: string;
  employerName?: string;
  feedUrl: string;
  feedName: string;
  active: boolean;
  totalJobsImported?: number;
  lastSyncAt?: Date | string;
  lastSyncStatus?: "success" | "error" | "partial";
  lastSyncMessage?: string;
  jobExpiration?: {
    type: "days" | "feed" | "never";
    daysAfterImport?: number;
  };
  utmTrackingTag?: string;
  noIndexByGoogle?: boolean;
  updateExistingJobs?: boolean;
  fieldMappings?: FieldMappings;
  feedType?: "xml" | "html";
  keywordFilter?: KeywordFilter;
}

export interface KeywordFilter {
  enabled: boolean;
  keywords: string[];
  matchIn: ("title" | "description")[];
}

export interface NormalizedJob {
  title: string;
  description: string;
  location: string;
  applyUrl: string;
  company?: string;
  remote?: boolean;
  expirationDate?: string;
  jobType?: string;
  salaryString?: string;
  category?: string;
}

export interface JobXML {
  title?: string[];
  description?: string[];
  applyurl?: string[];
  url?: string[];
  city?: string[];
  state?: string[];
  country?: string[];
  location?: string[];
  company?: string[];
  remote?: string[];
  jobtype?: string[];
  type?: string[];
  date?: string[];
  pubDate?: string[];
  expirationdate?: string[];
  salary?: string[];
  [key: string]: string[] | undefined;
}

export interface ScrapeResult {
  success: boolean;
  jobsFound: number;
  jobsImported: number;
  jobsSkipped: number;
  jobsUpdated: number;
  errors: string[];
}
