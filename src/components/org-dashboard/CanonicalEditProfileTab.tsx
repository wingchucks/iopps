"use client";

import ProfileMediaUploader from "@/components/org-dashboard/ProfileMediaUploader";
import ProvinceSelect from "@/components/ProvinceSelect";
import BusinessIdentityField from "@/components/org-dashboard/BusinessIdentityField";
import { TERRITORY_OPTIONS } from "@/lib/job-hiring-details";
import { formatOrganizationHoursDay, type OrganizationBusinessIdentity } from "@/lib/organization-profile";

const TEAL = "var(--teal)";
const TEAL_RGB = "13,148,136";
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
const INDUSTRY_OPTIONS = ["", "Technology", "Healthcare", "Education", "Finance", "Manufacturing", "Retail", "Construction", "Transportation", "Agriculture", "Energy", "Media & Entertainment", "Hospitality", "Food & Beverage", "Personal Care & Beauty", "Automotive Services", "Sports & Recreation", "Real Estate", "Non-Profit", "Government", "Other"];
const SIZE_OPTIONS = ["", "1-10", "11-50", "51-200", "200+"];
const SUGGESTED_TAGS = ["Recruitment", "Training", "Hospitality", "Human Resources", "First Nations", "Saskatchewan", "Career Development", "Gaming Industry"];
const SUGGESTED_SERVICES = ["Hiring", "Training", "Scholarships", "Events", "Professional Services", "Community Partnerships"];
const TREATY_OPTIONS = ["", ...TERRITORY_OPTIONS];
const SECTION_LABELS = { Identity: "Business basics", Story: "Our story", Credibility: "Identity & community", Discoverability: "Services & location", Contact: "Contact", Media: "Photos" };

export type ProfileSection = "Identity" | "Story" | "Credibility" | "Discoverability" | "Contact" | "Media";

export interface HoursDay {
  open: string;
  close: string;
  isOpen: boolean;
  configured?: boolean;
  label?: string;
}

export type HoursMap = Record<string, HoursDay>;

export interface DashboardProfileForm {
  name: string;
  businessIdentity: OrganizationBusinessIdentity;
  tagline: string;
  description: string;
  industry: string;
  size: string;
  foundedYear: string;
  city: string;
  province: string;
  address: string;
  website: string;
  /** Opt-in email shown on the public profile; blank shows none. */
  publicContactEmail: string;
  /** Private account contact, shown only to the owner as a suggestion. */
  accountContactEmail?: string;
  phone: string;
  linkedin: string;
  instagram: string;
  facebook: string;
  twitter: string;
  tiktok?: string;
  youtube?: string;
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
  demo?: boolean;
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
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 12px 32px rgba(15,43,60,0.04)",
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
      className="brand-button px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      style={
        variant === "primary"
          ? {
              background: "var(--button-gradient)",
              color: "#fff",
              border: "none",
              boxShadow: "var(--button-gradient-shadow)",
            }
          : {
              background: "var(--button-gradient-soft)",
              color: "var(--button-gradient-soft-text)",
              border: "1px solid var(--border)",
            }
      }
    >
      {children}
    </button>
  );
}

