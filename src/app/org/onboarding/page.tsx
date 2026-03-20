"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getOrganization, updateOrganization } from "@/lib/firestore/organizations";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import Button from "@/components/Button";

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Education",
  "Finance",
  "Manufacturing",
  "Construction",
  "Retail",
  "Hospitality",
  "Agriculture",
  "Transportation",
  "Government",
  "Non-Profit",
  "Other",
];

const SIZE_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "500+",
];

const SERVICES = [
  "Recruitment",
  "Training",
  "Mentorship",
  "Scholarships",
  "Events",
  "Community Programs",
];

const INSTITUTION_TYPES = [
  "University",
  "College",
  "Technical Institute",
  "High School",
  "K-12",
  "Language School",
  "Other",
];

const STUDENT_BODY_OPTIONS = [
  "Under 500",
  "500-2000",
  "2000-5000",
  "5000-15000",
  "15000+",
];

const SCHOOL_SERVICES = [
  "Program Listings",
  "Scholarships",
  "Co-op Placements",
  "Career Services",
  "Student Housing",
  "Continuing Education",
  "Indigenous Student Services",
];

const ENROLLMENT_OPTIONS = [
  "Open Enrollment",
  "Application Required",
  "Waitlist",
  "Closed",
];

const PARTNERSHIP_OPTIONS = [
  "Co-op Placements",
  "Job Fairs",
  "Mentorship Programs",
  "Sponsorships",
  "Training Partnerships",
  "Community Events",
];

const PROVINCES = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Nova Scotia",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Northwest Territories",
  "Nunavut",
  "Yukon",
];

const STEPS = ["Identity", "Details", "Capabilities", "Contact"];

