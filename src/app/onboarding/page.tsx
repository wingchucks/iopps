"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import AppShell from "@/components/AppShell";

const NATIONS = [
  "Cree (Nehiyaw)", "Ojibwe (Anishinaabe)", "Métis (Michif)", "Inuit",
  "Mohawk (Kanien'kehá:ka)", "Mi'kmaq (Mi'kmaw)", "Dene", "Blackfoot (Siksika)",
  "Coast Salish", "Dakota/Lakota/Nakota", "Haudenosaunee", "Nuu-chah-nulth",
  "Tlingit", "Haida", "Other", "Prefer not to say",
];

const TERRITORIES = [
  "Treaty 1", "Treaty 2", "Treaty 3", "Treaty 4", "Treaty 5", "Treaty 6",
  "Treaty 7", "Treaty 8", "Treaty 9", "Treaty 10", "Treaty 11",
  "Robinson-Superior", "Robinson-Huron", "Modern Treaty", "Unceded Territory",
  "Prefer not to say",
];

const PRONOUNS = ["He/Him", "She/Her", "They/Them", "Two-Spirit", "Prefer not to say"];

const EXPERIENCE = ["Student", "Entry Level", "Mid-Career", "Senior", "Executive", "Elder/Advisor"];

const INDUSTRIES = [
  "Healthcare", "Education", "Government", "Mining", "Technology",
  "Construction", "Social Services", "Gaming & Entertainment",
  "Arts & Culture", "Legal & Justice", "Transportation", "Other",
];

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Casual", "Internship"];

const CSS = {
  bg: "#0B1120",
  card: "#111827",
  border: "rgba(255,255,255,.08)",
  text: "#F9FAFB",
  textSec: "#9CA3AF",
  teal: "#14B8A6",
  tealSoft: "rgba(20,184,166,.15)",
  input: "#1E293B",
};

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 32 : 10,
            height: 10,
            borderRadius: 5,
            background: i <= current ? CSS.teal : "rgba(255,255,255,.1)",
            transition: "all .3s",
          }}
        />
      ))}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 13, fontWeight: 600, color: CSS.textSec, display: "block", marginBottom: 6 }}>{children}</label>;
}

function InputField({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "10px 14px", borderRadius: 10,
        background: CSS.input, border: `1px solid ${CSS.border}`,
        color: CSS.text, fontSize: 14, outline: "none",
      }}
    />
  );
}

