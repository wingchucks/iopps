/**
 * Barrel export for all Firestore data layer modules.
 *
 * Usage:
 *   import { getJobs, getMemberProfile, getOrganization } from "@/lib/firestore";
 *
 * Each module targets a specific Firestore collection and uses
 * the Firebase Admin SDK (server-side only).
 */

// Jobs ("jobs" collection)
export {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getJobsByEmployer,
  searchJobs,
  type JobPosting,
  type JobFilters,
  type PaginatedJobsResult,
} from "./jobs";

// Members ("memberProfiles" collection)
export {
  getMemberProfile,
  createMemberProfile,
  updateMemberProfile,
  getMemberByEmail,
  type MemberProfile,
} from "./members";

// Organizations / Employers ("employers" collection)
export {
  getOrganization,
  getOrganizationByUserId,
  createOrganization,
  updateOrganization,
  getOrganizations,
  approveOrganization,
  rejectOrganization,
  type OrganizationProfile,
  type OrganizationFilters,
  type EmployerStatus,
} from "./organizations";

// Applications ("applications" collection)
export {
  getApplicationsByJob,
  getApplicationsByMember,
  getApplicationById,
  createApplication,
  updateApplicationStatus,
  type JobApplication,
  type ApplicationStatus,
} from "./applications";

// Scholarships ("scholarships" collection)
export {
  getScholarships,
  getScholarshipById,
  createScholarship,
  updateScholarship,
  type Scholarship,
  type ScholarshipFilters,
} from "./scholarships";

// Conferences ("conferences" collection)
export {
  getConferences,
  getConferenceById,
  createConference,
  updateConference,
  type Conference,
  type ConferenceFilters,
} from "./conferences";

// Powwows ("powwows" collection)
export {
  getPowwows,
  getPowwowById,
  createPowwow,
  updatePowwow,
  type PowwowEvent,
  type PowwowFilters,
} from "./powwows";

// Vendors ("vendors" collection)
export {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  type Vendor,
  type VendorFilters,
} from "./vendors";

// Schools ("schools" collection)
export {
  getSchools,
  getSchoolById,
  getSchoolBySlug,
  type School,
  type SchoolFilters,
} from "./schools";

// Education Programs ("education_programs" collection)
export {
  getEducationPrograms,
  getEducationProgramById,
  type EducationProgram,
  type EducationProgramFilters,
} from "./educationPrograms";

// Saved Jobs ("savedJobs" collection)
export {
  getSavedJobs,
  saveJob,
  unsaveJob,
  isJobSaved,
  type SavedJob,
} from "./savedJobs";
