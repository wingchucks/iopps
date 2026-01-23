// Recommendation Engine - Personalized opportunity matching
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  Timestamp,
  checkFirebase,
  memberCollection,
} from "./shared";
import { getMemberSettings } from "./memberSettings";
import { getMemberProfile } from "./members";
import { getMyConnections } from "./social";
import type { UserIntent } from "./memberSettings";
import type {
  MemberProfile,
  JobPosting,
  Scholarship,
  Conference,
  TrainingProgram,
  PowwowEvent,
  EducationProgram,
} from "../types";

// ============================================
// RECOMMENDATION TYPES
// ============================================

export interface RecommendationScore {
  total: number; // 0-100
  breakdown: {
    intentMatch: number; // Based on user intents
    skillMatch: number; // Skills alignment
    locationMatch: number; // Geographic relevance
    experienceMatch: number; // Experience level fit
    connectionMatch: number; // Connections at org
    freshness: number; // How recent the opportunity is
    engagement: number; // User's past engagement with similar items
  };
  reasons: string[]; // Human-readable match reasons
}

export interface RecommendedItem<T = unknown> {
  item: T;
  type: "job" | "scholarship" | "event" | "training" | "program" | "conference";
  score: RecommendationScore;
  matchReasons: string[];
}

export interface RecommendationFeed {
  jobs: RecommendedItem<JobPosting>[];
  scholarships: RecommendedItem<Scholarship>[];
  events: RecommendedItem<Conference | PowwowEvent>[];
  training: RecommendedItem<TrainingProgram>[];
  programs: RecommendedItem<EducationProgram>[];
  topPicks: RecommendedItem[]; // Mixed, highest scoring across categories
}

export interface NetworkingRecommendation {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  tagline?: string;
  indigenousAffiliation?: string;
  matchScore: number;
  matchReasons: string[];
  mutualConnections: number;
  sharedSkills: string[];
  sharedInterests: string[];
}

// ============================================
// SCORING WEIGHTS
// ============================================

const WEIGHTS = {
  intentMatch: 25,
  skillMatch: 20,
  locationMatch: 15,
  experienceMatch: 10,
  connectionMatch: 15,
  freshness: 10,
  engagement: 5,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate text similarity (simple keyword matching)
 */
function calculateTextSimilarity(text1: string | undefined, text2: string | undefined): number {
  if (!text1 || !text2) return 0;

  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  if (words1.length === 0 || words2.length === 0) return 0;

  const matches = words1.filter(w => words2.includes(w)).length;
  return Math.min(matches / Math.max(words1.length, words2.length), 1);
}

/**
 * Calculate skill overlap
 */
function calculateSkillMatch(userSkills: string[], requiredSkills: string[]): number {
  if (!userSkills?.length || !requiredSkills?.length) return 0;

  const normalizedUser = userSkills.map(s => s.toLowerCase().trim());
  const normalizedRequired = requiredSkills.map(s => s.toLowerCase().trim());

  const matches = normalizedUser.filter(skill =>
    normalizedRequired.some(req =>
      req.includes(skill) || skill.includes(req)
    )
  ).length;

  return Math.min(matches / normalizedRequired.length, 1);
}

/**
 * Calculate location relevance
 */
function calculateLocationMatch(
  userLocation: string | undefined,
  itemLocation: string | undefined,
  isRemote?: boolean
): number {
  if (isRemote) return 1; // Remote jobs match everyone
  if (!userLocation || !itemLocation) return 0.5; // Neutral if unknown

  const userLoc = userLocation.toLowerCase();
  const itemLoc = itemLocation.toLowerCase();

  // Exact match
  if (userLoc === itemLoc) return 1;

  // City/province match
  if (userLoc.includes(itemLoc) || itemLoc.includes(userLoc)) return 0.8;

  // Check for common Canadian provinces
  const provinces = ["ontario", "alberta", "bc", "british columbia", "quebec", "manitoba", "saskatchewan"];
  for (const prov of provinces) {
    if (userLoc.includes(prov) && itemLoc.includes(prov)) return 0.6;
  }

  return 0.2; // Different location
}

/**
 * Calculate freshness score based on creation date
 */
function calculateFreshnessScore(createdAt: Timestamp | Date | null | undefined): number {
  if (!createdAt) return 0.5;

  const created = createdAt instanceof Timestamp ? createdAt.toDate() : new Date(createdAt);
  const now = new Date();
  const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceCreation <= 1) return 1; // Posted today
  if (daysSinceCreation <= 7) return 0.9; // This week
  if (daysSinceCreation <= 14) return 0.7; // Last 2 weeks
  if (daysSinceCreation <= 30) return 0.5; // This month
  if (daysSinceCreation <= 60) return 0.3; // Last 2 months
  return 0.1; // Older
}