function SelectField({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", padding: "10px 14px", borderRadius: 10,
        background: CSS.input, border: `1px solid ${CSS.border}`,
        color: value ? CSS.text : CSS.textSec, fontSize: 14, outline: "none",
        appearance: "none",
      }}
    >
      <option value="">{placeholder || "Select..."}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
      <span style={{ fontSize: 14, color: CSS.text }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
          background: checked ? CSS.teal : "rgba(255,255,255,.15)",
          position: "relative", transition: "background .2s",
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: 9, background: "#fff",
          position: "absolute", top: 3,
          left: checked ? 23 : 3, transition: "left .2s",
        }} />
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLInputElement>(null);

  // Step 1: Identity
  const [nation, setNation] = useState("");
  const [territory, setTerritory] = useState("");
  const [band, setBand] = useState("");
  const [pronouns, setPronouns] = useState("");

  // Step 2: Professional
  const [title, setTitle] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [industry, setIndustry] = useState("");
  const [skillsText, setSkillsText] = useState("");

  // Step 3: Preferences
  const [preferredLocation, setPreferredLocation] = useState("");
  const [remoteOk, setRemoteOk] = useState(false);
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [willingToRelocate, setWillingToRelocate] = useState(false);

  // Step 4: Profile
  const [bio, setBio] = useState("");
  const [openToWork, setOpenToWork] = useState(false);
  const [photoURL, setPhotoURL] = useState("");
  const [resumeURL, setResumeURL] = useState("");
  const [uploading, setUploading] = useState("");

  const toggleJobType = (t: string) => {
    setJobTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const uploadFile = async (file: File, path: string, setter: (url: string) => void) => {
    if (!user) return;
    setUploading(path.includes("avatar") ? "photo" : "resume");
    try {
      const storage = getStorage();
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setter(url);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading("");
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const skills = skillsText.split(",").map((s) => s.trim()).filter(Boolean);
      const data: Record<string, unknown> = { onboardingComplete: true };
      if (nation) data.nation = nation;
      if (territory) data.territory = territory;
      if (band) data.band = band;
      if (pronouns) data.pronouns = pronouns;
      if (title) data.title = title;
      if (experienceLevel) data.experienceLevel = experienceLevel;
      if (industry) data.industry = industry;
      if (skills.length) data.skills = skills;
      if (preferredLocation) data.preferredLocation = preferredLocation;
      data.remoteOk = remoteOk;
      if (jobTypes.length) data.jobTypes = jobTypes;
      data.willingToRelocate = willingToRelocate;
      if (bio) data.bio = bio;
      data.openToWork = openToWork;
      if (photoURL) data.photoURL = photoURL;
      if (resumeURL) data.resumeURL = resumeURL;

      const token = await user.getIdToken();
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      router.push("/feed");
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const STEPS = ["Identity", "Professional", "Preferences", "Profile"];

  return (
    <AppShell>
      <div style={{ minHeight: "100vh", background: CSS.bg, padding: "32px 16px 60px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: CSS.text, textAlign: "center", margin: "0 0 4px" }}>
            Complete Your Profile
          </h1>
          <p style={{ fontSize: 13, color: CSS.textSec, textAlign: "center", margin: "0 0 20px" }}>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>

          <StepDots current={step} total={STEPS.length} />

          <div style={{
            background: CSS.card,
            border: `1px solid ${CSS.border}`,
            borderRadius: 16,
            padding: "24px 20px",
          }}>

            {/* STEP 1: Identity */}
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: 12, color: CSS.teal, margin: 0, padding: "8px 12px", borderRadius: 8, background: CSS.tealSoft }}>
                  🪶 This information is optional and helps personalize your experience
                </p>
                <div><Label>Nation / Affiliation</Label><SelectField value={nation} onChange={setNation} options={NATIONS} placeholder="Select your nation..." /></div>
                <div><Label>Treaty Territory</Label><SelectField value={territory} onChange={setTerritory} options={TERRITORIES} placeholder="Select territory..." /></div>
                <div><Label>Community / Band</Label><InputField value={band} onChange={setBand} placeholder="e.g. Muskeg Lake Cree Nation" /></div>
                <div><Label>Pronouns</Label><SelectField value={pronouns} onChange={setPronouns} options={PRONOUNS} placeholder="Select pronouns..." /></div>
              </div>
            )}

            {/* STEP 2: Professional */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div><Label>Current Role / Title</Label><InputField value={title} onChange={setTitle} placeholder="e.g. Education Consultant" /></div>
                <div><Label>Experience Level</Label><SelectField value={experienceLevel} onChange={setExperienceLevel} options={EXPERIENCE} /></div>
                <div><Label>Industry</Label><SelectField value={industry} onChange={setIndustry} options={INDUSTRIES} /></div>
                <div><Label>Skills (comma-separated)</Label><InputField value={skillsText} onChange={setSkillsText} placeholder="e.g. Leadership, Policy, Community Development" /></div>
              </div>
            )}

            {/* STEP 3: Preferences */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div><Label>Preferred Location</Label><InputField value={preferredLocation} onChange={setPreferredLocation} placeholder="e.g. Saskatoon, SK" /></div>
                <Toggle checked={remoteOk} onChange={setRemoteOk} label="Open to Remote Work" />
                <div>
                  <Label>Job Types Interested In</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {JOB_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => toggleJobType(t)}
                        style={{
                          padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                          border: `1px solid ${jobTypes.includes(t) ? CSS.teal : CSS.border}`,
                          background: jobTypes.includes(t) ? CSS.tealSoft : "transparent",
                          color: jobTypes.includes(t) ? CSS.teal : CSS.textSec,
                          cursor: "pointer",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <Toggle checked={willingToRelocate} onChange={setWillingToRelocate} label="Willing to Relocate" />
              </div>
            )}

            {/* STEP 4: Profile */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <Label>About Me</Label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell employers and the community about yourself..."
                    rows={4}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 10, resize: "vertical",
                      background: CSS.input, border: `1px solid ${CSS.border}`,
                      color: CSS.text, fontSize: 14, outline: "none", fontFamily: "inherit",
                    }}
                  />
                </div>
                <div>
                  <Label>Profile Photo</Label>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && user) uploadFile(file, `avatars/${user.uid}/profile`, setPhotoURL);
                    }}
                  />
                  <button
                    onClick={() => photoRef.current?.click()}
                    style={{
                      padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: CSS.input, border: `1px solid ${CSS.border}`,
                      color: photoURL ? CSS.teal : CSS.textSec, cursor: "pointer", width: "100%",
                    }}
                  >
                    {uploading === "photo" ? "Uploading..." : photoURL ? "✅ Photo uploaded" : "📷 Upload Photo"}
                  </button>
                </div>
                <div>
                  <Label>Resume (PDF)</Label>
                  <input
                    ref={resumeRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && user) uploadFile(file, `resumes/${user.uid}/resume`, setResumeURL);
                    }}
                  />
                  <button
                    onClick={() => resumeRef.current?.click()}
                    style={{
                      padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: CSS.input, border: `1px solid ${CSS.border}`,
                      color: resumeURL ? CSS.teal : CSS.textSec, cursor: "pointer", width: "100%",
                    }}
                  >
                    {uploading === "resume" ? "Uploading..." : resumeURL ? "✅ Resume uploaded" : "📄 Upload Resume"}
                  </button>
                </div>
                <Toggle checked={openToWork} onChange={setOpenToWork} label='Show "Open to Work" on my profile' />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, gap: 12 }}>
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: "transparent", border: `1px solid ${CSS.border}`,
                  color: CSS.textSec, cursor: "pointer",
                }}
              >
                ← Back
              </button>
            ) : <span />}

            <div style={{ display: "flex", gap: 10 }}>
              {step < 3 && (
                <button
                  onClick={() => setStep(step + 1)}
                  style={{
                    padding: "10px 16px", borderRadius: 10, fontSize: 13,
                    background: "transparent", border: "none",
                    color: CSS.textSec, cursor: "pointer",
                  }}
                >
                  Skip
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  style={{
                    padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                    background: CSS.teal, border: "none", color: "#fff", cursor: "pointer",
                  }}
                >
                  Continue →
                </button>
              ) : (
                <button
                  onClick={save}
                  disabled={saving}
                  style={{
                    padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                    background: saving ? CSS.textSec : CSS.teal,
                    border: "none", color: "#fff", cursor: saving ? "default" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Complete Profile ✨"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}