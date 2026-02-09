"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  InlineEditTextArea,
  SectionEditWrapper,
  ProfileTabBar,
} from "@/components/shared/inline-edit";
import { upsertMemberProfile, trackMemberProfileView } from "@/lib/firestore";
import type { MemberProfile as MemberProfileType } from "@/lib/types";
import {
  Bookmark,
  Bell,
  LayoutDashboard,
  ClipboardList,
} from "lucide-react";
import toast from "react-hot-toast";

// Sub-components
import EngagementStats from "@/components/member/EngagementStats";
import ProfileHeader from "@/components/member/profile/ProfileHeader";
import ExperienceSection from "@/components/member/profile/ExperienceSection";
import EducationSection from "@/components/member/profile/EducationSection";
import SkillsSection from "@/components/member/profile/SkillsSection";
import PortfolioSection from "@/components/member/profile/PortfolioSection";
import ResumeSection from "@/components/member/profile/ResumeSection";
import ProfileApplications from "@/components/member/profile/ProfileApplications";
import ProfileSaved from "@/components/member/profile/ProfileSaved";
import ProfileAlerts from "@/components/member/profile/ProfileAlerts";
import ProfileOverview from "@/components/member/profile/ProfileOverview";

interface MemberProfileProps {
  profile: MemberProfileType;
  isOwner: boolean;
  userId: string;
}

export default function MemberProfile({
  profile: initialProfile,
  isOwner: isOwnerProp,
  userId,
}: MemberProfileProps) {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<MemberProfileType>(initialProfile);
  const [activeTab, setActiveTab] = useState("overview");
  // Track which tabs have been activated (for lazy loading)
  const [activatedTabs, setActivatedTabs] = useState<Set<string>>(new Set(["overview"]));

  // Determine ownership client-side (overrides server prop once auth is loaded)
  const isOwner = user?.uid === userId || isOwnerProp;

  // Track profile views for non-owners
  useEffect(() => {
    if (!isOwner && profile.userId) {
      trackMemberProfileView({
        memberId: profile.userId,
        visitorId: user?.uid,
        visitorName: user?.displayName || undefined,
        visitorType: user
          ? role === "employer"
            ? "employer"
            : "member"
          : "anonymous",
        referrer:
          typeof window !== "undefined" ? document.referrer : undefined,
      });
    }
  }, [profile.userId, isOwner, user, role]);

  // Handle profile updates (merge partial updates into local state)
  const handleProfileUpdate = useCallback(
    (updates: Partial<MemberProfileType>) => {
      setProfile((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Handle tab change with lazy activation tracking
  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      setActivatedTabs((prev) => {
        if (prev.has(tabId)) return prev;
        const next = new Set(prev);
        next.add(tabId);
        return next;
      });
    },
    []
  );

  // Handle bio save with optimistic update
  const handleBioSave = async (newBio: string) => {
    const previousBio = profile.bio;
    // Optimistic update
    handleProfileUpdate({ bio: newBio.slice(0, 500) });
    try {
      await upsertMemberProfile(userId, { bio: newBio.slice(0, 500) });
      toast.success("Bio updated!");
    } catch (error) {
      // Revert on failure
      handleProfileUpdate({ bio: previousBio });
      console.error("Error saving bio:", error);
      toast.error("Failed to save bio.");
      throw error;
    }
  };

  // Tab definitions (only show owner-only tabs when isOwner)
  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    ...(isOwner
      ? [
          {
            id: "applications",
            label: "Applications",
            icon: <ClipboardList className="h-4 w-4" />,
          },
          {
            id: "saved",
            label: "Saved",
            icon: <Bookmark className="h-4 w-4" />,
          },
          {
            id: "alerts",
            label: "Alerts",
            icon: <Bell className="h-4 w-4" />,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Profile card container */}
      <div className="container max-w-4xl mx-auto px-0 sm:px-4 pb-24">
        <div className="sm:rounded-2xl border-b sm:border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
          {/* Header (banner + avatar + name + actions) */}
          <ProfileHeader
            profile={profile}
            isOwner={isOwner}
            userId={userId}
            onProfileUpdate={handleProfileUpdate}
          />
        </div>

        {/* Engagement Stats (owner only) */}
        {isOwner && (
          <div className="mt-6 px-4 sm:px-0">
            <EngagementStats onNavigate={(tab) => handleTabChange(tab)} />
          </div>
        )}

        {/* Profile body sections - staggered fade-in */}
        <div className="mt-6 space-y-6 px-4 sm:px-0 stagger-children">
          {/* About / Bio */}
          <SectionEditWrapper title="About" canEdit={false}>
            {isOwner ? (
              <InlineEditTextArea
                value={profile.bio || ""}
                onSave={handleBioSave}
                canEdit={true}
                placeholder="Write a brief introduction about yourself, your background, and what you're looking for..."
                maxLength={500}
                rows={4}
              />
            ) : profile.bio ? (
              <p className="text-[var(--text-secondary)] whitespace-pre-wrap text-sm">
                {profile.bio}
              </p>
            ) : (
              <p className="text-[var(--text-muted)] text-sm text-center py-4">
                No bio available.
              </p>
            )}
          </SectionEditWrapper>

          {/* Experience */}
          <ExperienceSection
            profile={profile}
            isOwner={isOwner}
            userId={userId}
            onProfileUpdate={handleProfileUpdate}
          />

          {/* Education */}
          <EducationSection
            profile={profile}
            isOwner={isOwner}
            userId={userId}
            onProfileUpdate={handleProfileUpdate}
          />

          {/* Skills */}
          <SkillsSection
            profile={profile}
            isOwner={isOwner}
            userId={userId}
            onProfileUpdate={handleProfileUpdate}
          />

          {/* Portfolio */}
          <PortfolioSection
            profile={profile}
            isOwner={isOwner}
            userId={userId}
            onProfileUpdate={handleProfileUpdate}
          />

          {/* Resume */}
          {(isOwner || profile.resumeUrl) && (
            <ResumeSection
              profile={profile}
              isOwner={isOwner}
              userId={userId}
              onProfileUpdate={handleProfileUpdate}
            />
          )}
        </div>

        {/* Profile Tabs (below the fold) */}
        <div className="mt-8 px-4 sm:px-0">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
            <ProfileTabBar
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />

            <div className="p-4 sm:p-6">
              {/* Tab content with crossfade animation */}
              <div key={activeTab} className="animate-crossfade">
                {activeTab === "overview" && (
                  <ProfileOverview userId={userId} profile={profile} />
                )}

                {/* Lazy-loaded tabs: only render once activated */}
                {activeTab === "applications" && isOwner && activatedTabs.has("applications") && (
                  <ProfileApplications />
                )}

                {activeTab === "saved" && isOwner && activatedTabs.has("saved") && (
                  <ProfileSaved />
                )}

                {activeTab === "alerts" && isOwner && activatedTabs.has("alerts") && (
                  <ProfileAlerts />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
