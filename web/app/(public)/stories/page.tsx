export const dynamic = 'force-dynamic';
import type { Metadata } from "next";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Stories — Indigenous Success Stories | IOPPS.ca",
  description:
    "Read inspiring stories of Indigenous excellence — athletes, entrepreneurs, community leaders, and changemakers making an impact across Canada.",
  path: "/stories",
  type: "website",
});

interface StoryPost {
  id: string;
  title: string;
  description: string;
  personName?: string;
  personNation?: string;
  personPhoto?: string;
  pullQuote?: string;
  coverImage?: string;
  storyTags?: string[];
  createdAt?: { seconds: number };
  status: string;
}

async function getStories(): Promise<StoryPost[]> {
  if (!adminDb) return [];
  try {
    const snapshot = await adminDb
      .collection("posts")
      .where("type", "==", "story")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as StoryPost[];
  } catch {
    return [];
  }
}

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

export default async function StoriesPage() {
  const stories = await getStories();

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Indigenous Stories
        </h1>
        <p className="text-lg text-white/80 max-w-2xl mx-auto">
          Celebrating the people, programs, and communities shaping Indigenous
          success across Canada.
        </p>
      </section>

      {/* Story Grid */}
      <section className="py-12 px-4 max-w-6xl mx-auto">
        {stories.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl mb-4 block">📝</span>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Stories Coming Soon
            </h2>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto mb-8">
              We&apos;re collecting inspiring stories of Indigenous excellence —
              athletes, entrepreneurs, community leaders, and changemakers. Check
              back soon.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Share a Story
            </Link>
          </div>
        ) : (
          <>
            {/* Featured Story (first one) */}
            {stories.length > 0 && (
              <Link
                href={`/stories/${stories[0].id}`}
                className="block mb-12 group"
              >
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden md:flex">
                  {(stories[0].coverImage || stories[0].personPhoto) && (
                    <div className="md:w-1/2 h-64 md:h-auto bg-[var(--surface-raised)] relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={stories[0].coverImage || stories[0].personPhoto}
                        alt={stories[0].personName || stories[0].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-8 md:p-10 md:w-1/2 flex flex-col justify-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-2">
                      Featured Story
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-3">
                      {stories[0].title}
                    </h2>
                    {stories[0].personName && (
                      <p className="text-[var(--text-secondary)] mb-2">
                        <span className="font-medium">
                          {stories[0].personName}
                        </span>
                        {stories[0].personNation &&
                          ` · ${stories[0].personNation}`}
                      </p>
                    )}
                    {stories[0].pullQuote && (
                      <blockquote className="text-[var(--text-secondary)] italic border-l-4 border-[var(--accent)] pl-4 my-4">
                        &ldquo;{truncate(stories[0].pullQuote, 150)}&rdquo;
                      </blockquote>
                    )}
                    <p className="text-[var(--text-secondary)]">
                      {truncate(stories[0].description, 200)}
                    </p>
                    <span className="text-sm text-[var(--text-muted)] mt-4">
                      {formatDate(stories[0].createdAt?.seconds)}
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Rest of the stories */}
            {stories.length > 1 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.slice(1).map((story) => (
                  <Link
                    key={story.id}
                    href={`/stories/${story.id}`}
                    className="group block bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {(story.coverImage || story.personPhoto) && (
                      <div className="h-48 bg-[var(--surface-raised)] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={story.coverImage || story.personPhoto}
                          alt={story.personName || story.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      {story.storyTags && story.storyTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {story.storyTags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-[var(--accent-light)] text-[var(--accent)] px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-1">
                        {story.title}
                      </h3>
                      {story.personName && (
                        <p className="text-sm text-[var(--text-secondary)] mb-2">
                          {story.personName}
                          {story.personNation && ` · ${story.personNation}`}
                        </p>
                      )}
                      <p className="text-sm text-[var(--text-secondary)]">
                        {truncate(story.description, 120)}
                      </p>
                      <span className="text-xs text-[var(--text-muted)] mt-3 block">
                        {formatDate(story.createdAt?.seconds)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Submit CTA */}
      <section className="bg-[var(--surface-raised)] py-16 px-4 text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          Know Someone Making an Impact?
        </h2>
        <p className="text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
          We want to spotlight Indigenous athletes, entrepreneurs, community
          leaders, and organizations doing incredible work. Share their story
          with us.
        </p>
        <Link
          href="/contact"
          className="inline-block bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Submit a Story
        </Link>
      </section>
    </div>
  );
}
