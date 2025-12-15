// Re-export all Firestore operations from domain files
// This provides a single entry point for all Firestore functions

// Employers
export {
  getEmployerProfile,
  updateEmployerLogo,
  upsertEmployerProfile,
  listEmployers,
  updateEmployerStatus,
  grantEmployerFreePosting,
  revokeEmployerFreePosting,
  getGrantConfig,
  isGrantValid,
  getGrantRemainingCredits,
  addEmployerInterview,
  updateEmployerInterview,
  deleteEmployerInterview,
  trackInterviewView,
  setEmployerCompanyIntro,
  removeEmployerCompanyIntro,
} from "./employers";
export type { GrantFreePostingParams } from "./employers";

// Jobs
export {
  createJobPosting,
  listJobPostings,
  getJobPosting,
  listEmployerJobs,
  updateJobStatus,
  updateJobPosting,
  incrementJobViews,
  deleteJobPosting,
  setJobVideo,
  removeJobVideo,
  toggleSavedJob,
  listSavedJobs,
  listSavedJobIds,
} from "./jobs";

// Applications
export {
  checkExistingApplication,
  createJobApplication,
  listMemberApplications,
  listJobApplications,
  listEmployerApplications,
  updateApplicationStatus,
  withdrawJobApplication,
} from "./applications";

// Members
export {
  getMemberProfile,
  upsertMemberProfile,
  searchMembers,
} from "./members";

// Conferences
export {
  createConference,
  listConferences,
  listEmployerConferences,
  getConference,
  updateConference,
  deleteConference,
  toggleSavedConference,
  listSavedConferences,
  listSavedConferenceIds,
  createConferenceRegistration,
} from "./conferences";
export type { SavedConference } from "./conferences";

// Scholarships
export {
  createScholarship,
  listScholarships,
  updateScholarship,
  listEmployerScholarships,
  deleteScholarship,
  getScholarship,
  createScholarshipApplication,
  listMemberScholarshipApplications,
  listScholarshipApplicantsForEmployer,
  updateScholarshipApplicationStatus,
  withdrawScholarshipApplication,
} from "./scholarships";

// Powwows
export {
  createPowwowEvent,
  listPowwowEvents,
  updatePowwowEvent,
  listEmployerPowwows,
  deletePowwow,
  getPowwowEvent,
  createPowwowRegistration,
  listMemberPowwowRegistrations,
  listPowwowRegistrants,
} from "./powwows";

// Vendors
export {
  checkForDuplicateVendor,
  getVendorProfile,
  getVendorProfileById,
  upsertVendorProfile,
  deleteVendorProfile,
  updateVendorShopStatus,
  updateVendorApprovalStatus,
  grantVendorFreeListing,
  revokeVendorFreeListing,
  getVendorsPendingReview,
  listApprovedVendors,
  createShopListing,
  listShopListings,
  updateShopListing,
  createShopListingForVendor,
  updateShopListingForVendor,
  deleteShopListingForVendor,
  listVendorShopListings,
} from "./vendors";
export type { UpsertVendorResult } from "./vendors";

// Livestreams
export {
  createLiveStream,
  listLiveStreams,
  updateLiveStream,
} from "./livestreams";

// Messaging
export {
  getOrCreateConversation,
  getEmployerConversations,
  getMemberConversations,
  getConversation,
  sendMessage,
  getConversationMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
  archiveConversation,
} from "./messaging";

// Notifications
export {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotification,
  deleteAllUserNotifications,
} from "./notifications";

// Misc (global search, contacts, settings, RSS, job alerts)
export {
  globalSearch,
  createContactSubmission,
  listContactSubmissions,
  updateContactSubmissionStatus,
  getPlatformSettings,
  updatePlatformSettings,
  createRSSFeed,
  listRSSFeeds,
  getRSSFeed,
  updateRSSFeed,
  deleteRSSFeed,
  createJobAlert,
  getMemberJobAlerts,
  deleteJobAlert,
  updateJobAlert,
} from "./misc";
export type { GlobalSearchResults, ContactSubmissionInput } from "./misc";

// Training Programs
export {
  listTrainingPrograms,
  getTrainingProgram,
  createTrainingProgram,
  updateTrainingProgram,
  updateTrainingProgramStatus,
  setTrainingProgramFeatured,
  deleteTrainingProgram,
  incrementTrainingProgramViews,
  trackEnrollmentClick,
  getMemberTrainingInterests,
  listOrganizationTrainingPrograms,
  getTrainingProgramsPendingReview,
  saveTrainingProgram,
  unsaveTrainingProgram,
  isTrainingSaved,
  listSavedTraining,
} from "./training";
export type { ListTrainingProgramsOptions } from "./training";

// Services (Indigenous Marketplace)
export {
  listServices,
  getFeaturedServices,
  getService,
  getServiceBySlug,
  createService,
  updateService,
  deleteService,
  updateServiceStatus,
  setServiceFeatured,
  incrementServiceViews,
  trackServiceContactClick,
  listUserServices,
  getServicesPendingReview,
} from "./services";
export type { ListServicesOptions, CreateServiceInput } from "./services";