/**
 * Map user intents to opportunity types
 */
function getRelevantTypesForIntent(intent: UserIntent): string[] {
  switch (intent) {
    case "find-job":
      return ["job", "training"];
    case "explore-careers":
      return ["job", "training", "program"];
    case "attend-events":
      return ["event", "conference"];
    case "find-scholarships":
      return ["scholarship", "program"];
    case "connect-professionals":
      return ["event", "conference"];
    case "browse-community":
      return ["event", "job", "scholarship"];
    default:
      return ["job", "event", "scholarship"];
  }
}

// ============================================
// JOB RECOMMENDATIONS
// ============================================

/**
 * Score a job posting for a user
 */
function scoreJob(
  job: JobPosting,
  profile: MemberProfile,
  intents: UserIntent[],
  connectionEmployerIds: string[]
): RecommendationScore {
  const reasons: string[] = [];

  // Intent match
  const jobIntents = ["find-job", "explore-careers"] as UserIntent[];
  const intentMatch = intents.some(i => jobIntents.includes(i)) ? 1 : 0.3;
  if (intentMatch > 0.5) reasons.push("Matches your job search goal");

  // Skill match
  const jobSkills = [
    ...(job.qualifications || []),
    ...(job.requirements?.split(",").map(s => s.trim()) || []),
  ];
  const skillMatch = calculateSkillMatch(profile.skills || [], jobSkills);
  if (skillMatch > 0.5) reasons.push(`${Math.round(skillMatch * 100)}% skill match`);

  // Location match
  const locationMatch = calculateLocationMatch(profile.location, job.location, job.remoteFlag);
  if (job.remoteFlag) reasons.push("Remote position available");
  else if (locationMatch > 0.7) reasons.push("Near your location");

  // Experience match (based on description analysis)
  const experienceMatch = calculateTextSimilarity(
    profile.experienceSummary || profile.experience?.map(e => e.description).join(" "),
    job.description
  );
  if (experienceMatch > 0.3) reasons.push("Relevant to your experience");

  // Connection match
  const connectionMatch = connectionEmployerIds.includes(job.employerId) ? 1 : 0;
  if (connectionMatch > 0) reasons.push("You have connections at this employer");

  // Freshness
  const freshness = calculateFreshnessScore(job.createdAt);
  if (freshness > 0.8) reasons.push("Recently posted");

  // Indigenous preference bonus
  if (job.indigenousPreference) {
    reasons.push("Indigenous candidates encouraged");
  }

  // Calculate total
  const total = Math.round(
    intentMatch * WEIGHTS.intentMatch +
    skillMatch * WEIGHTS.skillMatch +
    locationMatch * WEIGHTS.locationMatch +
    experienceMatch * WEIGHTS.experienceMatch +
    connectionMatch * WEIGHTS.connectionMatch +
    freshness * WEIGHTS.freshness +
    (job.indigenousPreference ? 5 : 0) // Bonus for Indigenous preference
  );

  return {
    total: Math.min(total, 100),
    breakdown: {
      intentMatch: Math.round(intentMatch * 100),
      skillMatch: Math.round(skillMatch * 100),
      locationMatch: Math.round(locationMatch * 100),
      experienceMatch: Math.round(experienceMatch * 100),
      connectionMatch: Math.round(connectionMatch * 100),
      freshness: Math.round(freshness * 100),
      engagement: 0,
    },
    reasons,
  };
}

// ============================================
// SCHOLARSHIP RECOMMENDATIONS
// ============================================

/**
 * Score a scholarship for a user
 */
