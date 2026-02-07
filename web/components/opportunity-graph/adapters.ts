/**
 * IOPPS Social Opportunity Graph — Data Adapters
 * 
 * Convert Firestore data types to OpportunityItem format.
 */

import type { JobPosting, Scholarship, Conference, PowwowEvent, TrainingProgram, LiveStreamEvent, Vendor, Post } from "@/lib/types";
import type { OpportunityItem, OpportunityAuthor, OpportunityMeta } from "./OpportunityCard";
import { formatDistanceToNow } from "date-fns";

// Helper to format timestamps to relative time
function formatRelativeTime(date: Date | { toDate: () => Date } | string | null | undefined): string {
  if (!date) return "Recently";
  
  try {
    const d = typeof date === "string" 
      ? new Date(date) 
      : "toDate" in date 
        ? date.toDate() 
        : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "Recently";
  }
}

// Helper to format salary
function formatSalary(salaryRange?: JobPosting["salaryRange"]): string | undefined {
  if (!salaryRange) return undefined;
  if (typeof salaryRange === "string") return salaryRange;
  
  const { min, max, currency = "CAD" } = salaryRange;
  if (min && max) {
    return `$${(min / 1000).toFixed(0)}K – $${(max / 1000).toFixed(0)}K`;
  }
  if (min) return `From $${(min / 1000).toFixed(0)}K`;
  if (max) return `Up to $${(max / 1000).toFixed(0)}K`;
  return undefined;
}

// Helper to format deadline
function formatDeadline(date: Date | { toDate: () => Date } | string | null | undefined): string | undefined {
  if (!date) return undefined;
  
  try {
    const d = typeof date === "string" 
      ? new Date(date) 
      : "toDate" in date 
        ? date.toDate() 
        : date;
    
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return undefined; // Past deadline
    if (diffDays === 0) return "Due Today";
    if (diffDays === 1) return "Due Tomorrow";
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    
    // Format as "Due Mar 15"
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `Due ${months[d.getMonth()]} ${d.getDate()}`;
  } catch {
    return undefined;
  }
}

// Helper to format location/mode
function formatLocationMode(location: string, remoteFlag?: boolean, locationType?: string): string {
  if (remoteFlag || locationType === "remote") return "Remote";
  if (locationType === "hybrid") return `Hybrid · ${location}`;
  return location;
}

/**
 * Convert a JobPosting to OpportunityItem
 */
export function jobToOpportunity(job: JobPosting): OpportunityItem {
  const author: OpportunityAuthor = {
    id: job.employerId,
    name: job.employerName || "Unknown Employer",
    verified: true, // Employers are verified by default
    avatarUrl: job.companyLogoUrl,
  };

  const meta: OpportunityMeta = {
    salary: formatSalary(job.salaryRange),
    mode: formatLocationMode(job.location, job.remoteFlag, job.locationType),
    type: job.employmentType,
    deadline: formatDeadline(job.closingDate),
    apps: job.applicationsCount,
  };

  // Build summary from description (truncate to ~200 chars)
  let summary = job.description || "";
  // Strip HTML if present
  summary = summary.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (summary.length > 200) {
    summary = summary.slice(0, 197) + "...";
  }

  return {
    id: job.id,
    type: "job",
    author,
    title: job.title,
    summary,
    time: formatRelativeTime(job.createdAt || job.publishedAt),
    meta,
    engagement: {
      views: job.viewsCount,
      apps: job.applicationsCount,
    },
    href: `/careers/${job.id}`,
    // Social proof could be added if we have network data
    social: job.indigenousPreference ? "Indigenous Preference Hiring" : undefined,
  };
}

/**
 * Convert a Scholarship to OpportunityItem
 */
export function scholarshipToOpportunity(scholarship: Scholarship): OpportunityItem {
  const author: OpportunityAuthor = {
    id: scholarship.employerId,
    name: scholarship.providerName || scholarship.provider || "Unknown Provider",
    verified: true,
  };

  const meta: OpportunityMeta = {
    amount: typeof scholarship.amount === "string" ? scholarship.amount : undefined,
    deadline: formatDeadline(scholarship.deadline),
    institution: scholarship.providerName || scholarship.provider,
  };

  return {
    id: scholarship.id,
    type: "scholarship",
    author,
    title: scholarship.title,
    summary: scholarship.description || "",
    time: formatRelativeTime(scholarship.createdAt),
    meta,
    href: `/education/scholarships/${scholarship.id}`,
  };
}

/**
 * Convert a Conference to OpportunityItem
 */
