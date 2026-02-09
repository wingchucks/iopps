"use client";

import { useState, useMemo } from "react";
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
} from "@/lib/firestore";
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
      {/* Banner - full width on mobile (no padding/radius) */}
      <div className="relative h-48 sm:h-56 sm:rounded-t-2xl overflow-hidden bg-gradient-to-br from-emerald-600/20 via-teal-600/20 to-cyan-600/20">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
      </div>

      {/* Profile header card */}
      <div className="relative -mt-16 px-4 sm:px-8 pb-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
          {/* Avatar - overlaps banner bottom edge */}
          <div className="relative -mt-8 sm:-mt-8 z-10">
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
                <AvatarFallback className="text-3xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
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

                {/* Location & Affiliation */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-sm">
                  {profile.location && (
                    <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {profile.location}
                    </span>
                  )}
                  {(profile.nation || profile.indigenousAffiliation) && (
                    <span className="flex items-center gap-1.5 text-[var(--accent)]">
                      <Users className="h-4 w-4" aria-hidden="true" />
                      {profile.nation || profile.indigenousAffiliation}
                      {profile.territory && ` | ${profile.territory}`}
                    </span>
                  )}
                  {profile.pronouns && (
                    <span className="text-[var(--text-muted)]">
                      ({profile.pronouns})
                    </span>
                  )}
                </div>

                {/* Availability badge */}
                {availabilityInfo && (
                  <div className="mt-2 flex justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={isOwner ? handleToggleAvailability : undefined}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${availabilityInfo.color} ${
                        isOwner
                          ? "cursor-pointer hover:opacity-80 transition-opacity"
                          : ""
                      }`}
                      aria-label={isOwner ? `Change availability status. Currently: ${availabilityInfo.label}` : availabilityInfo.label}
                    >
                      <CheckCircle className="h-3 w-3" aria-hidden="true" />
                      {availabilityInfo.label}
                    </button>
                  </div>
                )}
                {isOwner && !availabilityInfo && (
                  <div className="flex justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={handleToggleAvailability}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-dashed border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                      aria-label="Set your availability status"
                    >
                      <CheckCircle className="h-3 w-3" aria-hidden="true" />
                      Set availability
                    </button>
                  </div>
                )}

                {/* Achievement badges */}
                <div className="mt-2 flex justify-center sm:justify-start">
                  <BadgeDisplay
                    userId={profile.userId}
                    compact
                    maxDisplay={5}
                  />
                </div>
              </div>

              {/* Action buttons - icon-only on mobile, full on desktop */}
              <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                {isOwner ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[var(--card-border)] text-[var(--text-secondary)] hover:bg-[var(--border-lt)]"
                      onClick={handleShareProfile}
                      aria-label="Share profile"
                    >
                      <Share2 className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Share</span>
                    </Button>
                    <Link href={`/member/${userId}?preview=true`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-[var(--card-border)] text-[var(--text-secondary)] hover:bg-[var(--border-lt)]"
                        aria-label="Preview profile as others see it"
                      >
                        <Eye className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                        <span className="hidden sm:inline">Preview</span>
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[var(--card-border)] text-[var(--text-secondary)] hover:bg-[var(--border-lt)]"
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
                      variant="outline"
                      className="border-[var(--card-border)] hover:bg-[var(--border-lt)]"
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
