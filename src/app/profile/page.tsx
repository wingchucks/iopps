"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  getMemberProfile,
  updateMemberProfile,
  type MemberProfile,
} from "@/lib/firestore/members";
import { getSavedItems } from "@/lib/firestore/savedItems";
import { getApplications } from "@/lib/firestore/applications";
import { getUserRSVPs, type RSVP } from "@/lib/firestore/rsvps";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
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

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <ProfileContent />
      </div>
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, signOut } = useAuth();
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
  const [saving, setSaving] = useState(false);

  // Activity stats
  const [appCount, setAppCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMemberProfile(user.uid);
      setProfile(data);
      if (data) {
        setCommunity(data.community);
        setLocation(data.location);
        setBio(data.bio);
      }
      // Load activity stats and RSVPs
      const [apps, saved, userRsvps] = await Promise.all([
        getApplications(user.uid),
        getSavedItems(user.uid),
        getUserRSVPs(user.uid),
      ]);
      setAppCount(apps.length);
      setSavedCount(saved.length);
      setRsvps(userRsvps);
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
      await updateMemberProfile(user.uid, { community, location, bio });
      setProfile((prev) => (prev ? { ...prev, community, location, bio } : prev));
      setEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
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
      alert("Image must be under 5MB");
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
    } catch (err) {
      console.error("Failed to upload photo:", err);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Filter RSVPs to going/interested for the My Events section
  const activeRsvps = rsvps.filter((r) => r.status === "going" || r.status === "interested");
  const eventCount = activeRsvps.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-muted text-sm">Loading profile...</p>
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
            <p className="text-[15px] mb-2" style={{ color: "rgba(255,255,255,.7)" }}>
              {email}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge
                text="Community Member"
                color="#6EE7B7"
                bg="rgba(110,231,183,.15)"
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
            </div>
          </div>
          <div className="flex gap-2.5 mt-2 sm:mt-0">
            <Button
              small
              onClick={() => setEditing(!editing)}
              style={{ color: "#fff", borderColor: "rgba(255,255,255,.25)" }}
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

            <label className="block mb-6">
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

                {/* Quick Stats */}
                <Card>
                  <div style={{ padding: 16 }}>
                    <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">
                      ACTIVITY
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xl font-extrabold text-text mb-0">{appCount}</p>
                        <p className="text-[11px] text-text-muted m-0">Applications</p>
                      </div>
                      <div>
                        <p className="text-xl font-extrabold text-text mb-0">{savedCount}</p>
                        <p className="text-[11px] text-text-muted m-0">Saved</p>
                      </div>
                      <div>
                        <p className="text-xl font-extrabold text-text mb-0">{eventCount}</p>
                        <p className="text-[11px] text-text-muted m-0">Events</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
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
