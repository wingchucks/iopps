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
  updateEmployerCarouselFeature,
  isProfileComplete,
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
  isJobExpired,
} from "./jobs";

// Job Templates
export {
  createJobTemplate,
  getJobTemplate,
  listEmployerTemplates,
  updateJobTemplate,
  deleteJobTemplate,
  incrementTemplateUsage,
  templateToJobData,
} from "./jobTemplates";

// Applications
export {
  checkExistingApplication,
  createJobApplication,
  listMemberApplications,
  listJobApplications,
  listEmployerApplications,
  updateApplicationStatus,
  withdrawJobApplication,
  addApplicantNote,
  updateApplicantNote,
  deleteApplicantNote,
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
  isConferenceExpired,
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
  // Education Pillar extensions
  listSchoolScholarships,
  listUpcomingDeadlineScholarships,
  listScholarshipsForProgram,
  createExtendedScholarship,
  isScholarshipExpired,
} from "./scholarships";
export type { ExtendedScholarshipInput } from "./scholarships";

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
  isPowwowExpired,
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
  isTrainingProgramExpired,
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

// ============================================
// EDUCATION PILLAR
// ============================================

// Schools
export {
  createSchool,
  getSchool,
  getSchoolBySlug,
  getSchoolByEmployerId,
  getSchoolByOrganizationId,
  updateSchool,
  deleteSchool,
  listSchools,
  listFeaturedSchools,
  createStudentInquiry,
  createSchoolInquiry,
  listSchoolInquiries,
  updateInquiryStatus,
  getUnreadInquiryCount,
  saveSchool,
  unsaveSchool,
  isSchoolSaved,
  listSavedSchools,
  listSavedSchoolIds,
  incrementSchoolViews,
  setSchoolPublished,
} from "./schools";
export type { ListSchoolsOptions } from "./schools";

// Education Programs
export {
  createEducationProgram,
  getEducationProgram,
  getEducationProgramBySlug,
  updateEducationProgram,
  deleteEducationProgram,
  listEducationPrograms,
  listSchoolPrograms,
  listSchoolProgramsForDashboard,
  listFeaturedPrograms,
  listIndigenousFocusedPrograms,
  bulkCreatePrograms,
  saveProgram,
  unsaveProgram,
  isProgramSaved,
  listSavedPrograms,
  listSavedProgramIds,
  incrementProgramViews,
  getProgramCountsByCategory,
} from "./programs";
export type { ListEducationProgramsOptions } from "./programs";

// Education Programs (additional functions from educationPrograms.ts)
export {
  getSchoolProgramCount,
  incrementEducationProgramInquiries,
} from "./educationPrograms";

// Education Events
export {
  createEducationEvent,
  getEducationEvent,
  updateEducationEvent,
  deleteEducationEvent,
  listEducationEvents,
  listSchoolEvents,
  listSchoolEventsForDashboard,
  listUpcomingEvents,
  listThisWeekEvents,
  listEventsByMonth,
  rsvpToEvent,
  cancelRsvp,
  isRsvpd,
  getEventRsvpCount,
  listMemberRsvps,
  getEventStats,
} from "./educationEvents";
export type { ListEducationEventsOptions } from "./educationEvents";

// ============================================
// BUSINESS PILLAR
// ============================================

// Business Grants / Funding
export {
  listBusinessGrants,
  getFeaturedGrants,
  getBusinessGrant,
  getBusinessGrantBySlug,
  incrementGrantViews,
  createBusinessGrant,
  updateBusinessGrant,
  deleteBusinessGrant,
  updateGrantStatus,
  setGrantFeatured,
  listOrganizationGrants,
  getGrantsPendingReview,
} from "./grants";
export type { ListBusinessGrantsOptions, CreateGrantInput } from "./grants";

// ============================================
// SOCIAL HUB
// ============================================
export {
  createPost,
  getFeedPosts,
  getUserPosts,
  toggleLikePost,
  addComment,
  getComments,
  sendConnectionRequest,
  respondToConnectionRequest,
  getMyConnections,
  getPendingConnectionRequests,
  getConnectionStatus,
  getSuggestedConnections,
  shareEntity,
} from "./social";
