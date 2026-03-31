export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";

/* ─── Data shape ─── */
interface StoryPost {
  id: string;
  title: string;
  description: string;
  body?: string; // long-form content (plain text or HTML)
  personName?: string;
  personNation?: string;
  personPhoto?: string;
  personRole?: string;
  pullQuote?: string;
  coverImage?: string;
  storyTags?: string[];
  createdAt?: { seconds: number };
  updatedAt?: { seconds: number };
  status: string;
  authorName?: string;
  sourceUrl?: string;
}

/* ─── Firestore fetch ─── */
async function getStory(storyId: string): Promise<StoryPost | null> {
  if (!adminDb) return null;
  try {
    const doc = await adminDb.collection("posts").doc(storyId).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    if (data.type !== "story") return null;
    if (data.status !== "active") return null;
    return { id: doc.id, ...data } as StoryPost;
  } catch {
    return null;
  }
}

/* ─── Related stories ─── */
async function getRelatedStories(
  currentId: string,
  tags: string[],
  limit = 3
): Promise<StoryPost[]> {
  if (!adminDb) return [];
  try {
    // Simple approach: get recent stories, filter out current
    const snapshot = await adminDb
      .collection("posts")
      .where("type", "==", "story")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(limit + 1)
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as StoryPost)
      .filter((s) => s.id !== currentId)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/* ─── Helpers ─── */
function formatDate(seconds?: number): string {
  if (!seconds) return "";
  return new Date(seconds * 1000).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/* ─── SEO metadata ─── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ storyId: string }>;
}): Promise<Metadata> {
  const { storyId } = await params;
  const story = await getStory(storyId);
  if (!story) return { title: "Story Not Found | IOPPS.ca" };

  const title = story.personName
    ? `${story.title} — ${story.personName} | IOPPS Stories`
    : `${story.title} | IOPPS Stories`;

  return buildMetadata({
    title,
    description: truncate(story.description, 155),
    path: `/stories/${story.id}`,
    image: story.coverImage || story.personPhoto,
    type: "article",
    publishedTime: story.createdAt
      ? new Date(story.createdAt.seconds * 1000).toISOString()
      : undefined,
  });
}

/* ─── Article JSON-LD ─── */
function generateArticleSchema(story: StoryPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: story.description,
    ...(story.coverImage && { image: story.coverImage }),
    ...(story.personPhoto && !story.coverImage && { image: story.personPhoto }),
    ...(story.createdAt && {
      datePublished: new Date(story.createdAt.seconds * 1000).toISOString(),
    }),
    ...(story.updatedAt && {
      dateModified: new Date(story.updatedAt.seconds * 1000).toISOString(),
    }),
    author: {
      "@type": story.personName ? "Person" : "Organization",
      name: story.authorName || story.personName || "IOPPS",
    },
    publisher: {
      "@type": "Organization",
      name: "IOPPS",
      url: "https://www.iopps.ca",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://www.iopps.ca/stories/${story.id}`,
    },
    ...(story.storyTags &&
      story.storyTags.length > 0 && { keywords: story.storyTags.join(", ") }),
  };
}

/* ─── Breadcrumb schema ─── */
function generateBreadcrumbSchema(storyTitle: string, storyId: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.iopps.ca",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Stories",
        item: "https://www.iopps.ca/stories",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: storyTitle,
        item: `https://www.iopps.ca/stories/${storyId}`,
      },
    ],
  };
}

