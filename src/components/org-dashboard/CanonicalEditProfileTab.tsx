"use client";

import ProfileMediaUploader from "@/components/org-dashboard/ProfileMediaUploader";
import { formatOrganizationHoursDay } from "@/lib/organization-profile";

const AMBER = "#D97706";
const AMBER_RGB = "217,119,6";
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};
const INDUSTRY_OPTIONS = ["", "Technology", "Healthcare", "Education", "Finance", "Manufacturing", "Retail", "Construction", "Transportation", "Agriculture", "Energy", "Media & Entertainment", "Hospitality", "Real Estate", "Non-Profit", "Government", "Other"];
const SIZE_OPTIONS = ["", "1-10", "11-50", "51-200", "200+"];
const SUGGESTED_TAGS = ["Recruitment", "Training", "Hospitality", "Human Resources", "First Nations", "Saskatchewan", "Career Development", "Gaming Industry"];
const SUGGESTED_SERVICES = ["Hiring", "Training", "Scholarships", "Events", "Professional Services", "Community Partnerships"];
const TREATY_OPTIONS = ["", "Treaty 1", "Treaty 2", "Treaty 3", "Treaty 4", "Treaty 5", "Treaty 6", "Treaty 7", "Treaty 8", "Treaty 9", "Treaty 10", "Treaty 11"];

export type ProfileSection = "Identity" | "Story" | "Credibility" | "Discoverability" | "Contact" | "Media";

export interface HoursDay {
  open: string;
  close: string;
  isOpen: boolean;
  label?: string;
}

export type HoursMap = Record<string, HoursDay>;

export interface DashboardProfileForm {
  name: string;
  tagline: string;
  description: string;
  industry: string;
  size: string;
  foundedYear: string;
  city: string;
  province: string;
  address: string;
  website: string;
  contactEmail: string;
  phone: string;
  linkedin: string;
  instagram: string;
  facebook: string;
  twitter: string;
  logoUrl: string;
  bannerUrl: string;
}

export interface DashboardProfileChecks {
  checks: Array<{ label: string; done: boolean }>;
  completed: number;
  total: number;
  percent: number;
}

interface CanonicalEditProfileTabProps {
  profileSub: ProfileSection;
  setProfileSub: (section: ProfileSection) => void;
  profileForm: DashboardProfileForm;
  setProfileForm: React.Dispatch<React.SetStateAction<DashboardProfileForm>>;
  hours: HoursMap;
  setHours: React.Dispatch<React.SetStateAction<HoursMap>>;
  gallery: string[];
  setGallery: React.Dispatch<React.SetStateAction<string[]>>;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  tagInput: string;
  setTagInput: React.Dispatch<React.SetStateAction<string>>;
  services: string[];
  setServices: React.Dispatch<React.SetStateAction<string[]>>;
  serviceInput: string;
  setServiceInput: React.Dispatch<React.SetStateAction<string>>;
  indigenousGroups: string[];
  setIndigenousGroups: React.Dispatch<React.SetStateAction<string[]>>;
  nation: string;
  setNation: React.Dispatch<React.SetStateAction<string>>;
  treatyTerritory: string;
  setTreatyTerritory: React.Dispatch<React.SetStateAction<string>>;
  saving: boolean;
  saveMsg: string;
  saveProfile: (fields: Record<string, unknown>) => Promise<void>;
  profileChecks: DashboardProfileChecks;
  getToken: () => Promise<string>;
  persistSingleMedia: (slot: "logo" | "banner", url: string) => Promise<void>;
  isSchool: boolean;
  schoolIsPublished: boolean;
  toggleSchoolPublished: (next: boolean) => Promise<void>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-6 backdrop-blur-sm"
      style={{
        background: "rgba(15,23,42,0.78)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 60px rgba(2,6,23,0.22)",
      }}
    >
      {children}
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  onClick,
  variant = "primary",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      style={
        variant === "primary"
          ? {
              background: `linear-gradient(135deg, ${AMBER}, #F59E0B)`,
              color: "#fff",
              border: "none",
              boxShadow: `0 8px 24px rgba(${AMBER_RGB},0.24)`,
            }
          : {
              background: "rgba(255,255,255,0.05)",
              color: "var(--text-sec, #cbd5e1)",
              border: "1px solid rgba(255,255,255,0.1)",
            }
      }
    >
      {children}
    </button>
  );
}