function scoreScholarship(
  scholarship: Scholarship,
  profile: MemberProfile,
  intents: UserIntent[]
): RecommendationScore {
  const reasons: string[] = [];

  // Intent match
  const scholarshipIntents = ["find-scholarships", "explore-careers"] as UserIntent[];
  const intentMatch = intents.some(i => scholarshipIntents.includes(i)) ? 1 : 0.2;
  if (intentMatch > 0.5) reasons.push("Matches your scholarship search");

  // Level match based on education
  let levelMatch = 0.5;
  if (profile.education?.length) {
    const userLevel = profile.education[0]?.degree?.toLowerCase() || "";
    const scholarshipLevel = scholarship.level?.toLowerCase() || "";
    if (scholarshipLevel.includes("undergraduate") && !userLevel.includes("master")) {
      levelMatch = 0.8;
    } else if (scholarshipLevel.includes("graduate") && userLevel.includes("bachelor")) {
      levelMatch = 0.9;
    }
  }
  if (levelMatch > 0.6) reasons.push("Matches your education level");

  // Location/region match
  const locationMatch = scholarship.region
    ? calculateLocationMatch(profile.location, scholarship.region)
    : 0.5;
  if (locationMatch > 0.6) reasons.push("Available in your region");

  // Indigenous affiliation bonus
  const affiliationMatch = profile.indigenousAffiliation ? 0.2 : 0;
  if (profile.indigenousAffiliation) {
    reasons.push("Open to Indigenous students");
  }

  // Freshness / deadline proximity
  const freshness = calculateFreshnessScore(scholarship.createdAt);

  const total = Math.round(
    intentMatch * WEIGHTS.intentMatch +
    levelMatch * WEIGHTS.skillMatch +
    locationMatch * WEIGHTS.locationMatch +
    affiliationMatch * 20 +
    freshness * WEIGHTS.freshness
  );

  return {
    total: Math.min(total, 100),
    breakdown: {
      intentMatch: Math.round(intentMatch * 100),
      skillMatch: Math.round(levelMatch * 100),
      locationMatch: Math.round(locationMatch * 100),
      experienceMatch: 0,
      connectionMatch: 0,
      freshness: Math.round(freshness * 100),
      engagement: 0,
    },
    reasons,
  };
}

// ============================================
// EVENT RECOMMENDATIONS
// ============================================

/**
 * Score an event for a user
 */
function scoreEvent(
  event: Conference | PowwowEvent,
  profile: MemberProfile,
  intents: UserIntent[]
): RecommendationScore {
  const reasons: string[] = [];

  // Intent match
  const eventIntents = ["attend-events", "connect-professionals", "browse-community"] as UserIntent[];
  const intentMatch = intents.some(i => eventIntents.includes(i)) ? 1 : 0.3;
  if (intentMatch > 0.5) reasons.push("Matches your interest in events");

  // Location match
  const locationMatch = calculateLocationMatch(profile.location, event.location);
  if (locationMatch > 0.6) reasons.push("Near your location");

  // Topic/description match
  const descMatch = calculateTextSimilarity(
    profile.skills?.join(" ") + " " + (profile.bio || ""),
    event.description
  );
  if (descMatch > 0.3) reasons.push("Relevant to your interests");

  // Date proximity (upcoming events score higher)
  let dateScore = 0.5;
  const startDate = "startDate" in event ? event.startDate : null;
  if (startDate) {
    const eventDate = startDate instanceof Timestamp ? startDate.toDate() : new Date(startDate as string);
    const daysUntil = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil > 0 && daysUntil <= 7) {
      dateScore = 1;
      reasons.push("Coming up this week");
    } else if (daysUntil > 0 && daysUntil <= 30) {
      dateScore = 0.8;
      reasons.push("Coming up this month");
    } else if (daysUntil > 0 && daysUntil <= 90) {
      dateScore = 0.6;
    }
  }

  const total = Math.round(
    intentMatch * WEIGHTS.intentMatch +
    locationMatch * WEIGHTS.locationMatch +
    descMatch * WEIGHTS.skillMatch +
    dateScore * WEIGHTS.freshness
  );

  return {
    total: Math.min(total, 100),
    breakdown: {
      intentMatch: Math.round(intentMatch * 100),
      skillMatch: Math.round(descMatch * 100),
      locationMatch: Math.round(locationMatch * 100),
      experienceMatch: 0,
      connectionMatch: 0,
      freshness: Math.round(dateScore * 100),
      engagement: 0,
    },
    reasons,
  };
}

// ============================================
// TRAINING RECOMMENDATIONS
// ============================================

/**
 * Score a training program for a user
 */