/* ─── Page ─── */
export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const story = await getStory(storyId);
  if (!story) notFound();

  const related = await getRelatedStories(
    story.id,
    story.storyTags || [],
    3
  );

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateArticleSchema(story)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbSchema(story.title, story.id)
          ),
        }}
      />

      <article>
        {/* Hero / Cover */}
        <section className="relative bg-[var(--surface-raised)]">
          {(story.coverImage || story.personPhoto) && (
            <div className="w-full h-64 md:h-96 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={story.coverImage || story.personPhoto}
                alt={story.personName || story.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          <div
            className={`max-w-3xl mx-auto px-4 ${
              story.coverImage || story.personPhoto
                ? "relative -mt-24 z-10"
                : "pt-12"
            }`}
          >
            {/* Breadcrumb */}
            <nav
              className={`text-sm mb-4 ${
                story.coverImage || story.personPhoto
                  ? "text-white/80"
                  : "text-[var(--text-muted)]"
              }`}
              aria-label="Breadcrumb"
            >
              <Link
                href="/"
                className="hover:underline"
              >
                Home
              </Link>
              <span className="mx-2">›</span>
              <Link
                href="/stories"
                className="hover:underline"
              >
                Stories
              </Link>
              <span className="mx-2">›</span>
              <span>{truncate(story.title, 40)}</span>
            </nav>

            {/* Tags */}
            {story.storyTags && story.storyTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {story.storyTags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-semibold uppercase tracking-wider bg-[var(--accent)] text-white px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1
              className={`text-3xl md:text-4xl font-bold mb-3 ${
                story.coverImage || story.personPhoto
                  ? "text-white drop-shadow-md"
                  : "text-[var(--text-primary)]"
              }`}
            >
              {story.title}
            </h1>

            {/* Person + Date */}
            <div
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${
                story.coverImage || story.personPhoto
                  ? "text-white/80"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {story.personName && (
                <span className="font-medium">
                  {story.personName}
                  {story.personNation && ` · ${story.personNation}`}
                  {story.personRole && ` · ${story.personRole}`}
                </span>
              )}
              {story.createdAt && (
                <time dateTime={new Date(story.createdAt.seconds * 1000).toISOString()}>
                  {formatDate(story.createdAt.seconds)}
                </time>
              )}
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="max-w-3xl mx-auto px-4 py-10">
          {/* Person photo (if no cover but has person photo — show inline) */}
          {!story.coverImage && story.personPhoto && (
            <div className="mb-8 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={story.personPhoto}
                alt={story.personName || ""}
                className="w-40 h-40 rounded-full object-cover border-4 border-[var(--accent)]"
              />
            </div>
          )}

          {/* Pull Quote */}
          {story.pullQuote && (
            <blockquote className="text-xl md:text-2xl italic text-[var(--text-secondary)] border-l-4 border-[var(--accent)] pl-6 my-8 leading-relaxed">
              &ldquo;{story.pullQuote}&rdquo;
              {story.personName && (
                <footer className="text-sm not-italic text-[var(--text-muted)] mt-3">
                  — {story.personName}
                </footer>
              )}
            </blockquote>
          )}

          {/* Description (always shown) */}
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
            {story.description}
          </p>

          {/* Body content (if present) */}
          {story.body && (
            <div
              className="prose prose-lg max-w-none
                prose-headings:text-[var(--text-primary)]
                prose-p:text-[var(--text-secondary)]
                prose-a:text-[var(--accent)] prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-[var(--accent)] prose-blockquote:text-[var(--text-secondary)]
                prose-strong:text-[var(--text-primary)]"
              dangerouslySetInnerHTML={{ __html: story.body }}
            />
          )}

          {/* Source link */}
          {story.sourceUrl && (
            <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
              <a
                href={story.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline text-sm"
              >
                Read the original source →
              </a>
            </div>
          )}

          {/* Share / CTA */}
          <div className="mt-10 pt-8 border-t border-[var(--card-border)] text-center">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              Know Someone Making an Impact?
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              We spotlight Indigenous athletes, entrepreneurs, leaders, and
              changemakers. Share their story with us.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              Submit a Story
            </Link>
          </div>
        </section>

        {/* Related Stories */}
        {related.length > 0 && (
          <section className="bg-[var(--surface-raised)] py-12 px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
                More Stories
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/stories/${r.id}`}
                    className="group block bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {(r.coverImage || r.personPhoto) && (
                      <div className="h-44 bg-[var(--surface-raised)] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.coverImage || r.personPhoto}
                          alt={r.personName || r.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-1">
                        {r.title}
                      </h3>
                      {r.personName && (
                        <p className="text-sm text-[var(--text-secondary)] mb-2">
                          {r.personName}
                          {r.personNation && ` · ${r.personNation}`}
                        </p>
                      )}
                      <p className="text-sm text-[var(--text-secondary)]">
                        {truncate(r.description, 100)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  );
}