export default function OrgOnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orgType, setOrgType] = useState("");

  // School-specific fields
  const [institutionType, setInstitutionType] = useState("");
  const [studentBodySize, setStudentBodySize] = useState("");
  const [accreditation, setAccreditation] = useState("");
  const [campusCount, setCampusCount] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState("");

  // Step 1 — Identity
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [communityAffiliation, setCommunityAffiliation] = useState("");

  // Step 2 — Details
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [website, setWebsite] = useState("");

  // Step 3 — Capabilities
  const [services, setServices] = useState<string[]>([]);
  const [hiringStatus, setHiringStatus] = useState("");
  const [partnershipInterests, setPartnershipInterests] = useState<string[]>([]);

  // Step 4 — Contact
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [facebook, setFacebook] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");

  // Load existing data so user can resume
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/org/signup");
      return;
    }

    (async () => {
      const org = await getOrganization(user.uid);
      if (!org) {
        router.replace("/org/signup");
        return;
      }
      if (org.onboardingComplete) {
        router.replace("/org/plans");
        return;
      }
      // Populate fields from saved data
      if (org.type) setOrgType(org.type);
      if (org.logo) setLogoPreview(org.logo);
      if (org.description) setDescription(org.description);
      if (org.foundedYear) setFoundedYear(String(org.foundedYear));
      if (org.communityAffiliation) setCommunityAffiliation(org.communityAffiliation);
      if (org.industry) setIndustry(org.industry);
      if (org.size) setSize(org.size);
      if (org.location?.city) setCity(org.location.city);
      if (org.location?.province) setProvince(org.location.province);
      if (org.website) setWebsite(org.website);
      if (org.services) setServices(org.services);
      if (org.hiringStatus) setHiringStatus(org.hiringStatus);
      if (org.partnershipInterests) setPartnershipInterests(org.partnershipInterests);
      if (org.phone) setPhone(org.phone);
      if (org.address) setAddress(org.address);
      if (org.socialLinks?.facebook) setFacebook(org.socialLinks.facebook);
      if (org.socialLinks?.linkedin) setLinkedin(org.socialLinks.linkedin);
      if (org.socialLinks?.instagram) setInstagram(org.socialLinks.instagram);
      if (org.socialLinks?.twitter) setTwitter(org.socialLinks.twitter);
      // School-specific
      if (org.institutionType) setInstitutionType(org.institutionType);
      if (org.studentBodySize) setStudentBodySize(org.studentBodySize);
      if (org.accreditation) setAccreditation(org.accreditation);
      if (org.campusCount) setCampusCount(String(org.campusCount));
      if (org.enrollmentStatus) setEnrollmentStatus(org.enrollmentStatus);
      setLoadingData(false);
    })();
  }, [user, authLoading, router]);

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-text-sec text-sm">Loading...</div>
      </div>
    );
  }

  const saveStepProgress = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let logoUrl = logoPreview;

      // Upload logo if a new file was selected
      if (logoFile) {
        const storageRef = ref(storage, `org-logos/${user.uid}`);
        await uploadBytes(storageRef, logoFile);
        logoUrl = await getDownloadURL(storageRef);
        setLogoPreview(logoUrl);
        setLogoFile(null);
      }

      const data: Record<string, unknown> = {};

      // Always save everything so far
      if (logoUrl) data.logo = logoUrl;
      if (description) data.description = description;
      if (foundedYear) data.foundedYear = parseInt(foundedYear, 10);
      if (communityAffiliation) data.communityAffiliation = communityAffiliation;
      if (industry) data.industry = industry;
      if (size) data.size = size;
      if (city || province) data.location = { city, province };
      if (website) data.website = website;
      if (services.length > 0) data.services = services;
      if (hiringStatus) data.hiringStatus = hiringStatus;
      if (partnershipInterests.length > 0) data.partnershipInterests = partnershipInterests;
      if (phone) data.phone = phone;
      if (address) data.address = address;
      data.socialLinks = { facebook, linkedin, instagram, twitter };
      // School-specific fields (conditional inclusion)
      Object.assign(data, {
        ...(institutionType ? { institutionType } : {}),
        ...(studentBodySize ? { studentBodySize } : {}),
        ...(accreditation ? { accreditation } : {}),
        ...(campusCount ? { campusCount: parseInt(campusCount, 10) } : {}),
        ...(enrollmentStatus ? { enrollmentStatus } : {}),
      });

      await updateOrganization(user.uid, data);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    await saveStepProgress();
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStep((s) => s - 1);
  };

  const handleComplete = async () => {
    await saveStepProgress();
    if (!user) return;
    await updateOrganization(user.uid, { onboardingComplete: true });
    router.push("/org/plans");
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleList = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal";

  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div
        className="text-center relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 50%, var(--teal) 100%)",
          padding: "32px 24px 28px",
        }}
      >
        <h1 className="text-white font-black text-2xl tracking-[2px] mb-1 relative">
          Set Up Your Organization
        </h1>
        <p className="text-sm relative" style={{ color: "rgba(255,255,255,.6)" }}>
          Step {step + 1} of {STEPS.length} &mdash; {STEPS[step]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1" style={{ background: "var(--border)" }}>
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progressPct}%`, background: "var(--teal)" }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 flex justify-center" style={{ padding: "32px 24px 120px" }}>
        <div className="w-full max-w-lg">
          {/* Step indicators */}
          <div className="flex gap-2 mb-8">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1 text-center">
                <div
                  className="mx-auto mb-1.5 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    width: 28,
                    height: 28,
                    background: i <= step ? "var(--teal)" : "var(--border)",
                    color: i <= step ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {i < step ? "\u2713" : i + 1}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: i <= step ? "var(--teal)" : "var(--text-muted)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Step 1 — Identity */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <span className="text-sm font-semibold text-text-sec mb-2 block">Organization Logo</span>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-all hover:border-teal"
                    style={{ width: 80, height: 80, background: "var(--card)" }}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-text-muted text-2xl">+</span>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-semibold text-teal cursor-pointer bg-transparent border-none hover:underline"
                    >
                      Upload logo
                    </button>
                    <p className="text-xs text-text-muted mt-1">PNG or JPG, max 2MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                </div>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-text-sec mb-1.5 block">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={inputClass}
                  style={{ resize: "vertical" }}
                  placeholder="Tell the community about your organization..."
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-text-sec mb-1.5 block">Founded Year</span>
                <input
                  type="number"
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 2015"
                  min="1800"
                  max={new Date().getFullYear()}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-text-sec mb-1.5 block">Community Affiliation</span>
                <input
                  type="text"
                  value={communityAffiliation}
                  onChange={(e) => setCommunityAffiliation(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Indigenous community name"
                />
              </label>

              {orgType === "school" && (
                <label className="block">
                  <span className="text-sm font-semibold text-text-sec mb-1.5 block">Institution Type</span>
                  <select
                    value={institutionType}
                    onChange={(e) => setInstitutionType(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select institution type</option>
                    {INSTITUTION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {/* Step 2 — Details */}
          {step === 1 && (
            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-semibold text-text-sec mb-1.5 block">Industry</span>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </label>

              {orgType === "school" ? (
                <>
                  <div>
                    <span className="text-sm font-semibold text-text-sec mb-2 block">Student Body Size</span>
                    <div className="flex flex-wrap gap-2">
                      {STUDENT_BODY_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setStudentBodySize(opt)}
                          className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all border"
                          style={{
                            background: studentBodySize === opt ? "var(--teal)" : "var(--card)",
                            color: studentBodySize === opt ? "#fff" : "var(--text)",
                            borderColor: studentBodySize === opt ? "var(--teal)" : "var(--border)",
                          }}
                        >
                          {opt} students
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-sm font-semibold text-text-sec mb-1.5 block">Accreditation</span>
                    <input
                      type="text"
                      value={accreditation}
                      onChange={(e) => setAccreditation(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. AACSB, Regional Accreditation"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-text-sec mb-1.5 block">Number of Campuses</span>
                    <input
                      type="number"
                      value={campusCount}
                      onChange={(e) => setCampusCount(e.target.value)}
                      className={inputClass}
                      placeholder="e.g. 3"
                      min="1"
                    />
                  </label>
                </>
              ) : (
                <div>
                  <span className="text-sm font-semibold text-text-sec mb-2 block">Organization Size</span>
                  <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSize(opt)}
                        className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all border"
                        style={{
                          background: size === opt ? "var(--teal)" : "var(--card)",
                          color: size === opt ? "#fff" : "var(--text)",
                          borderColor: size === opt ? "var(--teal)" : "var(--border)",
                        }}
                      >
                        {opt} employees
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-semibold text-text-sec mb-1.5 block">City</span>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                    placeholder="City"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-text-sec mb-1.5 block">Province</span>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select</option>
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-text-sec mb-1.5 block">Website</span>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className={inputClass}
                  placeholder="https://yourorg.com"
                />
              </label>
            </div>
          )}

          {/* Step 3 — Capabilities */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <span className="text-sm font-semibold text-text-sec mb-2 block">
                  {orgType === "school" ? "School Services" : "Services Offered"}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(orgType === "school" ? SCHOOL_SERVICES : SERVICES).map((svc) => (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => toggleList(services, svc, setServices)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all border text-left"
                      style={{
                        background: services.includes(svc) ? "var(--teal)" : "var(--card)",
                        color: services.includes(svc) ? "#fff" : "var(--text)",
                        borderColor: services.includes(svc) ? "var(--teal)" : "var(--border)",
                      }}
                    >
                      {services.includes(svc) ? "\u2713 " : ""}{svc}
                    </button>
                  ))}
                </div>
              </div>

              {orgType === "school" ? (
                <div>
                  <span className="text-sm font-semibold text-text-sec mb-2 block">Enrollment Status</span>
                  <div className="flex flex-wrap gap-2">
                    {ENROLLMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEnrollmentStatus(opt)}
                        className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all border"
                        style={{
                          background: enrollmentStatus === opt ? "var(--teal)" : "var(--card)",
                          color: enrollmentStatus === opt ? "#fff" : "var(--text)",
                          borderColor: enrollmentStatus === opt ? "var(--teal)" : "var(--border)",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="text-sm font-semibold text-text-sec mb-2 block">Hiring Status</span>
                  <div className="flex gap-2">
                    {["Actively Hiring", "Open to Applications", "Not Hiring"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setHiringStatus(opt)}
                        className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all border"
                        style={{
                          background: hiringStatus === opt ? "var(--teal)" : "var(--card)",
                          color: hiringStatus === opt ? "#fff" : "var(--text)",
                          borderColor: hiringStatus === opt ? "var(--teal)" : "var(--border)",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-sm font-semibold text-text-sec mb-2 block">Partnership Interests</span>
                <div className="grid grid-cols-2 gap-2">
                  {PARTNERSHIP_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleList(partnershipInterests, opt, setPartnershipInterests)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all border text-left"
                      style={{
                        background: partnershipInterests.includes(opt) ? "var(--teal)" : "var(--card)",
                        color: partnershipInterests.includes(opt) ? "#fff" : "var(--text)",
                        borderColor: partnershipInterests.includes(opt) ? "var(--teal)" : "var(--border)",
                      }}
                    >
                      {partnershipInterests.includes(opt) ? "\u2713 " : ""}{opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Contact */}
          {step === 3 && (
            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-semibold text-text-sec mb-1.5 block">Phone Number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="(555) 123-4567"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-text-sec mb-1.5 block">Address</span>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputClass}
                  placeholder="123 Main St, City, Province"
                />
              </label>

              <div className="pt-2">
                <span className="text-sm font-semibold text-text-sec mb-3 block">Social Media</span>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-medium text-text-muted mb-1 block">Facebook</span>
                    <input
                      type="url"
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      className={inputClass}
                      placeholder="https://facebook.com/yourorg"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-text-muted mb-1 block">LinkedIn</span>
                    <input
                      type="url"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className={inputClass}
                      placeholder="https://linkedin.com/company/yourorg"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-text-muted mb-1 block">Instagram</span>
                    <input
                      type="url"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className={inputClass}
                      placeholder="https://instagram.com/yourorg"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-text-muted mb-1 block">Twitter / X</span>
                    <input
                      type="url"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      className={inputClass}
                      placeholder="https://x.com/yourorg"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button
                onClick={handleBack}
                style={{
                  padding: "14px 24px",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                Back
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button
                primary
                onClick={handleNext}
                style={{
                  background: "var(--teal)",
                  padding: "14px 24px",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 700,
                  flex: step > 0 ? 2 : 1,
                  width: step === 0 ? "100%" : undefined,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Next"}
              </Button>
            ) : (
              <Button
                primary
                onClick={handleComplete}
                style={{
                  background: "var(--teal)",
                  padding: "14px 24px",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 700,
                  flex: 2,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Complete Setup"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