function scoreTraining(
  training: TrainingProgram,
  profile: MemberProfile,
  intents: UserIntent[]
): RecommendationScore {
  const reasons: string[] = [];

  // Intent match
  const trainingIntents = ["find-job", "explore-careers"] as UserIntent[];
  const intentMatch = intents.some(i => trainingIntents.includes(i)) ? 1 : 0.4;
  if (intentMatch > 0.5) reasons.push("Helps with your career goals");

  // Skill relevance
  const skillMatch = calculateSkillMatch(profile.skills || [], training.skills || []);
  if (skillMatch > 0.3) reasons.push("Builds on your existing skills");
  else if (skillMatch === 0 && training.skills?.length) {
    reasons.push("Learn new in-demand skills");
  }

  // Location match
  const locationMatch = training.format === "online"
    ? 1
    : calculateLocationMatch(profile.location, training.location);
  if (training.format === "online") reasons.push("Available online");
  else if (locationMatch > 0.6) reasons.push("Near your location");

  // Indigenous focus bonus
  if (training.indigenousFocused) {
    reasons.push("Indigenous-focused program");
  }

  // Cost consideration
  if (training.cost?.toLowerCase().includes("free") || training.fundingAvailable) {
    reasons.push("Funding available");
  }

  const freshness = calculateFreshnessScore(training.createdAt);

  const total = Math.round(
    intentMatch * WEIGHTS.intentMatch +
    skillMatch * WEIGHTS.skillMatch +
    locationMatch * WEIGHTS.locationMatch +
    freshness * WEIGHTS.freshness +
    (training.indigenousFocused ? 10 : 0) +
    (training.fundingAvailable ? 5 : 0)
  );

  return {
    total: Math.min(total, 100),
    breakdown: {
      intentMatch: Math.round(intentMatch * 100),
      skillMatch: Math.round(skillMatch * 100),
      locationMatch: Math.round(locationMatch * 100),
      experienceMatch: 0,
      connectionMatch: 0,
      freshness: Math.round(freshness * 100),
      engagement: 0,
    },
    reasons,
  };
}

// ============================================
// MAIN RECOMMENDATION FUNCTIONS
// ============================================

/**
 * Get personalized job recommendations for a user
 */
export async function getJobRecommendations(
  userId: string,
  maxResults: number = 10
): Promise<RecommendedItem<JobPosting>[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const [profile, settings, connections] = await Promise.all([
      getMemberProfile(userId),
      getMemberSettings(userId),
      getMyConnections(userId).catch(() => []),
    ]);

    if (!profile) return [];

    const intents = settings.onboarding.intents;

    // Get employer IDs from connections
    const connectionEmployerIds: string[] = [];
    // Note: Would need to enhance this to get actual employer IDs from connection profiles

    // Query active jobs
    const jobsQuery = query(
      collection(firestore, "jobs"),
      where("active", "==", true),
      orderBy("createdAt", "desc"),
      limit(50) // Get more to score and filter
    );

    const snap = await getDocs(jobsQuery);
    const jobs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobPosting));

    // Score each job
    const scoredJobs = jobs.map(job => ({
      item: job,
      type: "job" as const,
      score: scoreJob(job, profile, intents, connectionEmployerIds),
      matchReasons: [] as string[],
    }));

    // Set matchReasons from score
    scoredJobs.forEach(sj => {
      sj.matchReasons = sj.score.reasons;
    });

    // Sort by score and return top results
    return scoredJobs
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, maxResults);
  } catch (error) {
    console.error("Error getting job recommendations:", error);
    return [];
  }
}

/**
 * Get personalized scholarship recommendations for a user
 */
export async function getScholarshipRecommendations(
  userId: string,
  maxResults: number = 10
): Promise<RecommendedItem<Scholarship>[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const [profile, settings] = await Promise.all([
      getMemberProfile(userId),
      getMemberSettings(userId),
    ]);

    if (!profile) return [];

    const intents = settings.onboarding.intents;

    // Query active scholarships
    const scholarshipsQuery = query(
      collection(firestore, "scholarships"),
      where("active", "==", true),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const snap = await getDocs(scholarshipsQuery);
    const scholarships = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scholarship));

    // Score each scholarship
    const scored = scholarships.map(scholarship => ({
      item: scholarship,
      type: "scholarship" as const,
      score: scoreScholarship(scholarship, profile, intents),
      matchReasons: [] as string[],
    }));

    scored.forEach(s => {
      s.matchReasons = s.score.reasons;
    });

    return scored
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, maxResults);
  } catch (error) {
    console.error("Error getting scholarship recommendations:", error);
    return [];
  }
}

/**
 * Get personalized event recommendations for a user
 */
