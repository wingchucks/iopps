"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getMemberProfile,
  updateMemberProfile,
  type MemberProfile,
} from "@/lib/firestore/members";
import { getSavedItems } from "@/lib/firestore/savedItems";
import {
  getApplications,
  type Application,
  type ApplicationStatus,
} from "@/lib/firestore/applications";
import { getUserRSVPs, type RSVP } from "@/lib/firestore/rsvps";
import { getFollowerCount, getFollowingCount } from "@/lib/firestore/connections";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";

const interestLabels: Record<string, { icon: string; label: string }> = {
  jobs: { icon: "\u{1F4BC}", label: "Jobs & Careers" },
  events: { icon: "\u{1FAB6}", label: "Events & Pow Wows" },
  scholarships: { icon: "\u{1F393}", label: "Scholarships & Grants" },
  businesses: { icon: "\u{1F3EA}", label: "Indigenous Businesses" },
  schools: { icon: "\u{1F4DA}", label: "Schools & Programs" },
  livestreams: { icon: "\u{1F4FA}", label: "Livestreams & Stories" },
};

const appStatusConfig: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string }
> = {
  submitted: { label: "Submitted", color: "var(--blue)", bg: "var(--blue-soft)" },
  reviewing: { label: "Reviewing", color: "var(--gold)", bg: "var(--gold-soft)" },
  shortlisted: { label: "Shortlisted", color: "var(--teal)", bg: "rgba(13,148,136,.12)" },
  interview: { label: "Interview", color: "#8B5CF6", bg: "rgba(139,92,246,.12)" },
  offered: { label: "Offered", color: "var(--green)", bg: "var(--green-soft)" },
  rejected: { label: "Rejected", color: "var(--red)", bg: "var(--red-soft)" },
  withdrawn: { label: "Withdrawn", color: "var(--text-muted)", bg: "rgba(128,128,128,.1)" },
};

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg flex flex-col">
        <ProfileContent />
        <Footer />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [community, setCommunity] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [nation, setNation] = useState("");
  const [territory, setTerritory] = useState("");
  const [languages, setLanguages] = useState("");
  const [headline, setHeadline] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [saving, setSaving] = useState(false);

  // Activity stats
  const [apps, setApps] = useState<Application[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMemberProfile(user.uid);
      setProfile(data);
      if (data) {
        setCommunity(data.community);
        setLocation(data.location);
        setBio(data.bio);
        setNation(data.nation || "");
        setTerritory(data.territory || "");
        setLanguages(data.languages || "");
        setHeadline(data.headline || "");
        setSkillsText(data.skillsText || "");
      }
      // Load activity stats, RSVPs, and connection counts
      const [userApps, saved, userRsvps, followers, following] = await Promise.all([
        getApplications(user.uid),
        getSavedItems(user.uid),
        getUserRSVPs(user.uid),
        getFollowerCount(user.uid),
        getFollowingCount(user.uid),
      ]);
      setApps(userApps);
      setSavedCount(saved.length);
      setRsvps(userRsvps);
      setFollowerCount(followers);
      setFollowingCount(following);
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "User";
  const email = profile?.email || user?.email || "";

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateMemberProfile(user.uid, {
        community,
        location,
        bio,
        nation,
        territory,
        languages,
        headline,
        skillsText,
      });
      setProfile((prev) =>
        prev
          ? { ...prev, community, location, bio, nation, territory, languages, headline, skillsText }
          : prev
      );
      setEditing(false);
      showToast("Profile updated");
    } catch (err) {
      console.error("Failed to update profile:", err);
      showToast("Failed to update profile. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5MB", "error");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const storageRef = ref(storage, `avatars/${user.uid}.${ext}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      await updateMemberProfile(user.uid, { photoURL });
      setProfile((prev) => (prev ? { ...prev, photoURL } : prev));
      showToast("Photo updated");
    } catch (err) {
      console.error("Failed to upload photo:", err);
      showToast("Failed to upload photo. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  // Filter RSVPs to going/interested for the My Events section
  const activeRsvps = rsvps.filter((r) => r.status === "going" || r.status === "interested");
  const eventCount = activeRsvps.length;

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto">
        <div className="skeleton h-[200px] rounded-b-3xl mb-6" />
        <div className="px-4 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <div className="skeleton h-6 w-24 rounded" />
              <div className="skeleton h-16 rounded-xl" />
              <div className="skeleton h-[120px] rounded-2xl" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="skeleton h-6 w-24 rounded" />
              <div className="skeleton h-10 w-3/4 rounded-xl" />
              <div className="skeleton h-[100px] rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Hero Header */}
      <div
        className="rounded-b-3xl"
        style={{
          background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 50%, var(--teal) 100%)",
          padding: "clamp(24px, 4vw, 40px) clamp(16px, 4vw, 48px)",
        }}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center">
          {/* Avatar with upload */}
          <div className="relative group">
            <Avatar name={displayName} size={72} src={profile?.photoURL} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{ borderRadius: 16 }}
            >
              <span className="text-white text-xs font-semibold">
                {uploading ? "..." : "Edit"}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <h1 className="text-xl sm:text-[28px] font-extrabold text-white mb-1">
              {displayName}
            </h1>
            <p className="text-[15px] mb-1" style={{ color: "rgba(255,255,255,.7)" }}>
              {email}
            </p>
            {profile?.headline && (
              <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,.55)" }}>
                {profile.headline}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge
                text={profile?.role === "admin" ? "Admin" : profile?.role === "moderator" ? "Moderator" : profile?.orgRole === "owner" || profile?.orgRole === "admin" ? "Organization" : "Community Member"}
                color={profile?.role === "admin" ? "#F59E0B" : profile?.role === "moderator" ? "#8B5CF6" : "#6EE7B7"}
                bg={profile?.role === "admin" ? "rgba(245,158,11,.15)" : profile?.role === "moderator" ? "rgba(139,92,246,.15)" : "rgba(110,231,183,.15)"}
                small
              />
              {profile?.community && (
                <Badge
                  text={profile.community}
                  color="#F5D78E"
                  bg="rgba(245,215,142,.15)"
                  small
                />
              )}
              {profile?.openToWork && (
                <Badge
                  text="Open to Work"
                  color="var(--green)"
                  bg="rgba(34,197,94,.15)"
                  small
                />
              )}
            </div>
          </div>
          <div className="flex gap-2.5 mt-2 sm:mt-0">
            <Button
              small
              onClick={() => setEditing(!editing)}
              style={{ color: "#fff", borderColor: "rgba(255,255,255,.25)", background: "rgba(255,255,255,.12)" }}
            >
              {editing ? "Cancel" : "Edit Profile"}
            </Button>
            <Button
              small
              onClick={async () => { await signOut(); router.push("/"); }}
              style={{ color: "#DC2626", borderColor: "rgba(220,38,38,.3)", background: "rgba(220,38,38,.1)" }}
            >
              Sign Out
            </Button>
          </div>
        </div>
        {profile?.location && (
          <p className="text-sm mt-3" style={{ color: "rgba(255,255,255,.5)" }}>
            &#128205; {profile.location}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-6 md:px-12">
        {editing ? (
          /* -- Edit Mode -- */
          <div>
            <h3 className="text-lg font-bold text-text mb-4">Edit Profile</h3>

            <label className="block mb-4">
              <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                Community / First Nation
              </span>
              <input
                type="text"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                placeholder="e.g. Muskoday First Nation"
              />
            </label>

            <label className="block mb-4">
              <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                Location
              </span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                placeholder="e.g. Saskatoon, SK"
              />
            </label>

            <label className="block mb-4">
              <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                Bio
              </span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal resize-none"
                placeholder="A few words about yourself..."
              />
            </label>

            <label className="block mb-4">
              <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                Nation / People
              </span>
              <input
                type="text"
                value={nation}
                onChange={(e) => setNation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                placeholder="e.g., Cree, Anishinaabe, M&eacute;tis"
              />
            </label>

            <label className="block mb-4">
              <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                Territory / Homeland
              </span>
              <input
                type="text"
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                placeholder="e.g., Treaty 6, M&eacute;tis Nation Region 3"
              />
            </label>

            <label className="block mb-4">
              <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                Languages Spoken
              </span>
              <input
                type="text"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                placeholder="e.g., Cree, Michif, English, French"
              />
            </label>

            <label className="block mb-4">
              <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                Professional Headline
              </span>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                placeholder="e.g., Software Developer | Treaty 6"
              />
            </label>

            <label className="block mb-6">
              <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                Skills
              </span>
              <input
                type="text"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                placeholder="e.g., Project Management, Web Development, Cree Language"
              />
            </label>

            <div className="flex gap-3">
              <Button
                onClick={() => setEditing(false)}
                style={{ borderRadius: 14, padding: "12px 24px" }}
              >
                Cancel
              </Button>
              <Button
                primary
                onClick={handleSave}
                style={{
                  background: "var(--teal)",
                  borderRadius: 14,
                  padding: "12px 24px",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          /* -- View Mode -- */
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div>
                <h3 className="text-lg font-bold text-text mb-2.5">About</h3>
                {profile?.bio ? (
                  <p className="text-sm text-text-sec leading-relaxed mb-5">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-sm text-text-muted italic mb-5">
                    No bio added yet. Click &quot;Edit Profile&quot; to add one.
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
                          {profile?.location || "No location set"}
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm">&#127963;&#65039;</span>
                        <span className="text-sm text-text-sec">
                          {profile?.community || "No community set"}
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm">&#128231;</span>
                        <span className="text-sm text-text-sec">{email}</span>
                      </div>
                      {profile?.nation && (
                        <div className="flex gap-2 items-center">
                          <span className="text-sm">&#127758;</span>
                          <span className="text-sm text-text-sec">{profile.nation}</span>
                        </div>
                      )}
                      {profile?.territory && (
                        <div className="flex gap-2 items-center">
                          <span className="text-sm">&#128506;&#65039;</span>
                          <span className="text-sm text-text-sec">{profile.territory}</span>
                        </div>
                      )}
                      {profile?.languages && (
                        <div className="flex gap-2 items-center">
                          <span className="text-sm">&#128172;</span>
                          <span className="text-sm text-text-sec">{profile.languages}</span>
                        </div>
                      )}
                      {profile?.skillsText && (
                        <div className="flex gap-2 items-center">
                          <span className="text-sm">&#128736;&#65039;</span>
                          <span className="text-sm text-text-sec">{profile.skillsText}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column */}
              <div>
                <h3 className="text-lg font-bold text-text mb-3">Interests</h3>
                {profile?.interests && profile.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {profile.interests.map((id) => {
                      const info = interestLabels[id];
                      if (!info) return null;
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
                          <span>{info.icon}</span>
                          {info.label}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted italic mb-5">
                    No interests selected yet.
                  </p>
                )}

                {/* Connections */}
                <Card className="mb-5">
                  <div style={{ padding: 16 }}>
                    <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">
                      CONNECTIONS
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      {user && (
                        <>
                          <Link
                            href={`/members/${user.uid}/followers`}
                            className="no-underline hover:opacity-80 transition-opacity"
                          >
                            <p className="text-xl font-extrabold text-text mb-0">{followerCount}</p>
                            <p className="text-[11px] text-text-muted m-0">Followers</p>
                          </Link>
                          <Link
                            href={`/members/${user.uid}/following`}
                            className="no-underline hover:opacity-80 transition-opacity"
                          >
                            <p className="text-xl font-extrabold text-text mb-0">{followingCount}</p>
                            <p className="text-[11px] text-text-muted m-0">Following</p>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Quick Stats */}
                <Card>
                  <div style={{ padding: 16 }}>
                    <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">
                      ACTIVITY
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xl font-extrabold text-text mb-0">{apps.length}</p>
                        <p className="text-[11px] text-text-muted m-0">Applications</p>
                      </div>
                      <Link href="/saved" className="no-underline hover:opacity-80 transition-opacity">
                        <p className="text-xl font-extrabold text-text mb-0">{savedCount}</p>
                        <p className="text-[11px] text-text-muted m-0">Saved</p>
                      </Link>
                      <div>
                        <p className="text-xl font-extrabold text-text mb-0">{eventCount}</p>
                        <p className="text-[11px] text-text-muted m-0">Events</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Open to Work Banner */}
            {profile?.openToWork && (
              <div
                className="mt-6 rounded-2xl p-4 flex items-center justify-between"
                style={{
                  background: "rgba(34,197,94,.06)",
                  border: "1.5px solid rgba(34,197,94,.15)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ width: 40, height: 40, background: "rgba(34,197,94,.12)" }}
                  >
                    <span className="text-lg">&#9989;</span>
                  </span>
                  <div>
                    <p className="text-sm font-bold m-0" style={{ color: "var(--green)" }}>
                      Open to Work
                    </p>
                    <p className="text-xs text-text-muted m-0">
                      Employers can see you&apos;re looking for opportunities
                    </p>
                  </div>
                </div>
                <Link
                  href="/settings/career"
                  className="text-xs font-semibold no-underline hover:underline"
                  style={{ color: "var(--teal)" }}
                >
                  Edit &#8594;
                </Link>
              </div>
            )}

            {/* Looking For Section */}
            {profile?.openToWork && (profile?.targetRoles?.length || profile?.salaryRange || profile?.workPreference) && (
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
                    {profile.salaryRange && (
                      <div>
                        <p className="text-xs font-bold text-text-muted mb-1 tracking-[1px]">
                          SALARY RANGE
                        </p>
                        <p className="text-sm text-text m-0">
                          ${profile.salaryRange.min.toLocaleString()} &ndash; ${profile.salaryRange.max.toLocaleString()}
                        </p>
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

            {/* Skills Section */}
            {profile?.skills && profile.skills.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-text mb-3">Skills</h3>
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

            {/* Education Section */}
            {profile?.education && profile.education.length > 0 && (
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

            {/* My Applications Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-text m-0">My Applications</h3>
                {apps.length > 0 && (
                  <Link
                    href="/applications"
                    className="text-xs text-teal font-semibold no-underline hover:underline"
                  >
                    View All &#8594;
                  </Link>
                )}
              </div>
              {apps.length === 0 ? (
                <Card>
                  <div style={{ padding: 24 }} className="text-center">
                    <p className="text-3xl mb-2">&#128188;</p>
                    <p className="text-sm text-text-muted">
                      No applications yet. Browse the{" "}
                      <Link href="/feed" className="text-teal font-semibold no-underline hover:underline">
                        feed
                      </Link>{" "}
                      to find job opportunities.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col gap-2">
                  {apps.slice(0, 3).map((app) => {
                    const cfg = appStatusConfig[app.status] || appStatusConfig.submitted;
                    return (
                      <Link key={app.id} href="/applications" className="no-underline">
                        <Card className="hover:border-teal transition-colors">
                          <div style={{ padding: 14 }} className="flex items-center gap-3">
                            <div
                              className="flex items-center justify-center rounded-xl flex-shrink-0"
                              style={{
                                width: 40,
                                height: 40,
                                background: "rgba(13,148,136,.08)",
                              }}
                            >
                              <span className="text-base">&#128188;</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-text mb-0.5 truncate">
                                {app.postTitle}
                              </p>
                              <p className="text-xs text-text-muted m-0">{app.orgName}</p>
                            </div>
                            <Badge
                              text={cfg.label}
                              color={cfg.color}
                              bg={cfg.bg}
                              small
                            />
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                  {apps.length > 3 && (
                    <Link
                      href="/applications"
                      className="text-xs text-teal font-semibold no-underline hover:underline text-center py-2"
                    >
                      +{apps.length - 3} more applications
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* My Events Section */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-text mb-3">My Events</h3>
              {activeRsvps.length === 0 ? (
                <Card>
                  <div style={{ padding: 24 }} className="text-center">
                    <p className="text-3xl mb-2">&#127914;</p>
                    <p className="text-sm text-text-muted">
                      No upcoming events yet. Browse the{" "}
                      <Link href="/feed" className="text-teal font-semibold no-underline hover:underline">
                        feed
                      </Link>{" "}
                      to find events to attend.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeRsvps.map((rsvp) => {
                    // Build slug from postId (remove "event-" prefix)
                    const slug = rsvp.postId.startsWith("event-")
                      ? rsvp.postId.slice(6)
                      : rsvp.postId;
                    return (
                      <Link
                        key={rsvp.id}
                        href={`/events/${slug}`}
                        className="no-underline"
                      >
                        <Card className="hover:border-teal transition-colors">
                          <div
                            style={{ padding: 16 }}
                            className="flex items-center gap-4"
                          >
                            <div
                              className="flex items-center justify-center rounded-xl flex-shrink-0"
                              style={{
                                width: 48,
                                height: 48,
                                background: "rgba(13,148,136,.08)",
                              }}
                            >
                              <span className="text-xl">&#127914;</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-text mb-0.5 truncate">
                                {rsvp.postTitle}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                                {rsvp.postDate && <span>&#128197; {rsvp.postDate}</span>}
                                {rsvp.postLocation && <span>&#128205; {rsvp.postLocation}</span>}
                              </div>
                            </div>
                            <Badge
                              text={rsvp.status === "going" ? "Going" : "Interested"}
                              color={rsvp.status === "going" ? "var(--green)" : "var(--gold)"}
                              bg={rsvp.status === "going" ? "var(--green-soft)" : "var(--gold-soft)"}
                              small
                            />
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