export default function CanonicalEditProfileTab({
  profileSub,
  setProfileSub,
  profileForm,
  setProfileForm,
  hours,
  setHours,
  gallery,
  setGallery,
  tags,
  setTags,
  tagInput,
  setTagInput,
  services,
  setServices,
  serviceInput,
  setServiceInput,
  indigenousGroups,
  setIndigenousGroups,
  nation,
  setNation,
  treatyTerritory,
  setTreatyTerritory,
  saving,
  saveMsg,
  saveProfile,
  profileChecks,
  getToken,
  persistSingleMedia,
  isSchool,
  schoolIsPublished,
  toggleSchoolPublished,
}: CanonicalEditProfileTabProps) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(2,6,23,0.6)",
    border: "1px solid rgba(30,41,59,0.6)",
    borderRadius: 10,
    color: "var(--text, #f8fafc)",
    fontSize: 14,
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted, #94a3b8)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const nextMissing = profileChecks.checks.find((check) => !check.done)?.label;
  const schoolStatusMessage = schoolIsPublished
    ? "Your school profile is public on the schools directory."
    : "Your school profile is hidden from public view until you publish it again.";

  const addUniqueItem = (
    value: string,
    setValue: React.Dispatch<React.SetStateAction<string>>,
    setItems: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    const next = value.trim();
    if (!next) return;

    setItems((prev) => {
      if (prev.some((entry) => entry.toLowerCase() === next.toLowerCase())) return prev;
      return [...prev, next];
    });
    setValue("");
  };

  const saveIdentity = () => saveProfile({
    name: profileForm.name,
    industry: profileForm.industry,
    size: profileForm.size,
    foundedYear: profileForm.foundedYear,
    logoUrl: profileForm.logoUrl,
    bannerUrl: profileForm.bannerUrl,
  });

  const saveStory = () => saveProfile({
    tagline: profileForm.tagline,
    description: profileForm.description,
  });

  const saveCredibility = () => saveProfile({
    hours,
    indigenousGroups,
    nation,
    treatyTerritory,
  });

  const saveDiscoverability = () => saveProfile({
    location: { city: profileForm.city, province: profileForm.province },
    tags,
    services,
  });

  const saveContact = () => saveProfile({
    address: profileForm.address,
    website: profileForm.website,
    contactEmail: profileForm.contactEmail,
    phone: profileForm.phone,
    socialLinks: {
      linkedin: profileForm.linkedin,
      instagram: profileForm.instagram,
      facebook: profileForm.facebook,
      twitter: profileForm.twitter,
    },
  });

  const saveMedia = () => saveProfile({ gallery });

  return (
    <>
      <h2
        className="text-xl font-extrabold tracking-tight mb-5"
        style={{
          background: "linear-gradient(135deg, var(--text, #f8fafc), var(--text-sec, #cbd5e1))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Edit Profile
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4 mb-6">
        <SectionCard>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: AMBER }}>
                Public Profile Readiness
              </div>
              <h3 className="text-lg font-bold mt-1" style={{ color: "var(--text, #f8fafc)" }}>
                {profileChecks.percent}% complete
              </h3>
              <p className="text-sm mt-2" style={{ color: "var(--text-muted, #94a3b8)" }}>
                Fill the fields members see first: brand assets, story, search tags, contact details, and trust signals.
              </p>
            </div>
            <div
              className="px-3 py-2 rounded-xl text-right"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                minWidth: 108,
              }}
            >
              <div className="text-2xl font-black" style={{ color: AMBER }}>
                {profileChecks.completed}/{profileChecks.total}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted, #94a3b8)" }}>
                Signals Ready
              </div>
            </div>
          </div>

          <div className="h-2.5 rounded-full overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${profileChecks.percent}%`,
                background: `linear-gradient(90deg, ${AMBER}, #14B8A6)`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {profileChecks.checks.map((check) => (
              <div
                key={check.label}
                className="rounded-xl px-3 py-2.5 text-sm border"
                style={{
                  background: check.done ? "rgba(13,148,136,0.08)" : "rgba(255,255,255,0.03)",
                  borderColor: check.done ? "rgba(13,148,136,0.2)" : "rgba(255,255,255,0.08)",
                  color: check.done ? "#CCFBF1" : "var(--text-muted, #94a3b8)",
                }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-1">{check.done ? "Ready" : "Needs work"}</div>
                <div className="font-semibold">{check.label}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl p-5"
            style={{
              background: `linear-gradient(135deg, rgba(${AMBER_RGB},0.08), rgba(20,184,166,0.06))`,
              border: `1px solid rgba(${AMBER_RGB},0.16)`,
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: AMBER }}>
              What to do next
            </div>
            <h3 className="text-lg font-bold mt-2" style={{ color: "var(--text, #f8fafc)" }}>
              {nextMissing ? `Finish ${nextMissing}` : "Profile is ready to promote"}
            </h3>
            <p className="text-sm mt-3" style={{ color: "var(--text-muted, #94a3b8)" }}>
              The public page now leads with proof and discovery. Completing these sections improves directory quality and member trust.
            </p>
            {saveMsg && (
              <div
                className="mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: saveMsg === "Saved!" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  color: saveMsg === "Saved!" ? "#4ADE80" : "#FCA5A5",
                }}
              >
                {saveMsg}
              </div>
            )}
          </div>

          {isSchool && (
            <SectionCard>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: AMBER }}>
                    School Visibility
                  </div>
                  <h3 className="text-lg font-bold mt-2" style={{ color: "var(--text, #f8fafc)" }}>
                    {schoolIsPublished ? "School profile is public" : "School profile is hidden"}
                  </h3>
                  <p className="text-sm mt-2" style={{ color: "var(--text-muted, #94a3b8)" }}>
                    {schoolStatusMessage}
                  </p>
                </div>
                <span
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider"
                  style={{
                    background: schoolIsPublished ? "rgba(34,197,94,0.1)" : "rgba(251,191,36,0.12)",
                    color: schoolIsPublished ? "#4ADE80" : "#FBBF24",
                  }}
                >
                  {schoolIsPublished ? "Live" : "Hidden"}
                </span>
              </div>
              <ActionButton
                disabled={saving}
                variant={schoolIsPublished ? "secondary" : "primary"}
                onClick={() => {
                  void toggleSchoolPublished(!schoolIsPublished);
                }}
              >
                {saving ? "Saving..." : schoolIsPublished ? "Hide School Profile" : "Publish School Profile"}
              </ActionButton>
            </SectionCard>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["Identity", "Story", "Credibility", "Discoverability", "Contact", "Media"] as ProfileSection[]).map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setProfileSub(section)}
            className="px-4 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all border-none"
            style={profileSub === section ? {
              color: "#fff",
              background: `linear-gradient(135deg, rgba(${AMBER_RGB},0.15), rgba(245,158,11,0.1))`,
              border: `1px solid rgba(${AMBER_RGB},0.4)`,
            } : {
              color: "var(--text-muted, #94a3b8)",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {section}
          </button>
        ))}
      </div>

      {profileSub === "Identity" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
          <SectionCard>
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Brand & Role</h3>
            <div className="mb-5">
              <label style={labelStyle}>Organization Name</label>
              <input style={inputStyle} value={profileForm.name} onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Your public business name" />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Industry</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={profileForm.industry} onChange={(event) => setProfileForm((prev) => ({ ...prev, industry: event.target.value }))}>
                {INDUSTRY_OPTIONS.map((option) => (
                  <option key={option || "blank"} value={option}>{option || "Select an industry"}</option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Organization Size</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={profileForm.size} onChange={(event) => setProfileForm((prev) => ({ ...prev, size: event.target.value }))}>
                {SIZE_OPTIONS.map((option) => (
                  <option key={option || "blank"} value={option}>{option || "Select organization size"}</option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Founded Year</label>
              <input style={inputStyle} value={profileForm.foundedYear} onChange={(event) => setProfileForm((prev) => ({ ...prev, foundedYear: event.target.value }))} placeholder="e.g. 2004" />
            </div>
            <ActionButton disabled={saving} onClick={saveIdentity}>{saving ? "Saving..." : "Save Identity"}</ActionButton>
          </SectionCard>

          <div className="flex flex-col gap-4">
            <ProfileMediaUploader
              mode="single"
              slot="logo"
              title="Logo"
              description="Drag and drop, browse, import from Google Drive, or paste a public cloud link for your logo."
              getToken={getToken}
              value={profileForm.logoUrl}
              onPersist={(url) => persistSingleMedia("logo", url)}
              disabled={saving}
            />
            <ProfileMediaUploader
              mode="single"
              slot="banner"
              title="Banner"
              description="Use a wide cover image that sets the tone for your public profile and directory card."
              getToken={getToken}
              value={profileForm.bannerUrl}
              onPersist={(url) => persistSingleMedia("banner", url)}
              disabled={saving}
            />
          </div>
        </div>
      )}

      {profileSub === "Story" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
          <SectionCard>
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Tell Members Why You Matter</h3>
            <div className="mb-5">
              <label style={labelStyle}>Tagline</label>
              <input
                style={inputStyle}
                value={profileForm.tagline}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, tagline: event.target.value }))}
                placeholder="A short proof-led line about your organization"
              />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: 180, resize: "vertical" }}
                value={profileForm.description}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Explain who you serve, what opportunities you offer, and why members should trust your organization."
              />
            </div>
            <ActionButton disabled={saving} onClick={saveStory}>{saving ? "Saving..." : "Save Story"}</ActionButton>
          </SectionCard>

          <SectionCard>
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text, #f8fafc)" }}>Story Preview</h3>
            <div className="rounded-2xl p-5 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: AMBER }}>
                What members see after your hero
              </div>
              <h4 className="text-xl font-bold" style={{ color: "var(--text, #f8fafc)" }}>
                {profileForm.tagline || "Add a strong tagline"}
              </h4>
              <p className="text-sm leading-7 mt-4 whitespace-pre-wrap" style={{ color: "var(--text-muted, #94a3b8)" }}>
                {profileForm.description || "Add an organization story to help members understand your mission, community ties, and opportunities."}
              </p>
            </div>
          </SectionCard>
        </div>
      )}

      {profileSub === "Credibility" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
          <SectionCard>
            <h3 className="text-base font-bold mb-1" style={{ color: "var(--text, #f8fafc)" }}>Business Hours</h3>
            <p className="text-[13px] mb-6" style={{ color: "var(--text-muted, #64748b)" }}>
              Publish accurate hours so members know when to call, visit, or expect a response.
            </p>
            <div className="flex flex-col gap-2">
              {DAYS.map((day) => (
                <div key={day} className="grid items-center gap-4 px-4 py-2.5 rounded-xl" style={{ gridTemplateColumns: "90px 1fr auto", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(30,41,59,0.3)" }}>
                  <span className="text-[13px] font-semibold" style={{ color: "var(--text-muted, #94a3b8)" }}>{DAY_LABELS[day]}</span>
                  {hours[day].isOpen ? (
                    <div className="flex items-center gap-2">
                      <input className="text-center text-[13px] font-medium" style={{ ...inputStyle, width: 100, padding: "8px 12px", borderRadius: 8 }} value={hours[day].open} onChange={(event) => setHours((prev) => ({ ...prev, [day]: { ...prev[day], open: event.target.value } }))} />
                      <span className="text-xs" style={{ color: "var(--text-muted, #64748b)" }}>to</span>
                      <input className="text-center text-[13px] font-medium" style={{ ...inputStyle, width: 100, padding: "8px 12px", borderRadius: 8 }} value={hours[day].close} onChange={(event) => setHours((prev) => ({ ...prev, [day]: { ...prev[day], close: event.target.value } }))} />
                    </div>
                  ) : (
                    <span className="text-[13px] italic" style={{ color: "var(--text-muted, #64748b)" }}>Closed</span>
                  )}
                  <button
                    type="button"
                    className="w-12 h-[26px] rounded-[13px] relative cursor-pointer transition-all border shrink-0"
                    style={{ background: hours[day].isOpen ? `linear-gradient(135deg, ${AMBER}, #F59E0B)` : "rgba(30,41,59,0.8)", borderColor: hours[day].isOpen ? AMBER : "rgba(30,41,59,0.6)" }}
                    onClick={() => setHours((prev) => ({ ...prev, [day]: { ...prev[day], isOpen: !prev[day].isOpen } }))}
                  >
                    <div className="absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full transition-all shadow" style={{ left: hours[day].isOpen ? 26 : 3 }} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <ActionButton disabled={saving} onClick={saveCredibility}>{saving ? "Saving..." : "Save Credibility"}</ActionButton>
              <ActionButton
                disabled={saving}
                variant="secondary"
                onClick={() => {
                  const weekday = hours.monday;
                  setHours((prev) => {
                    const next = { ...prev };
                    ["monday", "tuesday", "wednesday", "thursday", "friday"].forEach((entry) => {
                      next[entry] = { ...weekday };
                    });
                    return next;
                  });
                }}
              >
                Copy to Weekdays
              </ActionButton>
            </div>
          </SectionCard>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-7 relative overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(${AMBER_RGB},0.06), rgba(59,130,246,0.04))`, border: `1px solid rgba(${AMBER_RGB},0.15)` }}>
              <h3 className="text-base font-bold mb-1" style={{ color: AMBER }}>Indigenous Identity & Community Context</h3>
              <p className="text-[13px] mb-5" style={{ color: "var(--text-muted, #94a3b8)" }}>
                Surface the affiliations and territories that help members understand your role and relationships.
              </p>
              <div className="flex gap-3 mb-5">
                {["First Nations", "Métis", "Inuit"].map((group) => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setIndigenousGroups((prev) => prev.includes(group) ? prev.filter((entry) => entry !== group) : [...prev, group])}
                    className="flex-1 py-4 rounded-xl text-center text-sm font-semibold cursor-pointer transition-all border"
                    style={indigenousGroups.includes(group) ? { background: `rgba(${AMBER_RGB},0.08)`, borderColor: `rgba(${AMBER_RGB},0.4)`, color: AMBER } : { background: "rgba(2,6,23,0.5)", borderColor: "rgba(30,41,59,0.6)", color: "var(--text-muted, #94a3b8)" }}
                  >
                    {indigenousGroups.includes(group) && <span className="mr-1">✓</span>}
                    {group}
                  </button>
                ))}
              </div>
              <div className="mb-5">
                <label style={labelStyle}>Nation / Community</label>
                <input style={inputStyle} value={nation} onChange={(event) => setNation(event.target.value)} placeholder="e.g. Federation of Sovereign Indigenous Nations (FSIN)" />
              </div>
              <div className="mb-5">
                <label style={labelStyle}>Treaty Territory</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={treatyTerritory} onChange={(event) => setTreatyTerritory(event.target.value)}>
                  {TREATY_OPTIONS.map((option) => (
                    <option key={option || "blank"} value={option}>{option || "Select treaty territory"}</option>
                  ))}
                </select>
              </div>
              <ActionButton disabled={saving} onClick={saveCredibility}>{saving ? "Saving..." : "Save Credibility"}</ActionButton>
            </div>

            <SectionCard>
              <h3 className="text-base font-bold mb-4" style={{ color: "var(--text, #f8fafc)" }}>Proof Signals Preview</h3>
              <div className="space-y-3">
                <div className="rounded-xl px-4 py-3 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: AMBER }}>Today&apos;s hours</div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text, #f8fafc)" }}>{formatOrganizationHoursDay(hours[new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()] || hours.monday)}</div>
                </div>
                <div className="rounded-xl px-4 py-3 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: AMBER }}>Community context</div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text, #f8fafc)" }}>{[nation, treatyTerritory].filter(Boolean).join(" · ") || "Add your Nation or treaty territory"}</div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {profileSub === "Discoverability" && (
        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4">
          <SectionCard>
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Directory Signals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label style={labelStyle}>City</label>
                <input style={inputStyle} value={profileForm.city} onChange={(event) => setProfileForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="e.g. Regina" />
              </div>
              <div>
                <label style={labelStyle}>Province</label>
                <input style={inputStyle} value={profileForm.province} onChange={(event) => setProfileForm((prev) => ({ ...prev, province: event.target.value }))} placeholder="e.g. Saskatchewan" />
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted, #94a3b8)" }}>
              Search and directory cards now use your location, tags, services, story, and trust signals together.
            </p>
            <ActionButton disabled={saving} onClick={saveDiscoverability}>{saving ? "Saving..." : "Save Discoverability"}</ActionButton>
          </SectionCard>

          <SectionCard>
            <h3 className="text-base font-bold mb-1" style={{ color: "var(--text, #f8fafc)" }}>Tags & Services</h3>
            <p className="text-[13px] mb-6" style={{ color: "var(--text-muted, #64748b)" }}>
              Use tags for discovery and services for what members can expect from your organization.
            </p>
            <div className="mb-5">
              <label style={labelStyle}>Discovery Tags</label>
              <div className="flex flex-wrap gap-2 p-3.5 rounded-xl mb-4 min-h-[52px] items-center" style={{ background: "rgba(2,6,23,0.6)", border: "1px solid rgba(30,41,59,0.6)" }}>
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: `rgba(${AMBER_RGB},0.1)`, color: AMBER, border: `1px solid rgba(${AMBER_RGB},0.2)` }}>
                    {tag}
                    <span className="cursor-pointer opacity-50 hover:opacity-100 text-sm" onClick={() => setTags((prev) => prev.filter((entry) => entry !== tag))}>×</span>
                  </span>
                ))}
                <input className="bg-transparent border-none text-sm outline-none flex-1 min-w-[140px]" style={{ color: "var(--text, #f8fafc)", fontFamily: "inherit" }} placeholder="Type a tag and press Enter..." value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addUniqueItem(tagInput, setTagInput, setTags);
                  }
                }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TAGS.filter((tag) => !tags.includes(tag)).map((tag) => (
                  <span key={tag} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted, #94a3b8)", border: "1px solid rgba(30,41,59,0.6)" }} onClick={() => setTags((prev) => [...prev, tag])}>+ {tag}</span>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Services</label>
              <div className="flex flex-wrap gap-2 p-3.5 rounded-xl mb-4 min-h-[52px] items-center" style={{ background: "rgba(2,6,23,0.6)", border: "1px solid rgba(30,41,59,0.6)" }}>
                {services.map((service) => (
                  <span key={service} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(20,184,166,0.1)", color: "#99F6E4", border: "1px solid rgba(20,184,166,0.18)" }}>
                    {service}
                    <span className="cursor-pointer opacity-50 hover:opacity-100 text-sm" onClick={() => setServices((prev) => prev.filter((entry) => entry !== service))}>×</span>
                  </span>
                ))}
                <input className="bg-transparent border-none text-sm outline-none flex-1 min-w-[140px]" style={{ color: "var(--text, #f8fafc)", fontFamily: "inherit" }} placeholder="Add a service and press Enter..." value={serviceInput} onChange={(event) => setServiceInput(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addUniqueItem(serviceInput, setServiceInput, setServices);
                  }
                }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SERVICES.filter((service) => !services.includes(service)).map((service) => (
                  <span key={service} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted, #94a3b8)", border: "1px solid rgba(30,41,59,0.6)" }} onClick={() => setServices((prev) => [...prev, service])}>+ {service}</span>
                ))}
              </div>
            </div>
            <ActionButton disabled={saving} onClick={saveDiscoverability}>{saving ? "Saving..." : "Save Discoverability"}</ActionButton>
          </SectionCard>
        </div>
      )}

      {profileSub === "Contact" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard>
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Contact Information</h3>
            <div className="mb-5">
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={profileForm.address} onChange={(event) => setProfileForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="123 Main St, Regina, SK" />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} value={profileForm.contactEmail} onChange={(event) => setProfileForm((prev) => ({ ...prev, contactEmail: event.target.value }))} />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Phone</label>
              <input type="tel" style={inputStyle} value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Website</label>
              <input type="url" style={inputStyle} value={profileForm.website} onChange={(event) => setProfileForm((prev) => ({ ...prev, website: event.target.value }))} />
            </div>
            <ActionButton disabled={saving} onClick={saveContact}>{saving ? "Saving..." : "Save Contact"}</ActionButton>
          </SectionCard>

          <SectionCard>
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Social Media</h3>
            <div className="mb-5">
              <label style={labelStyle}>LinkedIn</label>
              <input style={inputStyle} value={profileForm.linkedin} onChange={(event) => setProfileForm((prev) => ({ ...prev, linkedin: event.target.value }))} placeholder="linkedin.com/company/yourorg" />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Instagram</label>
              <input style={inputStyle} value={profileForm.instagram} onChange={(event) => setProfileForm((prev) => ({ ...prev, instagram: event.target.value }))} placeholder="instagram.com/yourhandle" />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Facebook</label>
              <input style={inputStyle} value={profileForm.facebook} onChange={(event) => setProfileForm((prev) => ({ ...prev, facebook: event.target.value }))} placeholder="facebook.com/yourpage" />
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Twitter / X</label>
              <input style={inputStyle} value={profileForm.twitter} onChange={(event) => setProfileForm((prev) => ({ ...prev, twitter: event.target.value }))} placeholder="x.com/yourhandle" />
            </div>
            <ActionButton disabled={saving} onClick={saveContact}>{saving ? "Saving..." : "Save Social"}</ActionButton>
          </SectionCard>
        </div>
      )}

      {profileSub === "Media" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
          <div className="flex flex-col gap-4">
            <ProfileMediaUploader
              mode="gallery"
              slot="gallery"
              title="Gallery"
              description="Add workplace, team, or community photos with drag and drop, Google Drive, or public cloud links. Images are copied into IOPPS storage before you save the gallery."
              getToken={getToken}
              values={gallery}
              onChange={setGallery}
              maxItems={6}
              disabled={saving}
            />
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "var(--text-muted, #64748b)" }}>{gallery.length} {gallery.length === 1 ? "image" : "images"}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(30,41,59,0.5)" }}>
                <div className="h-full rounded-full" style={{ width: `${(Math.min(gallery.length, 6) / 6) * 100}%`, background: `linear-gradient(90deg, ${AMBER}, #F59E0B)` }} />
              </div>
              <ActionButton disabled={saving} onClick={saveMedia}>{saving ? "Saving..." : "Save Gallery"}</ActionButton>
            </div>
          </div>

          <SectionCard>
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text, #f8fafc)" }}>Media Preview</h3>
            <div className="rounded-2xl p-5 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: AMBER }}>
                Public gallery treatment
              </div>
              {gallery.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted, #94a3b8)", borderColor: "rgba(255,255,255,0.12)" }}>
                  Add at least one uploaded or imported image to show your organization, team, or space.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {gallery.slice(0, 3).map((url) => (
                    <div key={url} className="aspect-square rounded-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </>
  );
}
