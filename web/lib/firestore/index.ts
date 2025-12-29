// Re-export all Firestore operations from domain files
// This provides a single entry point for all Firestore functions

// Employers
export {
  getEmployerProfile,
  updateEmployerLogo,
  updateEmployerBanner,
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
  isProfileComplete,
  getMissingProfileFields,
  updateEmployerCarouselFeature,
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
  // Extended scholarship functions (Education Pillar)
  listScholarshipsFiltered,
  listSchoolScholarships,
  getUpcomingScholarshipDeadlines,
  getScholarshipsForLevel,
  getFeaturedScholarships,
  createExtendedScholarship,
  incrementScholarshipViews,
  getScholarshipBySlug,
  saveScholarship,
  unsaveScholarship,
  getSavedScholarshipRecord,
  isScholarshipSaved,
  listSavedScholarships,
} from "./scholarships";
export type { ListScholarshipsOptions } from "./scholarships";

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

// Schools (Education Pillar)
export {
  listSchools,
  getSchool,
  getSchoolBySlug,
  getSchoolByOrganizationId,
  createSchool,
  updateSchool,
  updateSchoolStatus,
  setSchoolPublished,
  deleteSchool,
  incrementSchoolViews,
  verifySchool,
  saveSchool,
  unsaveSchool,
  getSavedSchool,
  isSchoolSaved,
  listSavedSchools,
  createSchoolInquiry,
  listSchoolInquiries,
  getUnreadInquiryCount,
  updateInquiryStatus,
  listMemberInquiries,
  getSchoolsPendingReview,
  getFeaturedSchools,
} from "./schools";
export type { ListSchoolsOptions, CreateSchoolInquiryInput } from "./schools";

// Education Programs
export {
  listEducationPrograms,
  getEducationProgram,
  getEducationProgramBySlug,
  listSchoolPrograms,
  createEducationProgram,
  bulkCreateEducationPrograms,
  updateEducationProgram,
  updateEducationProgramStatus,
  setEducationProgramPublished,
  setEducationProgramFeatured,
  deleteEducationProgram,
  incrementEducationProgramViews,
  incrementEducationProgramInquiries,
  getEducationProgramsPendingReview,
  getFeaturedEducationPrograms,
  getEducationProgramsByCategory,
  getEducationProgramsByLevel,
  saveEducationProgram,
  unsaveEducationProgram,
  getSavedProgram,
  isEducationProgramSaved,
  listSavedPrograms,
  getSchoolProgramCount,
} from "./educationPrograms";
export type { ListEducationProgramsOptions } from "./educationPrograms";

// Education Events
export {
  listEducationEvents,
  getEducationEvent,
  listSchoolEvents,
  getUpcomingEducationEvents,
  getEducationEventsInRange,
  createEducationEvent,
  updateEducationEvent,
  setEducationEventPublished,
  setEducationEventFeatured,
  deleteEducationEvent,
  incrementEducationEventViews,
  trackEducationEventRegistrationClick,
  rsvpToEducationEvent,
  updateEducationEventRSVP,
  cancelEducationEventRSVP,
  getEducationEventRSVP,
  listEducationEventRSVPs,
  listMemberEventRSVPs,
  getEducationEventRSVPCount,
  hasMemberRSVP,
} from "./educationEvents";
export type { ListEducationEventsOptions } from "./educationEvents";
