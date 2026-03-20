import type { Metadata } from "next";
import ScholarshipDetailClient from "./ScholarshipDetailClient";
import { getPost } from "@/lib/firestore/posts";
import { getScholarshipBySlug, type Scholarship } from "@/lib/firestore/scholarships";
import { displayAmount } from "@/lib/utils";

const SITE_URL = "https://www.iopps.ca";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

type RouteParams = {
  slug: string;
};

function stripHtml(input?: string): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(input: string, max = 190): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1).trimEnd()}…`;
}

async function resolveScholarship(slug: string): Promise<Scholarship | null> {
  const scholarship = await getScholarshipBySlug(slug);
  if (scholarship) return scholarship;

  const post = await getPost(`scholarship-${slug}`);
  if (!post) return null;

  return {
    id: post.id,
    title: post.title,
    slug: post.slug || slug,
    description: post.description,
    eligibility: post.eligibility,
    amount: post.amount,
    deadline: post.deadline,
    orgId: post.orgId,
    orgName: post.orgName,
    orgShort: post.orgShort,
    applicationUrl: post.applicationUrl,
    requirements: post.requirements,
    location: post.location,
    featured: post.featured,
    badges: post.badges,
    source: post.source,
  };
}

function buildScholarshipDescription(scholarship: Scholarship): string {
  const contentSummary = stripHtml(
    scholarship.description ||
      scholarship.eligibility ||
      scholarship.applicationInstructions ||
      "",
  );

  const facts = [
    scholarship.orgName ? `from ${scholarship.orgName}` : "",
    displayAmount(scholarship.amount) ? `worth ${displayAmount(scholarship.amount)}` : "",
    scholarship.deadline ? `deadline ${scholarship.deadline}` : "",
  ].filter(Boolean);

  const lead = facts.length > 0
    ? `${scholarship.title} ${facts.join(" · ")}.`
    : `${scholarship.title}.`;

  if (!contentSummary) {
    return truncate(`${lead} View scholarship details, eligibility requirements, deadlines, and how to apply on IOPPS.`);
  }

  return truncate(`${lead} ${contentSummary}`);
}

export async function generateMetadata(
  { params }: { params: Promise<RouteParams> },
): Promise<Metadata> {
  const { slug } = await params;
  const scholarship = await resolveScholarship(slug);

  if (!scholarship) {
    return {
      title: "Scholarship Opportunity",
      description:
        "View scholarship details, eligibility requirements, deadlines, and application instructions for Indigenous students.",
    };
  }

  const title = `${scholarship.title} | Scholarships | IOPPS`;
  const description = buildScholarshipDescription(scholarship);
  const url = `${SITE_URL}/scholarships/${scholarship.slug || slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: "IOPPS.CA",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: scholarship.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default function ScholarshipDetailPage() {
  return <ScholarshipDetailClient />;
}
