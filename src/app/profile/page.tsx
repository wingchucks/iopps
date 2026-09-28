"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";
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

import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { getPublicAccountTypeLabel } from "@/lib/account-labels";

import { interestOptions, interestLabels } from "@/lib/constants/interests";

type ProfileSaveError = { message: string; field?: string };

// Never render SDK messages: they can contain document paths and field values.
function profileSaveError(error: unknown): ProfileSaveError {
  const details = error && typeof error === "object" ? error as { code?: string; message?: string } : {};
  const labels: Record<string, string> = {
    community: "Community / First Nation", location: "Location", bio: "Bio",
    nation: "Nation / People", territory: "Territory / Homeland", languages: "Languages Spoken",
    headline: "Professional Headline", skillsText: "Skills", skills: "Skills", interests: "Interests",
  };
  const field = details.code === "invalid-argument" && typeof details.message === "string"
    ? details.message.match(/found in field ([A-Za-z]+)(?:[.\s])/i)?.[1] : undefined;
  if (field && Object.hasOwn(labels, field)) {
    return { field: field === "skills" ? "skillsText" : field, message: `${labels[field]} could not be saved. Check this field and try again. Your edits are still here.` };
  }
  const recovery: Record<string, string> = {
    "permission-denied": "This profile update is not permitted. Copy your edits before signing in again; contact support if it continues.",
    unauthenticated: "Sign in again to save your profile. Copy your edits before leaving this page.",
    unavailable: "The profile service is unavailable. Check your connection and try again.",
    "not-found": "Your member profile was not found. Copy your edits before completing profile setup at /setup.",
  };
  const message = typeof details.code === "string" && Object.hasOwn(recovery, details.code)
    ? recovery[details.code] : "Your profile could not be saved. Please try again.";
  return { message: `${message} Your edits are still here.` };
}

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
  const [editSection, setEditSection] = useState<string | null>(null);
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
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ProfileSaveError | null>(null);

  const toggleInterest = (id: string) => {
    setEditInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Activity stats
  const [apps, setApps] = useState<Application[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const isCurrent = () => !controller.signal.aborted && auth.currentUser === user;
    const loadProfile = async () => {
      if (!isCurrent()) return;
      try {
        const data = await getMemberProfile(user.uid, controller.signal);
        if (!isCurrent()) return;
        // Redirect org users to the org dashboard profile
        if (data?.orgId) {
          router.replace("/org/dashboard?tab=Edit%20Profile&section=Identity");
          return;
        }
        setProfile(data);
        if (data) {
          // Older/partially completed members can omit these optional fields.
          // Never copy undefined into the form and then into a Firestore update.
          setCommunity(data.community ?? "");
          setLocation(data.location ?? "");
          setBio(data.bio ?? "");
          setNation(data.nation || "");
          setTerritory(data.territory || "");
          setLanguages(data.languages || "");
          setHeadline(data.headline || "");
          setSkillsText(data.skillsText || "");
          setEditInterests(data.interests || []);
        }
        // Load own activity stats and RSVPs
        const [userApps, saved, userRsvps] = await Promise.all([
          getApplications(user.uid),
          getSavedItems(user.uid),
          getUserRSVPs(user.uid),

        ]);
        if (!isCurrent()) return;
        setApps(userApps);
        setSavedCount(saved.length);
        setRsvps(userRsvps);

      } catch (err) {
        if (isCurrent()) console.error("Failed to load profile:", err);
      } finally {
        if (isCurrent()) setLoading(false);
      }
    };
    void loadProfile();
    return () => controller.abort();
  }, [router, user]);

  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "User";
  const email = profile?.email || user?.email || "";

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
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
        interests: editInterests,
      });
      setProfile((prev) =>
        prev
          ? { ...prev, community, location, bio, nation, territory, languages, headline, skillsText, skills: skillsText.split(",").map((skill) => skill.trim()).filter(Boolean), interests: editInterests }
          : prev
      );
      setEditing(false);
      setEditSection(null);
      showToast("Profile updated");
    } catch (err) {
      const failure = profileSaveError(err);
      setSaveError(failure);
      showToast(failure.message, "error");
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
              aria-label="Edit profile photo"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 transition-opacity cursor-pointer"
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
                text={getPublicAccountTypeLabel(profile?.role, profile?.orgRole)}
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
                  color="#6EE7B7"
                  bg="rgba(34,197,94,.15)"
                  small
                />
              )}
            </div>
          </div>
          <div className="flex gap-2.5 mt-2 sm:mt-0">
            <Button className="brand-button"
              small
              onClick={() => {
                if (editing) {
                  setEditing(false);
                  setEditSection(null);
                } else {
                  setEditing(true);
                  setEditSection("identity");
                }
              }}
              style={{ color: "var(--button-gradient-soft-text)", borderColor: "rgba(255,255,255,.25)", background: "var(--button-gradient-soft)" }}
            >
              {editing ? "Cancel" : "Edit Profile"}
            </Button>
            <Button
              small
              onClick={async () => { await signOut(); router.push("/"); }}
              style={{ color: "#FECACA", borderColor: "rgba(220,38,38,.3)", background: "rgba(220,38,38,.1)" }}
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
          /* -- Edit Mode (Accordion Sections) -- */
          <div>
            <h3 className="text-lg font-bold text-text mb-4">Edit Profile</h3>
            {saveError && <p id="profile-save-error" role="alert" className="text-sm text-text mb-4">{saveError.message}</p>}

            <div className="flex flex-col gap-3 mb-6">
              {/* Section: Identity & Heritage */}
              <EditSection
                title="Identity & Heritage"
                icon="&#127758;"
                isOpen={editSection === "identity"}
                onToggle={() => setEditSection(editSection === "identity" ? null : "identity")}
              >
                <label className="block mb-4">
                  <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                    Nation / People
                  </span>
                  <input
                    type="text"
                    value={nation}
                    aria-invalid={saveError?.field === "nation"}
                    aria-describedby={saveError?.field === "nation" ? "profile-save-error" : undefined}
                    onChange={(e) => setNation(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                    placeholder="e.g. Cree, Anishinaabe, Metis"
                  />
                </label>
                <label className="block mb-4">
                  <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                    Community / First Nation
                  </span>
                  <input
                    type="text"
                    value={community}
                    aria-invalid={saveError?.field === "community"}
                    aria-describedby={saveError?.field === "community" ? "profile-save-error" : undefined}
                    onChange={(e) => setCommunity(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                    placeholder="e.g. Muskoday First Nation"
                  />
                </label>
                <label className="block mb-4">
                  <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                    Territory / Homeland
                  </span>
                  <input
                    type="text"
                    value={territory}
                    aria-invalid={saveError?.field === "territory"}
                    aria-describedby={saveError?.field === "territory" ? "profile-save-error" : undefined}
                    onChange={(e) => setTerritory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                    placeholder="e.g. Treaty 6, Metis Nation Region 3"
                  />
                </label>
                <label className="block mb-4">
                  <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                    Location
                  </span>
                  <input
                    type="text"
                    value={location}
                    aria-invalid={saveError?.field === "location"}
                    aria-describedby={saveError?.field === "location" ? "profile-save-error" : undefined}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                    placeholder="e.g. Saskatoon, SK"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                    Languages Spoken
                  </span>
                  <input
                    type="text"
                    value={languages}
                    aria-invalid={saveError?.field === "languages"}
                    aria-describedby={saveError?.field === "languages" ? "profile-save-error" : undefined}
                    onChange={(e) => setLanguages(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                    placeholder="e.g. Cree, Michif, English, French"
                  />
                </label>
              </EditSection>

              {/* Section: About You */}
              <EditSection
                title="About You"
                icon="&#128100;"
                isOpen={editSection === "about"}
                onToggle={() => setEditSection(editSection === "about" ? null : "about")}
              >
                <label className="block mb-4">
                  <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                    Professional Headline
                  </span>
                  <input
                    type="text"
                    value={headline}
                    aria-invalid={saveError?.field === "headline"}
                    aria-describedby={saveError?.field === "headline" ? "profile-save-error" : undefined}
                    onChange={(e) => {
                      if (e.target.value.length <= 80) setHeadline(e.target.value);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                    placeholder="e.g. Software Developer | Treaty 6"
                  />
                  <span className="text-xs text-text-muted mt-1 block text-right">{headline.length}/80</span>
                </label>
                <label className="block mb-4">
                  <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                    Bio
                  </span>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    aria-invalid={saveError?.field === "bio"}
                    aria-describedby={saveError?.field === "bio" ? "profile-bio-count profile-save-error" : "profile-bio-count"}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal resize-none"
                    placeholder="A few words about yourself..."
                  />
                  <span id="profile-bio-count" aria-live="polite" className="text-xs text-text-muted mt-1 block text-right">
                    {`${bio.length} characters`}
                  </span>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-text-sec mb-1.5 block">
                    Skills
                  </span>
                  <input
                    type="text"
                    value={skillsText}
                    aria-invalid={saveError?.field === "skillsText"}
                    aria-describedby={saveError?.field === "skillsText" ? "profile-save-error" : undefined}
                    onChange={(e) => setSkillsText(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
                    placeholder="e.g. Project Management, Web Development"
                  />
                  <span className="text-xs text-text-muted mt-1 block">Comma-separated</span>
                </label>
              </EditSection>

              {/* Section: Interests */}
              <EditSection
                title="Interests"
                icon="&#9733;"
                isOpen={editSection === "interests"}
                onToggle={() => setEditSection(editSection === "interests" ? null : "interests")}
              >
                <p className="text-sm text-text-muted mb-4">
                  Select categories to personalize your feed.
                </p>
                <div role="group" aria-label="Interests"
                  aria-describedby={saveError?.field === "interests" ? "profile-save-error" : undefined}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {interestOptions.map((opt) => {
                    const selected = editInterests.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleInterest(opt.id)}
                        className="flex items-center gap-3.5 rounded-xl cursor-pointer text-left transition-all duration-200 bg-card"
                        style={{
                          padding: "14px 16px",
                          border: selected
                            ? "2px solid var(--teal)"
                            : "2px solid var(--border)",
                          boxShadow: selected ? "0 0 0 3px rgba(13,148,136,.08)" : "none",
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                          style={{
                            background: selected ? "rgba(13,148,136,.1)" : "rgba(128,128,128,.06)",
                          }}
                        >
                          <span className="text-xl">{opt.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-sm font-semibold m-0 transition-colors duration-200"
                            style={{ color: selected ? "var(--teal)" : "var(--text)" }}
                          >
                            {opt.label}
                          </p>
                          <p className="text-xs text-text-muted m-0 mt-0.5">{opt.desc}</p>
                        </div>
                        {selected && (
                          <svg className="ml-auto flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </EditSection>
            </div>

            <div className="flex gap-3 mb-6">
              <Button
                onClick={() => { setEditing(false); setEditSection(null); }}
                style={{ borderRadius: 14, padding: "12px 24px" }}
              >
                Cancel
              </Button>
              <Button className="brand-button"
                primary
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: "var(--button-gradient)",
                  borderRadius: 14,
                  padding: "12px 24px",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            {/* Quick Links — Edit Mode */}
            <QuickLinks resumeFileName={profile?.resumeFileName} openToWork={profile?.openToWork} />
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

                {/* Quick Stats */}
                <Card>
                  <div style={{ padding: 16 }}>
                    <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">
                      ACTIVITY
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <Link href="/applications" className="no-underline hover:opacity-80 transition-opacity">
                        <p className="text-xl font-extrabold text-text mb-0">{apps.length}</p>
                        <p className="text-[11px] text-text-muted m-0">Applications</p>
                      </Link>
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
                    <p className="text-sm font-bold m-0" style={{ color: "var(--success-text)" }}>
                      Open to Work
                    </p>
                    <p className="text-xs text-text-muted m-0">
                      Your career preferences are saved for your job search
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
                          ${profile.salaryRange.min.toLocaleString("en-CA")} &ndash; ${profile.salaryRange.max.toLocaleString("en-CA")} CAD per year
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
                      No applications yet. When you apply for a job on IOPPS, you can follow it here.
                    </p>
                    <Link href="/jobs" className="mt-4 inline-flex min-h-11 items-center rounded-xl button-gradient px-5 py-2.5 text-sm font-bold text-white no-underline">
                      Browse jobs
                    </Link>
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

            {/* Quick Links — View Mode */}
            <div className="mt-8">
              <QuickLinks resumeFileName={profile?.resumeFileName} openToWork={profile?.openToWork} />
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

/* ── Inline Accordion Section ── */
function EditSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 cursor-pointer bg-transparent border-0 text-left"
        style={{ padding: "14px 16px" }}
      >
        <span className="text-lg" dangerouslySetInnerHTML={{ __html: icon }} />
        <span className="text-sm font-bold text-text flex-1">{title}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div style={{ padding: "0 16px 16px" }}>
          {children}
        </div>
      )}
    </Card>
  );
}

/* ── Quick Link Cards ── */
function QuickLinks({
  resumeFileName,
  openToWork,
}: {
  resumeFileName?: string;
  openToWork?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Link href="/profile/resume" className="no-underline">
        <Card className="hover:border-teal transition-colors">
          <div style={{ padding: 16 }} className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ width: 40, height: 40, background: "rgba(13,148,136,.08)" }}
            >
              <span className="text-base">&#128196;</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text mb-0.5">Manage Resume</p>
              <p className="text-xs text-text-muted m-0">
                {resumeFileName || "No resume uploaded"}
              </p>
            </div>
            <span className="text-text-muted text-sm">&#8594;</span>
          </div>
        </Card>
      </Link>
      <Link href="/settings/career" className="no-underline">
        <Card className="hover:border-teal transition-colors">
          <div style={{ padding: 16 }} className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ width: 40, height: 40, background: openToWork ? "rgba(34,197,94,.08)" : "rgba(13,148,136,.08)" }}
            >
              <span className="text-base">{openToWork ? "\u2705" : "\u{1F4BC}"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text mb-0.5">Career Preferences</p>
              <p className="text-xs text-text-muted m-0">
                {openToWork ? "Open to Work" : "Set your work preferences"}
              </p>
            </div>
            <span className="text-text-muted text-sm">&#8594;</span>
          </div>
        </Card>
      </Link>
    </div>
  );
}
