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
  User,
  Briefcase as BriefcaseLucide,
  Award,
  ArrowLeft,
  MessageSquare,
  Shield,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import UserMenu from "@/components/member/UserMenu";

// Sub-components
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
import ProfileEndorsementsTab from "@/components/member/profile/ProfileEndorsementsTab";
import ProfileDashboard from "@/components/member/profile/ProfileDashboard";
import ProfileCompleteness from "@/components/member/profile/ProfileCompleteness";
import JobRecommendations from "@/components/member/profile/JobRecommendations";

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
  // Determine initial tab - owners start on dashboard, others on about
  const initialTab = isOwnerProp ? "dashboard" : "about";
  const [activeTab, setActiveTab] = useState(initialTab);
  // Track which tabs have been activated (for lazy loading)
  const [activatedTabs, setActivatedTabs] = useState<Set<string>>(new Set([initialTab]));

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

  // Tab definitions
  const tabs = [
    ...(isOwner
      ? [{ id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> }]
      : []),
    { id: "about", label: "About", icon: <User className="h-4 w-4" /> },
    { id: "experience", label: "Experience", icon: <BriefcaseLucide className="h-4 w-4" /> },
    { id: "endorsements", label: "Endorsements", icon: <Award className="h-4 w-4" /> },
    ...(!isOwner
      ? [{ id: "activity", label: "Activity", icon: <LayoutDashboard className="h-4 w-4" /> }]
      : []),
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
    <div className="bg-[var(--background)]">
      {/* Sticky nav bar */}
      <header className="sticky top-0 z-30 h-14 border-b border-[var(--border)] bg-[var(--card-bg)] backdrop-blur-sm">
        <div className="flex h-full items-center justify-between px-4 sm:px-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/home" className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--background)] transition-colors" aria-label="Back to feed">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Link href="/home" className="text-lg font-bold text-accent">
              IOPPS
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/member/messages"
                  className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--background)] transition-colors"
                  aria-label="Messages"
                >
                  <MessageSquare className="h-5 w-5" />
                </Link>
                <UserMenu />
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Link href="/login" className="px-3 py-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--background)] transition-colors">
                  Login
                </Link>
                <Link href="/signup/member" className="px-3 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors">
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Privacy info banner (owner only) */}
      {isOwner && (
        <div className="border-b border-[var(--border)] bg-accent/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-accent flex-shrink-0" />
            <p className="text-[var(--text-secondary)]">
              Your profile details are only visible to employers you choose to share with.{" "}
              <Link href="/member/settings/privacy" className="text-accent hover:underline font-medium">
                Manage privacy &rarr;
              </Link>
            </p>
          </div>
        </div>
      )}

      <div className="container max-w-4xl mx-auto px-0 sm:px-4 pb-24">
        <div className="sm:rounded-2xl border-b sm:border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden sm:mt-4">
          <ProfileHeader
            profile={profile}
            isOwner={isOwner}
            userId={userId}
            onProfileUpdate={handleProfileUpdate}
          />
        </div>

        {/* Tabs immediately after header */}
        <div className="mt-6 px-4 sm:px-0">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
            <ProfileTabBar
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />

            <div className="p-4 sm:p-6">
              <div key={activeTab} className="animate-crossfade">
                {activeTab === "dashboard" && isOwner && (
                  <div className="space-y-6">
                    <ProfileCompleteness profile={profile} compact />
                    <ProfileDashboard />
                    <JobRecommendations />
                  </div>
                )}

                {activeTab === "about" && (
                  <div className="space-y-6">
                    {/* Bio */}
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

                    {/* Skills */}
                    <SkillsSection
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
                )}

                {activeTab === "experience" && (
                  <ExperienceSection
                    profile={profile}
                    isOwner={isOwner}
                    userId={userId}
                    onProfileUpdate={handleProfileUpdate}
                  />
                )}

                {activeTab === "endorsements" && (
                  <ProfileEndorsementsTab userId={userId} profile={profile} isOwner={isOwner} />
                )}

                {activeTab === "activity" && (
                  <ProfileOverview userId={userId} profile={profile} />
                )}

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