export default function CanonicalEditProfileTab({
  demo = false,
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
}: CanonicalEditProfileTabProps) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--text, #f8fafc)",
    fontSize: 14,
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-sec)",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const nextMissing = profileChecks.checks.find((check) => !check.done)?.label;


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
    businessIdentity: profileForm.businessIdentity,
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
    publicContactEmail: profileForm.publicContactEmail.trim(),
    phone: profileForm.phone,
    socialLinks: {
      linkedin: profileForm.linkedin,
      instagram: profileForm.instagram,
      facebook: profileForm.facebook,
      twitter: profileForm.twitter,
      tiktok: profileForm.tiktok || "",
      youtube: profileForm.youtube || "",
    },
  });

  const saveMedia = () => saveProfile({ gallery });

  return (
    <section className="organization-profile-editor">
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

      <details className="business-profile-checklist" open={isSchool || undefined}>
        <summary><strong>Profile checklist</strong><span>{profileChecks.completed} of {profileChecks.total} filled</span><span className="checklist-review">Review details</span></summary>
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4 mt-4">
        <SectionCard>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: TEAL }}>
                Profile checklist
              </div>
              <h3 className="text-lg font-bold mt-1" style={{ color: "var(--text, #f8fafc)" }}>
                {profileChecks.percent}% complete
              </h3>
              <p className="text-sm mt-2" style={{ color: "var(--text-sec)" }}>
                Help people get to know your work. Save each section when you’re ready.
              </p>
            </div>
            <div
              className="px-3 py-2 rounded-xl text-right"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                minWidth: 108,
              }}
            >
              <div className="text-2xl font-black" style={{ color: TEAL }}>
                {profileChecks.completed}/{profileChecks.total}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-sec)" }}>
                Fields filled
              </div>
            </div>
          </div>

          <div className="h-2.5 rounded-full overflow-hidden mb-4" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${profileChecks.percent}%`,
                background: `linear-gradient(90deg, ${TEAL}, #14B8A6)`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {profileChecks.checks.map((check) => (
              <div
                key={check.label}
                className="rounded-xl px-3 py-2.5 text-sm border"
                style={{
                  background: check.done ? "rgba(13,148,136,0.08)" : "var(--bg)",
                  borderColor: check.done ? "rgba(13,148,136,0.2)" : "var(--border)",
                  color: check.done ? "var(--teal)" : "var(--text-sec)",
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
              background: `linear-gradient(135deg, rgba(${TEAL_RGB},0.08), rgba(20,184,166,0.06))`,
              border: `1px solid rgba(${TEAL_RGB},0.16)`,
            }}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: TEAL }}>
              What to do next
            </div>
            <h3 className="text-lg font-bold mt-2" style={{ color: "var(--text, #f8fafc)" }}>
              {nextMissing ? `Finish ${nextMissing}` : "Your checklist is complete"}
            </h3>
            <p className="text-sm mt-3" style={{ color: "var(--text-sec)" }}>
              This checklist reflects the details in your editor. Save your changes, then view your public profile to see what visitors see.
            </p>

          </div>

          {isSchool && (
            <SectionCard>
              <h3 className="text-lg font-bold">School promotion has ended</h3>
              <p className="mt-2 text-sm text-text-sec">Existing account records remain available. Public school and program promotion is no longer offered. Contact IOPPS for help with a previous subscription.</p>
            </SectionCard>
          )}
        </div>
      </div>

      </details>
      {saveMsg && <p role={saveMsg === "Saved!" ? "status" : "alert"} className="business-profile-save" data-error={saveMsg !== "Saved!"}>{saveMsg}</p>}

      <div className="flex flex-wrap gap-2 mb-6">
        {(["Identity", "Story", "Credibility", "Discoverability", "Contact", "Media"] as ProfileSection[]).map((section) => (
          <button
            key={section}
            type="button"
            aria-pressed={profileSub === section}
            onClick={() => setProfileSub(section)}
            className="brand-button px-4 py-2 rounded-xl text-[13px] font-medium cursor-pointer transition-all border-none"
            style={profileSub === section ? {
              color: "#fff",
              background: "var(--button-gradient)",
              border: `1px solid rgba(${TEAL_RGB},0.4)`,
            } : {
              color: "var(--button-gradient-soft-text)",
              background: "var(--button-gradient-soft)",
              border: "1px solid var(--border)",
            }}
          >
            {SECTION_LABELS[section]}
          </button>
        ))}
      </div>

      {profileSub === "Identity" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
          <SectionCard>
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Business basics</h3>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-1">Organization Name</label>
              <input id="business-field-1" style={inputStyle} value={profileForm.name} onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Your public business name" />
            </div>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-2">Industry</label>
              <select id="business-field-2" style={{ ...inputStyle, cursor: "pointer" }} value={profileForm.industry} onChange={(event) => setProfileForm((prev) => ({ ...prev, industry: event.target.value }))}>
                {[...INDUSTRY_OPTIONS, ...(profileForm.industry && !INDUSTRY_OPTIONS.includes(profileForm.industry) ? [profileForm.industry] : [])].map((option) => (
                  <option key={option || "blank"} value={option}>{option || "Select an industry"}</option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-3">Organization Size</label>
              <select id="business-field-3" style={{ ...inputStyle, cursor: "pointer" }} value={profileForm.size} onChange={(event) => setProfileForm((prev) => ({ ...prev, size: event.target.value }))}>
                {SIZE_OPTIONS.map((option) => (
                  <option key={option || "blank"} value={option}>{option || "Select organization size"}</option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-4">Founded Year</label>
              <input id="business-field-4" style={inputStyle} value={profileForm.foundedYear} onChange={(event) => setProfileForm((prev) => ({ ...prev, foundedYear: event.target.value }))} placeholder="e.g. 2004" />
            </div>
            <ActionButton disabled={saving} onClick={saveIdentity}>{saving ? "Saving..." : "Save business basics"}</ActionButton>
          </SectionCard>

          <div className="flex flex-col gap-4">
            <ProfileMediaField demo={demo}
              mode="single"
              slot="logo"
              title="Logo"
              description="Drag and drop, browse, import from Google Drive, or paste a public cloud link for your logo."
              getToken={getToken}
              value={profileForm.logoUrl}
              onPersist={(url) => persistSingleMedia("logo", url)}
              disabled={saving}
            />
            <ProfileMediaField demo={demo}
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
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Tell your story</h3>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-5">Tagline</label>
              <input id="business-field-5"
                style={inputStyle}
                value={profileForm.tagline}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, tagline: event.target.value }))}
                placeholder="A short line about what you do"
              />
            </div>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-6">Description</label>
              <textarea id="business-field-6"
                style={{ ...inputStyle, minHeight: 180, resize: "vertical" }}
                value={profileForm.description}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Tell people what you do, who you serve, and what makes your work special."
              />
            </div>
            <ActionButton disabled={saving} onClick={saveStory}>{saving ? "Saving..." : "Save Story"}</ActionButton>
          </SectionCard>

          <SectionCard>
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text, #f8fafc)" }}>Story Preview</h3>
            <div className="rounded-2xl p-5 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: TEAL }}>
                Your introduction
              </div>
              <h4 className="text-xl font-bold" style={{ color: "var(--text, #f8fafc)" }}>
                {profileForm.tagline || "Add a strong tagline"}
              </h4>
              <p className="text-sm leading-7 mt-4 whitespace-pre-wrap" style={{ color: "var(--text-sec)" }}>
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
            <p className="text-[13px] mb-6" style={{ color: "var(--text-sec)" }}>
              Hours are optional and start as Not provided. Choose Open and enter your times, or explicitly choose Closed for each day.
            </p>
            <div className="flex flex-col gap-2">
              {DAYS.map((day) => (
                <div key={day} className="profile-hours-row rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <span className="text-[13px] font-semibold" style={{ gridArea: "day", color: "var(--text-sec)" }}>{DAY_LABELS[day]}</span>
                  {hours[day].isOpen ? (
                    <div className="profile-hours-times">
                      <input className="text-center text-[13px] font-medium" aria-label={`${DAY_LABELS[day]} opening time`} style={{ ...inputStyle, minWidth: 0, padding: "8px", borderRadius: 8 }} value={hours[day].open} onChange={(event) => setHours((prev) => ({ ...prev, [day]: { ...prev[day], open: event.target.value } }))} />
                      <span className="text-xs" style={{ color: "var(--text-sec)" }}>to</span>
                      <input className="text-center text-[13px] font-medium" aria-label={`${DAY_LABELS[day]} closing time`} style={{ ...inputStyle, minWidth: 0, padding: "8px", borderRadius: 8 }} value={hours[day].close} onChange={(event) => setHours((prev) => ({ ...prev, [day]: { ...prev[day], close: event.target.value } }))} />
                    </div>
                  ) : (
                    <span className="text-[13px] italic" style={{ gridArea: "hours", color: "var(--text-sec)" }}>{hours[day].configured === false ? "Not provided" : "Closed"}</span>
                  )}
                  <select aria-label={`${DAY_LABELS[day]} hours`} style={{ gridArea: "toggle", minHeight: 44, maxWidth: "100%", color: "var(--text)", background: "var(--card)" }}
                    value={hours[day].configured === false ? "unset" : hours[day].isOpen ? "open" : "closed"}
                    onChange={event => { const status = event.target.value; setHours(prev => ({ ...prev, [day]: { ...prev[day], configured: status !== "unset", isOpen: status === "open" } })); }}>
                    <option value="unset">Not provided</option><option value="open">Open</option><option value="closed">Closed</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              <ActionButton disabled={saving} onClick={saveCredibility}>{saving ? "Saving..." : "Save identity & hours"}</ActionButton>
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
            <div className="rounded-2xl p-7 relative overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(${TEAL_RGB},0.06), rgba(59,130,246,0.04))`, border: `1px solid rgba(${TEAL_RGB},0.15)` }}>
              <h3 className="text-base font-bold mb-1" style={{ color: TEAL }}>Identity & community</h3>
              <p className="text-[13px] mb-5" style={{ color: "var(--text-sec)" }}>
                Share your identity and community connections if you wish. All of these details are optional.
              </p>
              <BusinessIdentityField value={profileForm.businessIdentity} onChange={businessIdentity => setProfileForm(prev => ({ ...prev, businessIdentity }))} />
              <p className="text-sm font-semibold mb-3">Community affiliations (optional)</p>
              <div className="flex flex-wrap gap-3 mb-5">
                {["First Nations", "Métis", "Inuit"].map((group) => (
                  <button
                    key={group}
                    type="button"
                    aria-pressed={indigenousGroups.includes(group)}
                    onClick={() => setIndigenousGroups((prev) => prev.includes(group) ? prev.filter((entry) => entry !== group) : [...prev, group])}
                    className="brand-button flex-1 py-4 rounded-xl text-center text-sm font-semibold cursor-pointer transition-all border"
                    style={indigenousGroups.includes(group) ? { background: `rgba(${TEAL_RGB},0.08)`, borderColor: `rgba(${TEAL_RGB},0.4)`, color: TEAL } : { background: "var(--button-gradient-soft)", borderColor: "var(--border)", color: "var(--button-gradient-soft-text)" }}
                  >
                    {indigenousGroups.includes(group) && <span className="mr-1">✓</span>}
                    {group}
                  </button>
                ))}
              </div>
              <div className="mb-5">
                <label style={labelStyle} htmlFor="business-field-7">Nation / Community</label>
                <input id="business-field-7" style={inputStyle} value={nation} onChange={(event) => setNation(event.target.value)} placeholder="Nation or community name" />
              </div>
              <div className="mb-5">
                <label style={labelStyle} htmlFor="business-field-8">Treaty territory or region (optional)</label>
                <select id="business-field-8" style={{ ...inputStyle, cursor: "pointer" }} value={treatyTerritory} onChange={(event) => setTreatyTerritory(event.target.value)}>
                  {[...TREATY_OPTIONS, ...(treatyTerritory && !TREATY_OPTIONS.includes(treatyTerritory) ? [treatyTerritory] : [])].map((option) => (
                    <option key={option || "blank"} value={option}>{option || "Choose a territory or region"}</option>
                  ))}
                </select>
              </div>
              <ActionButton disabled={saving} onClick={saveCredibility}>{saving ? "Saving..." : "Save identity & hours"}</ActionButton>
            </div>

            <SectionCard>
              <h3 className="text-base font-bold mb-4" style={{ color: "var(--text, #f8fafc)" }}>Community & hours preview</h3>
              <div className="space-y-3">
                <div className="rounded-xl px-4 py-3 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: TEAL }}>Today&apos;s hours</div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text, #f8fafc)" }}>{formatOrganizationHoursDay(hours[new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()] || hours.monday)}</div>
                </div>
                <div className="rounded-xl px-4 py-3 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: TEAL }}>Community context</div>
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
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Where people can find you</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label style={labelStyle} htmlFor="business-field-9">City</label>
                <input id="business-field-9" style={inputStyle} value={profileForm.city} onChange={(event) => setProfileForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="e.g. Regina" />
              </div>
              <div>
                <label style={labelStyle} htmlFor="business-province">Province or territory</label>
                <ProvinceSelect id="business-province" style={inputStyle} value={profileForm.province} onChange={province => setProfileForm(prev => ({ ...prev, province }))} />
              </div>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--text-sec)" }}>
              Your location and services help customers and collaborators find your business.
            </p>
            <ActionButton disabled={saving} onClick={saveDiscoverability}>{saving ? "Saving..." : "Save services & location"}</ActionButton>
          </SectionCard>

          <SectionCard>
            <h3 className="text-base font-bold mb-1" style={{ color: "var(--text, #f8fafc)" }}>Tags & Services</h3>
            <p className="text-[13px] mb-6" style={{ color: "var(--text-sec)" }}>
              Use tags for discovery and services for what members can expect from your organization.
            </p>
            <div className="mb-5">
              <label style={labelStyle}>Discovery Tags</label>
              <div className="flex flex-wrap gap-2 p-3.5 rounded-xl mb-4 min-h-[52px] items-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: `rgba(${TEAL_RGB},0.1)`, color: TEAL, border: `1px solid rgba(${TEAL_RGB},0.2)` }}>
                    {tag}
                    <button type="button" aria-label={`Remove ${tag}`} className="cursor-pointer text-sm px-1" onClick={() => setTags((prev) => prev.filter((entry) => entry !== tag))}>×</button>
                  </span>
                ))}
                <input className="bg-transparent border-none text-sm outline-none flex-1 min-w-0 w-full" style={{ color: "var(--text, #f8fafc)", fontFamily: "inherit" }} aria-label="Discovery tags" placeholder="Type a tag and press Enter..." value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addUniqueItem(tagInput, setTagInput, setTags);
                  }
                }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_TAGS.filter((tag) => !tags.includes(tag)).map((tag) => (
                  <button type="button" key={tag} className="brand-button px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all" style={{ background: "var(--button-gradient-soft)", color: "var(--button-gradient-soft-text)", border: "1px solid var(--border)" }} onClick={() => setTags((prev) => [...prev, tag])}>+ {tag}</button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label style={labelStyle}>Services</label>
              <div className="flex flex-wrap gap-2 p-3.5 rounded-xl mb-4 min-h-[52px] items-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                {services.map((service) => (
                  <span key={service} className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(20,184,166,0.1)", color: "var(--teal)", border: "1px solid rgba(20,184,166,0.18)" }}>
                    {service}
                    <button type="button" aria-label={`Remove ${service}`} className="cursor-pointer text-sm px-1" onClick={() => setServices((prev) => prev.filter((entry) => entry !== service))}>×</button>
                  </span>
                ))}
                <input className="bg-transparent border-none text-sm outline-none flex-1 min-w-0 w-full" style={{ color: "var(--text, #f8fafc)", fontFamily: "inherit" }} aria-label="Services" placeholder="Add a service and press Enter..." value={serviceInput} onChange={(event) => setServiceInput(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addUniqueItem(serviceInput, setServiceInput, setServices);
                  }
                }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SERVICES.filter((service) => !services.includes(service)).map((service) => (
                  <button type="button" key={service} className="brand-button px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all" style={{ background: "var(--button-gradient-soft)", color: "var(--button-gradient-soft-text)", border: "1px solid var(--border)" }} onClick={() => setServices((prev) => [...prev, service])}>+ {service}</button>
                ))}
              </div>
            </div>
            <ActionButton disabled={saving} onClick={saveDiscoverability}>{saving ? "Saving..." : "Save services & location"}</ActionButton>
          </SectionCard>
        </div>
      )}

      {profileSub === "Contact" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard>
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Contact Information</h3>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-10">Address</label>
              <input id="business-field-10" style={inputStyle} value={profileForm.address} onChange={(event) => setProfileForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="123 Main St, Regina, SK" />
            </div>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-11">Public contact email (optional)</label>
              <input id="business-field-11" type="email" style={inputStyle} value={profileForm.publicContactEmail} aria-describedby="business-field-11-help" onChange={(event) => setProfileForm((prev) => ({ ...prev, publicContactEmail: event.target.value }))} />
              <p id="business-field-11-help" className="mt-1.5 text-xs" style={{ color: "var(--text-muted, #94a3b8)" }}>
                Shown on your public profile exactly as entered. Leave blank to show no email. IOPPS contacts you privately{profileForm.accountContactEmail ? ` at ${profileForm.accountContactEmail}` : ""}.
              </p>
              {!profileForm.publicContactEmail.trim() && profileForm.accountContactEmail && (
                <button type="button" className="mt-2 text-xs font-semibold underline" style={{ color: "var(--teal, #14b8a6)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  onClick={() => setProfileForm((prev) => ({ ...prev, publicContactEmail: prev.accountContactEmail || "" }))}>
                  Use my account email publicly
                </button>
              )}
            </div>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-12">Phone</label>
              <input id="business-field-12" type="tel" style={inputStyle} value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} />
            </div>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-13">Website</label>
              <input id="business-field-13" type="url" style={inputStyle} value={profileForm.website} onChange={(event) => setProfileForm((prev) => ({ ...prev, website: event.target.value }))} />
            </div>
            <ActionButton disabled={saving} onClick={saveContact}>{saving ? "Saving..." : "Save Contact"}</ActionButton>
          </SectionCard>

          <SectionCard>
            <h3 className="text-base font-bold mb-5" style={{ color: "var(--text, #f8fafc)" }}>Social Media</h3>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-14">LinkedIn</label>
              <input id="business-field-14" style={inputStyle} value={profileForm.linkedin} onChange={(event) => setProfileForm((prev) => ({ ...prev, linkedin: event.target.value }))} placeholder="linkedin.com/company/yourorg" />
            </div>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-15">Instagram</label>
              <input id="business-field-15" style={inputStyle} value={profileForm.instagram} onChange={(event) => setProfileForm((prev) => ({ ...prev, instagram: event.target.value }))} placeholder="instagram.com/yourhandle" />
            </div>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-16">Facebook</label>
              <input id="business-field-16" style={inputStyle} value={profileForm.facebook} onChange={(event) => setProfileForm((prev) => ({ ...prev, facebook: event.target.value }))} placeholder="facebook.com/yourpage" />
            </div>
            <div className="mb-5">
              <label style={labelStyle} htmlFor="business-field-17">Twitter / X</label>
              <input id="business-field-17" style={inputStyle} value={profileForm.twitter} onChange={(event) => setProfileForm((prev) => ({ ...prev, twitter: event.target.value }))} placeholder="x.com/yourhandle" />
            </div>
            {([['tiktok', 'TikTok'], ['youtube', 'YouTube']] as const).map(([key, label]) => <div className="mb-5" key={key}>
              <label style={labelStyle} htmlFor={`business-social-${key}`}>{label}</label>
              <input id={`business-social-${key}`} type="url" style={inputStyle} value={profileForm[key] || ""} onChange={event => setProfileForm(prev => ({ ...prev, [key]: event.target.value }))} placeholder={`https://www.${key}.com/@yourbusiness`} />
            </div>)}
            <ActionButton disabled={saving} onClick={saveContact}>{saving ? "Saving..." : "Save Social"}</ActionButton>
          </SectionCard>
        </div>
      )}

      {profileSub === "Media" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
          <div className="flex flex-col gap-4">
            <ProfileMediaField demo={demo}
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
              <span className="text-xs" style={{ color: "var(--text-sec)" }}>{gallery.length} {gallery.length === 1 ? "image" : "images"}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(30,41,59,0.5)" }}>
                <div className="h-full rounded-full" style={{ width: `${(Math.min(gallery.length, 6) / 6) * 100}%`, background: `linear-gradient(90deg, ${TEAL}, #0F766E)` }} />
              </div>
              <ActionButton disabled={saving} onClick={saveMedia}>{saving ? "Saving..." : "Save Gallery"}</ActionButton>
            </div>
          </div>

          <SectionCard>
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--text, #f8fafc)" }}>Media Preview</h3>
            <div className="rounded-2xl p-5 border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: TEAL }}>
                Your photos
              </div>
              {gallery.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm" style={{ color: "var(--text-sec)", borderColor: "var(--border)" }}>
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
    </section>
  );
}

function ProfileMediaField({ demo, ...props }: React.ComponentProps<typeof ProfileMediaUploader> & { demo: boolean }) {
  if (!demo) return <ProfileMediaUploader {...props} />;
  return <SectionCard><h3 className="font-bold mb-2">{props.title}</h3><p className="text-sm text-text-sec">Upload your {props.slot === "gallery" ? "photos" : props.slot} from your signed-in organization account. Photo uploads are unavailable in this fictional demo.</p></SectionCard>;
}