export async function getEventRecommendations(
  userId: string,
  maxResults: number = 10
): Promise<RecommendedItem<Conference | PowwowEvent>[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const [profile, settings] = await Promise.all([
      getMemberProfile(userId),
      getMemberSettings(userId),
    ]);

    if (!profile) return [];

    const intents = settings.onboarding.intents;
    const now = new Date();

    // Query upcoming conferences
    const conferencesQuery = query(
      collection(firestore, "conferences"),
      where("active", "==", true),
      limit(20)
    );

    // Query upcoming powwows
    const powwowsQuery = query(
      collection(firestore, "powwows"),
      where("active", "==", true),
      limit(20)
    );

    const [confSnap, powwowSnap] = await Promise.all([
      getDocs(conferencesQuery),
      getDocs(powwowsQuery),
    ]);

    const conferences = confSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conference));
    const powwows = powwowSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PowwowEvent));

    // Filter to upcoming events only
    const upcomingConferences = conferences.filter(c => {
      if (!c.startDate) return true;
      const date = c.startDate instanceof Timestamp ? c.startDate.toDate() : new Date(c.startDate as string);
      return date >= now;
    });

    const upcomingPowwows = powwows.filter(p => {
      if (!p.startDate) return true;
      const date = p.startDate instanceof Timestamp ? p.startDate.toDate() : new Date(p.startDate as string);
      return date >= now;
    });

    // Score all events
    const allEvents = [
      ...upcomingConferences.map(event => ({
        item: event,
        type: "conference" as const,
        score: scoreEvent(event, profile, intents),
        matchReasons: [] as string[],
      })),
      ...upcomingPowwows.map(event => ({
        item: event,
        type: "event" as const,
        score: scoreEvent(event, profile, intents),
        matchReasons: [] as string[],
      })),
    ];

    allEvents.forEach(e => {
      e.matchReasons = e.score.reasons;
    });

    return allEvents
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, maxResults);
  } catch (error) {
    console.error("Error getting event recommendations:", error);
    return [];
  }
}

/**
 * Get personalized training recommendations for a user
 */
export async function getTrainingRecommendations(
  userId: string,
  maxResults: number = 10
): Promise<RecommendedItem<TrainingProgram>[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const [profile, settings] = await Promise.all([
      getMemberProfile(userId),
      getMemberSettings(userId),
    ]);

    if (!profile) return [];

    const intents = settings.onboarding.intents;

    // Query active training programs
    const trainingQuery = query(
      collection(firestore, "training"),
      where("active", "==", true),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const snap = await getDocs(trainingQuery);
    const programs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingProgram));

    // Score each program
    const scored = programs.map(training => ({
      item: training,
      type: "training" as const,
      score: scoreTraining(training, profile, intents),
      matchReasons: [] as string[],
    }));

    scored.forEach(s => {
      s.matchReasons = s.score.reasons;
    });

    return scored
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, maxResults);
  } catch (error) {
    console.error("Error getting training recommendations:", error);
    return [];
  }
}

/**
 * Get a personalized recommendation feed for a user
 * Returns top recommendations across all categories based on user intents
 */
export async function getRecommendationFeed(
  userId: string,
  maxPerCategory: number = 5
): Promise<RecommendationFeed> {
  try {
    const settings = await getMemberSettings(userId);
    const intents = settings.onboarding.intents;

    // Determine which categories to prioritize based on intents
    const priorityTypes = new Set<string>();
    intents.forEach(intent => {
      getRelevantTypesForIntent(intent).forEach(t => priorityTypes.add(t));
    });

    // Fetch recommendations in parallel
    const [jobs, scholarships, events, training] = await Promise.all([
      getJobRecommendations(userId, maxPerCategory),
      getScholarshipRecommendations(userId, maxPerCategory),
      getEventRecommendations(userId, maxPerCategory),
      getTrainingRecommendations(userId, maxPerCategory),
    ]);

    // Create top picks from highest scoring across categories
    const allItems: RecommendedItem[] = [
      ...jobs,
      ...scholarships,
      ...events,
      ...training,
    ];

    // Sort by score and get top 10
    const topPicks = allItems
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 10);

    return {
      jobs,
      scholarships,
      events,
      training,
      programs: [], // Would need separate education program recommendations
      topPicks,
    };
  } catch (error) {
    console.error("Error getting recommendation feed:", error);
    return {
      jobs: [],
      scholarships: [],
      events: [],
      training: [],
      programs: [],
      topPicks: [],
    };
  }
}

/**
 * Get networking recommendations - people the user might want to connect with
 */
