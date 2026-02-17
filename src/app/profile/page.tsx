"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getMemberProfile,
  updateMemberProfile,
  type MemberProfile,
} from "@/lib/firestore/members";
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

  // Edit form state
  const [community, setCommunity] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

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
          <Avatar name={displayName} size={72} />
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
          /* ── Edit Mode ── */
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
          /* ── View Mode ── */
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
                      <p className="text-xl font-extrabold text-text mb-0">0</p>
                      <p className="text-[11px] text-text-muted m-0">Applications</p>
                    </div>
                    <div>
                      <p className="text-xl font-extrabold text-text mb-0">0</p>
                      <p className="text-[11px] text-text-muted m-0">Saved</p>
                    </div>
                    <div>
                      <p className="text-xl font-extrabold text-text mb-0">0</p>
                      <p className="text-[11px] text-text-muted m-0">Events</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
