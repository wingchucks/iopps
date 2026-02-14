"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useMessageDrawer } from "@/components/messaging";
import { ConnectionButton } from "@/components/social/ConnectionButton";
import { ImageUploader, InlineEditField, SettingsDrawer } from "@/components/shared/inline-edit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  getOrCreatePeerConversation,
  getMemberProfile,
  upsertMemberProfile,
  getTopSkills,
  getMemberEngagementStats,
} from "@/lib/firestore";
import { getEndorsementsForUser } from "@/lib/firestore/endorsements";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import type { MemberProfile } from "@/lib/types";
import {
  MapPin,
  Users,
  CheckCircle,
  MessageSquare,
  Settings,
  Share2,
  Eye,
  Loader2,
  Award,
  Calendar,
  Camera,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import BadgeDisplay from "@/components/member/BadgeDisplay";

interface ProfileHeaderProps {
  profile: MemberProfile;
  isOwner: boolean;
  userId: string;
  onProfileUpdate: (updates: Partial<MemberProfile>) => void;
}

export default function ProfileHeader({
  profile,
  isOwner,
  userId,
  onProfileUpdate,
}: ProfileHeaderProps) {
  const { user, role } = useAuth();
  const router = useRouter();
  const { openConversation } = useMessageDrawer();
  const [startingChat, setStartingChat] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [topSkills, setTopSkills] = useState<{ skill: string; count: number }[]>([]);
  const [endorsementCount, setEndorsementCount] = useState(0);
  const [engagementStats, setEngagementStats] = useState<{ connections: number; profileViews: number } | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile.userId) {
      getTopSkills(profile.userId, 3).then(setTopSkills).catch(() => {});
      getEndorsementsForUser(profile.userId).then(e => setEndorsementCount(e.length)).catch(() => {});
      getMemberEngagementStats(profile.userId).then(s => {
        setEngagementStats({ connections: s.connections.total, profileViews: s.profileViews.total });
      }).catch(() => {});
    }
  }, [profile.userId]);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvailabilityInfo = (availability?: string) => {
    switch (availability) {
      case "yes":
        return {
          label: "Actively Looking",
          color: "bg-accent/20 text-accent border-accent/30",
        };
      case "maybe":
        return {
          label: "Open to Opportunities",
          color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        };
      case "no":
        return {
          label: "Not Available",
          color: "bg-slate-500/20 text-[var(--text-muted)] border-slate-500/30",
        };
      default:
        return null;
    }
  };

  const availabilityInfo = getAvailabilityInfo(profile.availableForInterviews);

  // Profile completeness
  const profileCompletion = useMemo(() => {
    const fields = [
      profile.displayName,
      profile.avatarUrl || profile.photoURL,
      profile.bio,
      profile.location,
      (profile.skills?.length ?? 0) > 0 ? "skills" : "",
      (profile.experience?.length ?? 0) > 0 ? "experience" : "",
      (profile.education?.length ?? 0) > 0 ? "education" : "",
      profile.resumeUrl,
      profile.indigenousAffiliation,
      profile.messagingHandle,
      profile.availableForInterviews,
    ];
    const filled = fields.filter(
      (field) => field && field.toString().trim().length > 0
    ).length;
    return Math.round((filled / fields.length) * 100) || 0;
  }, [profile]);

  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    try {
      const photoRef = ref(
        storage!,
        `users/${user.uid}/avatar/profile.${file.name.split(".").pop()}`
      );
      await uploadBytes(photoRef, file);
      const url = await getDownloadURL(photoRef);
      await upsertMemberProfile(user.uid, { avatarUrl: url });
      onProfileUpdate({ avatarUrl: url });
      toast.success("Profile photo updated!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo.");
      throw error;
    }
  };

  // Handle cover photo upload
  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    try {
      setCoverUploading(true);
      const ext = file.name.split(".").pop();
      const coverRef = ref(storage!, `users/${user.uid}/cover/banner.${ext}`);
      await uploadBytes(coverRef, file);
      const url = await getDownloadURL(coverRef);
      await upsertMemberProfile(user.uid, { coverPhotoUrl: url });
      onProfileUpdate({ coverPhotoUrl: url });
      toast.success("Cover photo updated!");
    } catch (error) {
      console.error("Error uploading cover photo:", error);
      toast.error("Failed to upload cover photo.");
    } finally {
      setCoverUploading(false);
      // Reset input so re-selecting the same file triggers change
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // Handle inline field save
  const handleFieldSave = async (
    field: string,
    value: string
  ) => {
    if (!user) return;
    try {
      await upsertMemberProfile(user.uid, { [field]: value });
      onProfileUpdate({ [field]: value });
      toast.success("Updated!");
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error("Failed to save.");
      throw error;
    }
  };

  // Toggle availability
  const handleToggleAvailability = async () => {
    if (!user) return;
    const cycle = ["yes", "maybe", "no", ""];
    const currentIdx = cycle.indexOf(profile.availableForInterviews || "");
    const nextVal = cycle[(currentIdx + 1) % cycle.length];
    try {
      await upsertMemberProfile(user.uid, {
        availableForInterviews: nextVal,
      });
      onProfileUpdate({ availableForInterviews: nextVal });
      toast.success(
        nextVal
          ? `Availability set to "${getAvailabilityInfo(nextVal)?.label}"`
          : "Availability cleared"
      );
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast.error("Failed to update availability.");
    }
  };

  // Share profile
  const handleShareProfile = async () => {
    const url = `${window.location.origin}/member/${userId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile.displayName}'s Profile`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied to clipboard!");
      }
    } catch {
      // User cancelled share or error
    }
  };

  // Start conversation — opens the message drawer instead of navigating
  const handleStartConversation = async () => {
    if (!user) {
      toast.error("Please sign in to send messages");
      router.push(
        "/login?redirect=" + encodeURIComponent(`/member/${profile.userId}`)
      );
      return;
    }
    try {
      setStartingChat(true);
      const currentUserProfile = await getMemberProfile(user.uid);
      const conversation = await getOrCreatePeerConversation({
        userId1: user.uid,
        userId2: profile.userId,
        user1Name:
          currentUserProfile?.displayName || user.displayName || "User",
        user1Avatar: currentUserProfile?.avatarUrl || currentUserProfile?.photoURL,
        user2Name: profile.displayName,
        user2Avatar: profile.avatarUrl || profile.photoURL,
      });
      openConversation(conversation.id);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Failed to start conversation. Please try again.");
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <>
      {/* Banner - cover photo or navy gradient fallback */}
      <div className="relative h-48 sm:h-56 sm:rounded-t-2xl overflow-hidden bg-gradient-to-br from-[var(--navy)] via-[var(--navy-lt)] to-accent/80">
        {profile.coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.coverPhotoUrl}
            alt="Cover photo"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
          </>
        )}
        {/* Dark overlay for text readability on cover photos */}
        {profile.coverPhotoUrl && <div className="absolute inset-0 bg-black/30" />}

        {/* Cover photo upload button (owner only) */}
        {isOwner && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverPhotoUpload}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-black/50 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white border border-white/20 hover:bg-black/60 transition-colors"
              aria-label={profile.coverPhotoUrl ? "Change cover photo" : "Add cover photo"}
            >
              {coverUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              {profile.coverPhotoUrl ? "Change Cover" : "Add Cover Photo"}
            </button>
          </>
        )}

        {/* Action buttons in banner top-right */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 flex flex-wrap gap-2">
          {isOwner ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                onClick={handleShareProfile}
                aria-label="Share profile"
              >
                <Share2 className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <Link href={`/member/${userId}?preview=true`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                  aria-label="Preview profile as others see it"
                >
                  <Eye className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Preview</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                onClick={() => setSettingsOpen(true)}
                aria-label="Open profile settings"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              <ConnectionButton targetUserId={profile.userId} />
              <Button
                variant="ghost"
                className="bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                onClick={handleStartConversation}
                disabled={startingChat}
                aria-label={startingChat ? "Starting conversation..." : `Send message to ${profile.displayName}`}
              >
                {startingChat ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
                Message
              </Button>
            </>
          )}
        </div>

        {/* Badges in banner - frosted pills */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex flex-wrap gap-2">
          {availabilityInfo && (
            <button
              type="button"
              onClick={isOwner ? handleToggleAvailability : undefined}
              className={`bg-white/15 backdrop-blur-sm text-white border border-white/20 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5 ${
                isOwner ? "cursor-pointer hover:bg-white/25 transition-colors" : ""
              }`}
              aria-label={isOwner ? `Change availability status. Currently: ${availabilityInfo.label}` : availabilityInfo.label}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              {availabilityInfo.label}
            </button>
          )}
          {isOwner && !availabilityInfo && (
            <button
              type="button"
              onClick={handleToggleAvailability}
              className="bg-white/15 backdrop-blur-sm text-white border border-white/20 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer hover:bg-white/25 transition-colors"
              aria-label="Set your availability status"
            >
              <CheckCircle className="h-3 w-3" />
              Set availability
            </button>
          )}
        </div>

        {/* Identity Row */}
        {(profile.nation || profile.territory || profile.band || profile.location) && (
          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {profile.nation && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-white/90 border border-white/10">
                  <Users className="h-3.5 w-3.5" /> {profile.nation}
                </span>
              )}
              {profile.territory && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-white/90 border border-white/10">
                  {profile.territory}
                </span>
              )}
              {profile.band && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-white/90 border border-white/10">
                  {profile.band}
                </span>
              )}
              {profile.location && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-white/90 border border-white/10">
                  <MapPin className="h-3.5 w-3.5" /> {profile.location}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-4 divide-x divide-[var(--card-border)] border-b border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex flex-col items-center py-3 sm:py-4">
          <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{engagementStats?.connections ?? 0}</span>
          <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">Connections</span>
        </div>
        <div className="flex flex-col items-center py-3 sm:py-4">
          <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{endorsementCount}</span>
          <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">Endorsements</span>
        </div>
        <div className="flex flex-col items-center py-3 sm:py-4">
          <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">{engagementStats?.profileViews ?? 0}</span>
          <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">Profile Views</span>
        </div>
        <div className="flex flex-col items-center py-3 sm:py-4">
          <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
            {profile.createdAt ? (typeof profile.createdAt === 'object' && 'toDate' in profile.createdAt ? profile.createdAt.toDate().getFullYear() : new Date(profile.createdAt as unknown as string).getFullYear()) : '\u2014'}
          </span>
          <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">Member Since</span>
        </div>
      </div>

      {/* Profile header card */}
      <div className="relative -mt-0 px-4 sm:px-8 pb-6 pt-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
          {/* Avatar - overlaps banner bottom edge */}
          <div className="relative -mt-20 sm:-mt-20 z-10">
            {isOwner ? (
              <ImageUploader
                currentImageUrl={
                  profile.avatarUrl || profile.photoURL
                }
                onUpload={handleAvatarUpload}
                canEdit={true}
                variant="avatar"
                className="[&_button]:h-28 [&_button]:w-28 sm:[&_button]:h-32 sm:[&_button]:w-32 [&_button]:border-4 [&_button]:border-[var(--card-bg)] [&_button]:shadow-xl"
              />
            ) : (
              <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-[var(--card-bg)] shadow-xl">
                <AvatarImage
                  src={profile.avatarUrl || profile.photoURL}
                />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-[var(--navy)] to-accent text-white">
                  {getInitials(profile.displayName)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          {/* Info area */}
          <div className="flex-1 min-w-0 pt-2 w-full">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0 text-center sm:text-left">
                {/* Name - centered on mobile, left on desktop */}
                {isOwner ? (
                  <InlineEditField
                    value={profile.displayName || ""}
                    onSave={(v) => handleFieldSave("displayName", v)}
                    canEdit={true}
                    placeholder="Add your name"
                    className="justify-center sm:justify-start [&_button]:text-2xl [&_button]:sm:text-3xl [&_button]:font-bold [&_input]:text-2xl [&_input]:sm:text-3xl [&_input]:font-bold"
                  />
                ) : (
                  <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] truncate">
                    {profile.displayName || "IOPPS Member"}
                  </h1>
                )}

                {/* Tagline - centered on mobile */}
                {isOwner ? (
                  <InlineEditField
                    value={profile.tagline || ""}
                    onSave={(v) => handleFieldSave("tagline", v)}
                    canEdit={true}
                    placeholder="Add a headline or tagline"
                    className="mt-1 justify-center sm:justify-start [&_button]:text-[var(--text-muted)] [&_input]:text-sm"
                  />
                ) : (
                  profile.tagline && (
                    <p className="text-[var(--text-muted)] mt-1">
                      {profile.tagline}
                    </p>
                  )
                )}

                {/* Pronouns */}
                {profile.pronouns && (
                  <span className="mt-1 inline-block text-sm text-[var(--text-muted)]">
                    ({profile.pronouns})
                  </span>
                )}

                {/* Achievement badges */}
                <div className="mt-2 flex justify-center sm:justify-start">
                  <BadgeDisplay
                    userId={profile.userId}
                    compact
                    maxDisplay={5}
                  />
                </div>

                {/* Top Endorsed Skills */}
                {topSkills.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Award className="h-4 w-4 text-accent" aria-hidden="true" />
                    {topSkills.map((s) => (
                      <span
                        key={s.skill}
                        className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                      >
                        {s.skill}
                        <span className="rounded-full bg-accent/20 px-1.5 text-[10px] font-semibold">
                          {s.count}
                        </span>
                      </span>
                    ))}
                    <Link
                      href="/member/endorsements"
                      className="text-xs text-[var(--text-muted)] hover:text-accent transition-colors"
                    >
                      View all
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Profile completeness (owner only) */}
            {isOwner && profileCompletion < 100 && (
              <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--border-lt)] p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Profile Completeness
                  </span>
                  <span className="text-xs font-semibold text-[var(--accent)]">
                    {profileCompletion}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--card-border)]">
                  <div
                    className="h-1.5 rounded-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Profile Settings"
      >
        <div className="space-y-4">
          <Link
            href="/member/settings/privacy"
            className="block rounded-xl border border-[var(--card-border)] p-4 hover:bg-[var(--border-lt)] transition-colors"
          >
            <p className="font-medium text-[var(--text-primary)]">
              Privacy Settings
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Control who can see your profile information
            </p>
          </Link>
          <Link
            href="/member/settings/notifications"
            className="block rounded-xl border border-[var(--card-border)] p-4 hover:bg-[var(--border-lt)] transition-colors"
          >
            <p className="font-medium text-[var(--text-primary)]">
              Notification Preferences
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Manage email and push notifications
            </p>
          </Link>
          <Link
            href="/member/settings/account"
            className="block rounded-xl border border-[var(--card-border)] p-4 hover:bg-[var(--border-lt)] transition-colors"
          >
            <p className="font-medium text-[var(--text-primary)]">
              Account Settings
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Email, password, and account management
            </p>
          </Link>
        </div>
      </SettingsDrawer>
    </>
  );
}
