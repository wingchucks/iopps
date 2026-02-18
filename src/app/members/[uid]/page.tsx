"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { getMemberProfile, type MemberProfile } from "@/lib/firestore/members";
import { getFollowerCount, getFollowingCount } from "@/lib/firestore/connections";
import {
  getEndorsements,
  calculateTrustScore,
  type Endorsement,
} from "@/lib/firestore/endorsements";
import EndorsementCard from "@/components/EndorsementCard";
import FollowButton from "@/components/FollowButton";
import ReportButton from "@/components/ReportButton";
import Toast from "@/components/Toast";

const interestLabels: Record<string, { icon: string; label: string }> = {
  jobs: { icon: "\u{1F4BC}", label: "Jobs & Careers" },
  events: { icon: "\u{1FAB6}", label: "Events & Pow Wows" },
  scholarships: { icon: "\u{1F393}", label: "Scholarships & Grants" },
  businesses: { icon: "\u{1F3EA}", label: "Indigenous Businesses" },
  schools: { icon: "\u{1F4DA}", label: "Schools & Programs" },
  livestreams: { icon: "\u{1F4FA}", label: "Livestreams & Stories" },
};

export default function MemberProfilePage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <MemberProfileContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function MemberProfileContent() {
  const params = useParams();
  const uid = params.uid as string;
  const { user } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [trustScore, setTrustScore] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [data, followers, following, endorse, score] = await Promise.all([
          getMemberProfile(uid),
          getFollowerCount(uid),
          getFollowingCount(uid),
          getEndorsements(uid),
          calculateTrustScore(uid),
        ]);
        setProfile(data);
        setFollowerCount(followers);
        setFollowingCount(following);
        setEndorsements(endorse);
        setTrustScore(score);
      } catch (err) {
        console.error("Failed to load member profile:", err);
      } finally {
        setLoading(false);
      }
    }
    if (uid) load();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-muted text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-10 md:px-10 text-center">
        <p className="text-text-muted text-sm mb-4">Member not found.</p>
        <Link
          href="/members"
          className="text-teal text-sm font-semibold no-underline hover:underline"
        >
          Back to directory
        </Link>
      </div>
    );
  }

  const isOwnProfile = user?.uid === profile.uid;

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Back link */}
      <div className="px-4 pt-4 md:px-10">
        <Link
          href="/members"
          className="text-teal text-sm font-semibold no-underline hover:underline"
        >
          &#8592; Back to directory
        </Link>
      </div>

      {/* Hero Header */}
      <div
        className="rounded-b-3xl mt-3"
        style={{
          background:
            "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 50%, var(--teal) 100%)",
          padding: "clamp(24px, 4vw, 40px) clamp(16px, 4vw, 48px)",
        }}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center">
          <Avatar
            name={profile.displayName}
            size={72}
            src={profile.photoURL}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-[28px] font-extrabold text-white mb-1">
                {profile.displayName}
              </h1>
              {trustScore > 0 && (
                <span
                  className="flex items-center gap-1 text-xs font-bold rounded-lg"
                  style={{
                    padding: "4px 10px",
                    background: "rgba(217,119,6,.2)",
                    color: "#FBBF24",
                    border: "1px solid rgba(217,119,6,.3)",
                  }}
                >
                  &#9733; {trustScore.toFixed(1)}
                </span>
              )}
              {profile.openToWork && (
                <Badge
                  text="Open to Work"
                  color="#22C55E"
                  bg="rgba(34,197,94,.2)"
                  small
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge
                text={profile.role === "admin" ? "Admin" : profile.role === "moderator" ? "Moderator" : profile.orgRole === "owner" || profile.orgRole === "admin" ? "Organization" : "Community Member"}
                color={profile.role === "admin" ? "#F59E0B" : profile.role === "moderator" ? "#8B5CF6" : "#6EE7B7"}
                bg={profile.role === "admin" ? "rgba(245,158,11,.15)" : profile.role === "moderator" ? "rgba(139,92,246,.15)" : "rgba(110,231,183,.15)"}
                small
              />
              {profile.community && (
                <Badge
                  text={profile.community}
                  color="#F5D78E"
                  bg="rgba(245,215,142,.15)"
                  small
                />
              )}
            </div>
          </div>
          <div className="flex gap-2.5 mt-2 sm:mt-0">
            {isOwnProfile ? (
              <Link href="/profile">
                <Button
                  small
                  style={{
                    color: "#fff",
                    borderColor: "rgba(255,255,255,.25)",
                  }}
                >
                  Edit Profile
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/messages">
                  <Button
                    small
                    primary
                    style={{
                      background: "var(--teal)",
                    }}
                  >
                    Send Message
                  </Button>
                </Link>
                <FollowButton
                  targetUserId={profile.uid}
                  targetUserName={profile.displayName}
                  small
                  onCountChange={(delta) =>
                    setFollowerCount((c) => Math.max(0, c + delta))
                  }
                />
              </>
            )}
          </div>
          {!isOwnProfile && (
            <div className="mt-2 sm:mt-0 ml-auto" style={{ color: "rgba(255,255,255,.6)" }}>
              <ReportButton
                targetType="member"
                targetId={profile.uid}
                targetTitle={profile.displayName}
              />
            </div>
          )}
        </div>
        {profile.location && (
          <p
            className="text-sm mt-3"
            style={{ color: "rgba(255,255,255,.5)" }}
          >
            &#128205; {profile.location}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div>
            <h3 className="text-lg font-bold text-text mb-2.5">About</h3>
            {profile.bio ? (
              <p className="text-sm text-text-sec leading-relaxed mb-5">
                {profile.bio}
              </p>
            ) : (
              <p className="text-sm text-text-muted italic mb-5">
                No bio added yet.
              </p>
            )}

            {/* Details */}
            <Card className="mb-5">
              <div style={{ padding: 16 }}>
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">
                  DETAILS
                </p>
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2 items-center">
                    <span className="text-sm">&#128205;</span>
                    <span className="text-sm text-text-sec">
                      {profile.location || "No location set"}
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm">&#127963;&#65039;</span>
                    <span className="text-sm text-text-sec">
                      {profile.community || "No community set"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column */}
          <div>
            <h3 className="text-lg font-bold text-text mb-3">Interests</h3>
            {profile.interests && profile.interests.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-5">
                {profile.interests.map((id) => {
                  const info = interestLabels[id];
                  const label = info ? info.label : id;
                  const icon = info ? info.icon : "";
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1.5 rounded-xl text-[13px] font-semibold text-teal"
                      style={{
                        padding: "8px 14px",
                        background: "rgba(13,148,136,.06)",
                        border: "1.5px solid rgba(13,148,136,.1)",
                      }}
                    >
                      {icon && <span>{icon}</span>}
                      {label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted italic mb-5">
                No interests listed.
              </p>
            )}

            {/* Connections */}
            <Card className="mb-5">
              <div style={{ padding: 16 }}>
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">
                  CONNECTIONS
                </p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <Link
                    href={`/members/${profile.uid}/followers`}
                    className="no-underline hover:opacity-80 transition-opacity"
                  >
                    <p className="text-xl font-extrabold text-text mb-0">
                      {followerCount}
                    </p>
                    <p className="text-[11px] text-text-muted m-0">Followers</p>
                  </Link>
                  <Link
                    href={`/members/${profile.uid}/following`}
                    className="no-underline hover:opacity-80 transition-opacity"
                  >
                    <p className="text-xl font-extrabold text-text mb-0">
                      {followingCount}
                    </p>
                    <p className="text-[11px] text-text-muted m-0">Following</p>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Member Since */}
            <Card>
              <div style={{ padding: 16 }}>
                <p className="text-xs font-bold text-text-muted mb-2 tracking-[1px]">
                  MEMBER INFO
                </p>
                <p className="text-sm text-text-sec m-0">
                  Community member on IOPPS
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Looking For Section (visible if openToWork) */}
        {profile.openToWork && (profile.targetRoles?.length || profile.workPreference) && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-text mb-3">Looking For</h3>
            <Card>
              <div style={{ padding: 16 }} className="flex flex-col gap-3">
                {profile.targetRoles && profile.targetRoles.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-text-muted mb-2 tracking-[1px]">
                      TARGET ROLES
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.targetRoles.map((role) => (
                        <span
                          key={role}
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            background: "rgba(13,148,136,.08)",
                            color: "var(--teal)",
                            border: "1px solid rgba(13,148,136,.15)",
                          }}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.workPreference && (
                  <div>
                    <p className="text-xs font-bold text-text-muted mb-1 tracking-[1px]">
                      WORK PREFERENCE
                    </p>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
                      style={{
                        background: "var(--navy)",
                        color: "#fff",
                      }}
                    >
                      {profile.workPreference}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Skills & Expertise */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-text mb-3">Skills &amp; Expertise</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: "rgba(13,148,136,.08)",
                    color: "var(--teal)",
                    border: "1px solid rgba(13,148,136,.15)",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Resume */}
        {profile.resumeUrl && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-text mb-3">Resume</h3>
            <Card>
              <div style={{ padding: 16 }} className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{ width: 40, height: 40, background: "rgba(13,148,136,.08)" }}
                >
                  <span className="text-base">&#128196;</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text mb-0.5 truncate">
                    {profile.resumeFileName || "Resume"}
                  </p>
                  <p className="text-xs text-text-muted m-0">
                    Available for download
                  </p>
                </div>
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="no-underline"
                >
                  <Button
                    small
                    style={{
                      background: "var(--teal)",
                      color: "#fff",
                    }}
                  >
                    Download
                  </Button>
                </a>
              </div>
            </Card>
          </div>
        )}

        {/* Education */}
        {profile.education && profile.education.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-bold text-text mb-3">Education</h3>
            <div className="flex flex-col gap-2">
              {profile.education.map((edu, i) => (
                <Card key={i}>
                  <div style={{ padding: 14 }} className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center rounded-xl flex-shrink-0"
                      style={{ width: 40, height: 40, background: "rgba(13,148,136,.08)" }}
                    >
                      <span className="text-base">&#127891;</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text mb-0.5 truncate">
                        {edu.degree} in {edu.field}
                      </p>
                      <p className="text-xs text-text-muted m-0">
                        {edu.school} &middot; {edu.year}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Endorsements Section */}
        {(endorsements.length > 0 || isOwnProfile) && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text">Endorsements</h3>
              {endorsements.length > 0 && (
                <Link
                  href={`/members/${profile.uid}/endorsements`}
                  className="text-sm font-semibold no-underline hover:underline"
                  style={{ color: "#D97706" }}
                >
                  View All ({endorsements.length})
                </Link>
              )}
            </div>

            {endorsements.length === 0 && isOwnProfile ? (
              <Card>
                <div style={{ padding: 24 }} className="text-center">
                  <p className="text-2xl mb-2" style={{ color: "#D97706" }}>
                    &#9733;
                  </p>
                  <p className="text-sm font-bold text-text mb-1">
                    Get your first endorsement
                  </p>
                  <p className="text-xs text-text-muted mb-3">
                    Share your profile link with colleagues to receive
                    endorsements
                  </p>
                  <Button
                    small
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/members/${profile.uid}/endorsements`
                      );
                      setToast({
                        message: "Link copied!",
                        type: "success",
                      });
                    }}
                    style={{
                      background: "rgba(217,119,6,.1)",
                      color: "#D97706",
                      border: "1.5px solid rgba(217,119,6,.2)",
                    }}
                  >
                    Request Endorsement
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {endorsements.slice(0, 3).map((e) => (
                    <EndorsementCard key={e.id} endorsement={e} />
                  ))}
                </div>
                {isOwnProfile && (
                  <div className="mt-3 text-center">
                    <Button
                      small
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/members/${profile.uid}/endorsements`
                        );
                        setToast({
                          message: "Link copied!",
                          type: "success",
                        });
                      }}
                      style={{
                        background: "rgba(217,119,6,.1)",
                        color: "#D97706",
                        border: "1.5px solid rgba(217,119,6,.2)",
                      }}
                    >
                      Request Endorsement
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