export function eventToOpportunity(event: Conference | PowwowEvent): OpportunityItem {
  // Check if it's a Conference (has title) vs PowwowEvent (has name)
  const isConference = "title" in event && typeof (event as Conference).title === "string";
  
  const author: OpportunityAuthor = {
    name: isConference 
      ? ((event as Conference).organizerName || (event as Conference).employerName || "Event Organizer")
      : ((event as PowwowEvent).host || "Community Event"),
  };

  // Format date
  let dateStr = "";
  try {
    const start = event.startDate 
      ? typeof event.startDate === "string" 
        ? new Date(event.startDate) 
        : "toDate" in event.startDate 
          ? event.startDate.toDate() 
          : event.startDate
      : null;
    
    if (start) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      dateStr = `${months[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;
    }
  } catch {}

  const meta: OpportunityMeta = {
    date: dateStr,
    venue: event.location,
    price: isConference ? ((event as Conference).cost || "Free") : "Free",
  };

  // Get title from the appropriate field
  const title = isConference 
    ? (event as Conference).title 
    : (event as PowwowEvent).name;

  return {
    id: event.id,
    type: isConference ? "conference" : "event",
    author,
    title: title || "Untitled Event",
    summary: event.description || "",
    time: formatRelativeTime(event.createdAt),
    meta,
    href: isConference ? `/conferences/${event.id}` : `/community/powwows/${event.id}`,
  };
}

/**
 * Convert a TrainingProgram to OpportunityItem
 */
export function trainingToOpportunity(program: TrainingProgram): OpportunityItem {
  const author: OpportunityAuthor = {
    id: program.organizationId,
    name: program.providerName || program.organizationName || "Training Provider",
    verified: true,
  };

  const meta: OpportunityMeta = {
    institution: program.providerName || program.organizationName,
    delivery: program.format,
    price: program.cost || "Free",
  };

  return {
    id: program.id,
    type: "program",
    author,
    title: program.title,
    summary: program.description || program.shortDescription || "",
    time: formatRelativeTime(program.createdAt),
    meta,
    href: `/careers/programs/${program.id}`,
  };
}

/**
 * Convert a LiveStreamEvent to OpportunityItem
 */
export function livestreamToOpportunity(stream: LiveStreamEvent): OpportunityItem {
  const author: OpportunityAuthor = {
    id: stream.employerId,
    name: stream.employerName || stream.host || "IOPPS Live",
    verified: true,
  };

  const isLive = stream.status === "Live Now";
  const isReplay = stream.status === "Replay";

  const meta: OpportunityMeta = {
    platform: stream.platform,
    date: stream.startTime,
  };

  return {
    id: stream.id,
    type: "livestream",
    author,
    title: stream.title,
    summary: stream.description || "",
    time: isLive ? "Live Now" : isReplay ? "Replay available" : formatRelativeTime(stream.createdAt),
    meta,
    live: isLive,
    href: `/live/${stream.id}`,
  };
}

/**
 * Convert a social Post to OpportunityItem
 */
export function postToOpportunity(post: Post): OpportunityItem {
  const author: OpportunityAuthor = {
    id: post.authorId,
    name: post.authorName || "Community Member",
    verified: post.authorType === "organization",
    avatarUrl: post.authorAvatarUrl,
  };

  // Title: first line of content, truncated to ~80 chars
  const firstLine = (post.content || "").split("\n")[0].trim();
  const title = firstLine.length > 80
    ? firstLine.slice(0, 77) + "..."
    : firstLine || "Community Update";

  // Summary: full content truncated to ~200 chars
  const fullContent = (post.content || "").replace(/\s+/g, " ").trim();
  const summary = fullContent.length > 200
    ? fullContent.slice(0, 197) + "..."
    : fullContent;

  // Total reactions (love + honor + fire), fallback to likesCount
  const totalReactions = post.reactionsCount
    ? (post.reactionsCount.love || 0) + (post.reactionsCount.honor || 0) + (post.reactionsCount.fire || 0)
    : post.likesCount || 0;

  return {
    id: post.id,
    type: "update",
    author,
    title,
    summary,
    time: formatRelativeTime(post.createdAt),
    engagement: {
      saves: totalReactions,
      comments: post.commentsCount,
    },
    href: `/posts/${post.id}`,
  };
}

/**
 * Convert a Vendor to OpportunityItem
 */
export function vendorToOpportunity(vendor: Vendor): OpportunityItem {
  const author: OpportunityAuthor = {
    id: vendor.id,
    name: vendor.businessName,
    verified: vendor.verified,
    avatarUrl: vendor.logoUrl,
  };

  const meta: OpportunityMeta = {
    mode: vendor.onlineOnly ? "Online Shop" : vendor.location || "Local",
  };

  return {
    id: vendor.id,
    type: "product", // Using "product" type for vendors/shop
    author,
    title: vendor.businessName,
    summary: vendor.tagline || vendor.description?.slice(0, 150) || "",
    time: formatRelativeTime(vendor.createdAt),
    meta,
    social: vendor.nation ? `${vendor.nation}` : undefined,
    href: `/shop/${vendor.slug || vendor.id}`,
  };
}