export async function getNetworkingRecommendations(
  userId: string,
  maxResults: number = 10
): Promise<NetworkingRecommendation[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const [profile, settings, existingConnections] = await Promise.all([
      getMemberProfile(userId),
      getMemberSettings(userId),
      getMyConnections(userId).catch(() => []),
    ]);

    if (!profile) return [];

    // Get existing connection IDs to exclude
    const connectedIds = new Set(existingConnections.map(c =>
      c.requesterId === userId ? c.recipientId : c.requesterId
    ));
    connectedIds.add(userId); // Exclude self

    // Query members with similar profiles
    const membersQuery = query(
      collection(firestore, memberCollection),
      limit(100)
    );

    const snap = await getDocs(membersQuery);
    const members = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as MemberProfile))
      .filter(m => !connectedIds.has(m.userId) && m.displayName);

    // Score each member
    const scored: NetworkingRecommendation[] = members.map(member => {
      const matchReasons: string[] = [];
      let score = 0;

      // Shared skills
      const sharedSkills = (profile.skills || []).filter(skill =>
        (member.skills || []).some(ms =>
          ms.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(ms.toLowerCase())
        )
      );
      if (sharedSkills.length > 0) {
        score += sharedSkills.length * 10;
        matchReasons.push(`${sharedSkills.length} shared skills`);
      }

      // Same location
      if (profile.location && member.location) {
        const locMatch = calculateLocationMatch(profile.location, member.location);
        if (locMatch > 0.7) {
          score += 15;
          matchReasons.push("In your area");
        }
      }

      // Same indigenous affiliation
      if (profile.indigenousAffiliation && member.indigenousAffiliation) {
        if (profile.indigenousAffiliation.toLowerCase() === member.indigenousAffiliation.toLowerCase()) {
          score += 20;
          matchReasons.push(`Also from ${member.indigenousAffiliation}`);
        }
      }

      // Similar experience
      if (profile.experience?.length && member.experience?.length) {
        const userCompanies = profile.experience.map(e => e.company.toLowerCase());
        const memberCompanies = member.experience.map(e => e.company.toLowerCase());
        const sharedCompanies = userCompanies.filter(c => memberCompanies.includes(c));
        if (sharedCompanies.length > 0) {
          score += 15;
          matchReasons.push("Worked at same company");
        }
      }

      // Similar education
      if (profile.education?.length && member.education?.length) {
        const userSchools = profile.education.map(e => e.institution.toLowerCase());
        const memberSchools = member.education.map(e => e.institution.toLowerCase());
        const sharedSchools = userSchools.filter(s => memberSchools.includes(s));
        if (sharedSchools.length > 0) {
          score += 15;
          matchReasons.push("Attended same school");
        }
      }

      // Has a complete profile (more valuable connection)
      if (member.bio && member.skills?.length && member.experience?.length) {
        score += 5;
      }

      return {
        userId: member.userId,
        displayName: member.displayName || "Member",
        avatarUrl: member.avatarUrl || member.photoURL,
        tagline: member.tagline,
        indigenousAffiliation: member.indigenousAffiliation,
        matchScore: Math.min(score, 100),
        matchReasons,
        mutualConnections: 0, // Would need to calculate
        sharedSkills,
        sharedInterests: [], // Would need to implement interests tracking
      };
    });

    // Sort by score and return top results
    return scored
      .filter(s => s.matchScore > 0) // Only return if there's some match
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxResults);
  } catch (error) {
    console.error("Error getting networking recommendations:", error);
    return [];
  }
}

/**
 * Get quick recommendation summary for dashboard widgets
 */
export async function getQuickRecommendations(userId: string): Promise<{
  topJob: RecommendedItem<JobPosting> | null;
  topScholarship: RecommendedItem<Scholarship> | null;
  topEvent: RecommendedItem<Conference | PowwowEvent> | null;
  topConnection: NetworkingRecommendation | null;
}> {
  try {
    const [jobs, scholarships, events, connections] = await Promise.all([
      getJobRecommendations(userId, 1),
      getScholarshipRecommendations(userId, 1),
      getEventRecommendations(userId, 1),
      getNetworkingRecommendations(userId, 1),
    ]);

    return {
      topJob: jobs[0] || null,
      topScholarship: scholarships[0] || null,
      topEvent: events[0] || null,
      topConnection: connections[0] || null,
    };
  } catch (error) {
    console.error("Error getting quick recommendations:", error);
    return {
      topJob: null,
      topScholarship: null,
      topEvent: null,
      topConnection: null,
    };
  }
}
