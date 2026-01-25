"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ConnectionButton } from "@/components/social/ConnectionButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getOrCreatePeerConversation, getMemberProfile, trackMemberProfileView } from "@/lib/firestore";
import type { MemberProfile, WorkExperience, Education, PortfolioItem } from "@/lib/types";
import {
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  MessageSquare,
  Pencil,
  ExternalLink,
  Users,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import BadgeDisplay from "@/components/member/BadgeDisplay";

interface PublicProfileViewProps {
  profile: MemberProfile;
}

export default function PublicProfileView({ profile }: PublicProfileViewProps) {
  const { user, role } = useAuth();
  const router = useRouter();
  const [startingChat, setStartingChat] = useState(false);
  const isOwnProfile = user?.uid === profile.userId;

  // Track profile view on mount (only if not own profile)
  useEffect(() => {
    if (!isOwnProfile && profile.userId) {
      trackMemberProfileView({
        memberId: profile.userId,
        visitorId: user?.uid,
        visitorName: user?.displayName || undefined,
        visitorType: user ? (role === "employer" ? "employer" : "member") : "anonymous",
        referrer: typeof window !== "undefined" ? document.referrer : undefined,
      });
    }
  }, [profile.userId, isOwnProfile, user, role]);

  // Get initials for avatar fallback
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  // Get availability badge info
  const getAvailabilityInfo = (availability?: string) => {
    switch (availability) {
      case "yes":
        return { label: "Actively Looking", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
      case "maybe":
        return { label: "Open to Opportunities", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
      case "no":
        return { label: "Not Available", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" };
      default:
        return null;
    }
  };

  const availabilityInfo = getAvailabilityInfo(profile.availableForInterviews);

  // Start or open a peer conversation
  const handleStartConversation = async () => {
    if (!user) {
      toast.error("Please sign in to send messages");
      router.push("/login?redirect=" + encodeURIComponent(`/member/${profile.userId}`));
      return;
    }

    try {
      setStartingChat(true);

      // Get current user's profile for name/avatar
      const currentUserProfile = await getMemberProfile(user.uid);

      // Create or get existing conversation
      const conversation = await getOrCreatePeerConversation({
        userId1: user.uid,
        userId2: profile.userId,
        user1Name: currentUserProfile?.displayName || user.displayName || "User",
        user1Avatar: currentUserProfile?.avatarUrl || currentUserProfile?.photoURL,
        user2Name: profile.displayName,
        user2Avatar: profile.avatarUrl || profile.photoURL,
      });

      // Navigate to messages tab with conversation ID
      router.push(`/member/dashboard?tab=messages&conversation=${conversation.id}`);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error("Failed to start conversation. Please try again.");
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header Banner */}
      <div className="h-48 bg-gradient-to-br from-emerald-600/20 via-teal-600/20 to-cyan-600/20 relative">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
      </div>

      <div className="container max-w-4xl mx-auto px-4 -mt-24 pb-12">
        {/* Profile Header Card */}
        <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-sm mb-6">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <Avatar className="h-32 w-32 border-4 border-slate-800 shadow-xl">
                  <AvatarImage src={profile.avatarUrl || profile.photoURL} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                    {getInitials(profile.displayName)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                      {profile.displayName || "IOPPS Member"}
                    </h1>
                    {profile.tagline && (
                      <p className="text-slate-400 mt-1">{profile.tagline}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                      {profile.location && (
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <MapPin className="h-4 w-4" />
                          {profile.location}
                        </span>
                      )}
                      {profile.indigenousAffiliation && (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <Users className="h-4 w-4" />
                          {profile.indigenousAffiliation}
                        </span>
                      )}
                    </div>

                    {/* Availability Badge */}
                    {availabilityInfo && (
                      <div className="mt-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${availabilityInfo.color}`}
                        >
                          <CheckCircle className="h-3 w-3" />
                          {availabilityInfo.label}
                        </span>
                      </div>
                    )}

                    {/* Achievement Badges */}
                    <div className="mt-3">
                      <BadgeDisplay userId={profile.userId} compact maxDisplay={5} />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {isOwnProfile ? (
                      <Link href="/member/dashboard?tab=profile">
                        <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <ConnectionButton targetUserId={profile.userId} />
                        <Button
                          variant="outline"
                          className="border-slate-700 hover:bg-slate-800"
                          onClick={handleStartConversation}
                          disabled={startingChat}
                        >
                          {startingChat ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <MessageSquare className="h-4 w-4 mr-2" />
                          )}
                          Message
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            {profile.bio && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">About</h2>
                  <p className="text-slate-300 whitespace-pre-wrap">{profile.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Experience Section */}
            {profile.experience && profile.experience.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-emerald-400" />
                    Work Experience
                  </h2>
                  <div className="space-y-6">
                    {profile.experience.map((exp: WorkExperience) => (
                      <div key={exp.id} className="relative pl-6 border-l-2 border-slate-700">
                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-emerald-500/20 border-2 border-emerald-500" />
                        <h3 className="font-semibold text-white">{exp.position}</h3>
                        <p className="text-emerald-400">{exp.company}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(exp.startDate)} - {exp.current ? "Present" : formatDate(exp.endDate)}
                          {exp.location && (
                            <>
                              <span className="text-slate-600">|</span>
                              <MapPin className="h-3.5 w-3.5" />
                              {exp.location}
                            </>
                          )}
                        </div>
                        {exp.description && (
                          <p className="mt-2 text-slate-400 text-sm">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education Section */}
            {profile.education && profile.education.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-emerald-400" />
                    Education
                  </h2>
                  <div className="space-y-6">
                    {profile.education.map((edu: Education) => (
                      <div key={edu.id} className="relative pl-6 border-l-2 border-slate-700">
                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-teal-500/20 border-2 border-teal-500" />
                        <h3 className="font-semibold text-white">{edu.degree}</h3>
                        <p className="text-teal-400">{edu.institution}</p>
                        {edu.fieldOfStudy && (
                          <p className="text-sm text-slate-400">{edu.fieldOfStudy}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(edu.startDate)} - {edu.current ? "Present" : formatDate(edu.endDate)}
                        </div>
                        {edu.description && (
                          <p className="mt-2 text-slate-400 text-sm">{edu.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Portfolio Section */}
            {profile.portfolio && profile.portfolio.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Portfolio & Projects</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {profile.portfolio.map((item: PortfolioItem) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 hover:border-emerald-500/30 transition-colors"
                      >
                        <h3 className="font-semibold text-white">{item.title}</h3>
                        <p className="mt-1 text-sm text-slate-400 line-clamp-2">{item.description}</p>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300"
                          >
                            View Project <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs text-slate-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-3 py-1 text-sm text-emerald-300 border border-emerald-500/20"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Info (if public) */}
            {profile.messagingHandle && (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Contact</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-300">
                      <MessageSquare className="h-4 w-4 text-slate-500" />
                      <span>{profile.messagingHandle}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State - Prompt to connect */}
            {!isOwnProfile && (
              <Card className="bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-emerald-500/20">
                <CardContent className="p-6 text-center">
                  <Users className="h-10 w-10 mx-auto text-emerald-400 mb-3" />
                  <h3 className="font-semibold text-white mb-2">Connect with {profile.displayName?.split(" ")[0] || "this member"}</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Build your professional network in the Indigenous community
                  </p>
                  <ConnectionButton targetUserId={profile.userId} className="w-full" />
                </CardContent>
              </Card>
            )}

            {/* Profile Incomplete Notice (for own profile) */}
            {isOwnProfile && (!profile.bio || !profile.skills?.length || !profile.experience?.length) && (
              <Card className="bg-amber-500/10 border-amber-500/20">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-amber-400 mb-2">Complete Your Profile</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    A complete profile helps you stand out to employers and connect with the community.
                  </p>
                  <Link href="/member/dashboard?tab=profile">
                    <Button variant="outline" className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                      <Pencil className="h-4 w-4 mr-2" />
                      Complete Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
