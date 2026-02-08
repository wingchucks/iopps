import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMemberProfileServer } from "@/lib/firestore/server-members";
import MemberProfile from "./MemberProfile";

interface PageProps {
  params: Promise<{ userId: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  const profile = await getMemberProfileServer(userId);

  if (!profile) {
    return {
      title: "Profile Not Found | IOPPS",
    };
  }

  const title = profile.displayName
    ? `${profile.displayName} | IOPPS Community`
    : "Community Member | IOPPS";

  const description = profile.bio
    ? profile.bio.slice(0, 160)
    : profile.tagline || `View ${profile.displayName || "this member"}'s profile on IOPPS`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: profile.avatarUrl || profile.photoURL
        ? [{ url: profile.avatarUrl || profile.photoURL || "" }]
        : [],
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const profile = await getMemberProfileServer(userId);

  if (!profile) {
    notFound();
  }

  // isOwner will be determined client-side inside MemberProfile via useAuth()
  // We pass isOwner=false as default; MemberProfile's client code handles the real check
  return <MemberProfile profile={profile} isOwner={false} userId={userId} />;
}
