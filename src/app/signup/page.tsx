"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  BackgroundMesh, TopBar, ProgressBar, StepDots, StepHeader,
  FormInput, FormSelect, FormTextarea, CheckboxItem, UploadZone,
  RoleCard, OrgTypeCard, BtnPrimary, BtnSecondary, BtnGhost,
  InfoBanner, ReviewSection, ReviewRow, GoogleButton, PasswordStrength,
} from "@/components/signup/ui";
import {
  CSS, INSTITUTION_TYPES, PROVINCES, INDIGENOUS_SERVICES,
  EMPLOYER_CAPABILITIES,
} from "@/components/signup/constants";

type Role = "" | "community" | "organization";
type OrgType = "" | "employer" | "school";
interface Campus { name: string; city: string; }

export default function UnifiedSignupPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, user } = useAuth();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role>("");
  const [orgType, setOrgType] = useState<OrgType>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // School
  const [schoolName, setSchoolName] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [indigenousControlled, setIndigenousControlled] = useState(false);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [admissionsPhone, setAdmissionsPhone] = useState("");
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [indigenousServices, setIndigenousServices] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [admissionsEmail, setAdmissionsEmail] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("tier3");

  // Employer
  const [orgName, setOrgName] = useState("");
  const [empProvince, setEmpProvince] = useState("");
  const [empCity, setEmpCity] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>(["post_jobs"]);
  const [empLogoFile, setEmpLogoFile] = useState<File | null>(null);
  const [empBannerFile, setEmpBannerFile] = useState<File | null>(null);

  const goTo = useCallback((s: number) => { setStep(s); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const getStepInfo = () => {
    if (role === "community") return { labels: ["Role", "Account", "Verify"], total: 3, current: step };
    if (orgType === "school") {
      const labels = ["Role", "Account", "Verify", "Details", "Location", "Services", "Brand", "Plan", "Review"];
      return { labels, total: 9, current: step <= 9 ? step : 9 };
    }
    if (orgType === "employer") {
      const labels = ["Role", "Account", "Verify", "Basics", "Brand", "Launch"];
      let current = step;
      if (step === 10) current = 4;
      if (step === 11) current = 5;
      if (step === 12) current = 6;
      return { labels, total: 6, current };
    }
    return { labels: ["Role", "Account", "Verify"], total: 3, current: step };
  };

  const { labels, total, current } = getStepInfo();
  const percent = Math.max(8, (current / total) * 100);

  const handleCreateAccount = async () => {
    setError("");
    if (!name || !email || !password) { setError("Please fill in all fields"); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setSubmitting(true);
    try { await signUp(name, email, password); goTo(3); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Signup failed"); }
    finally { setSubmitting(false); }
  };

  const handleGoogle = async () => {
    setError(""); setSubmitting(true);
    try { await signInWithGoogle(); goTo(3); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Google sign-in failed"); }
    finally { setSubmitting(false); }
  };

  const uploadFile = async (file: File, path: string) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleSchoolSubmit = async () => {
    if (!user) return;
    setSubmitting(true); setError("");
    try {
      const logoUrl = logoFile ? await uploadFile(logoFile, `org-logos/${user.uid}`) : "";
      const bannerUrl = bannerFile ? await uploadFile(bannerFile, `org-banners/${user.uid}`) : "";
      const idToken = await user.getIdToken();
      const orgData: Record<string, unknown> = {
        name: schoolName, type: "school",
        ...(institutionType ? { institutionType } : {}),
        ...(website ? { website } : {}),
        ...(description ? { description } : {}),
        indigenousControlled,
        ...(province || city ? { location: { ...(province ? { province } : {}), ...(city ? { city } : {}) } } : {}),
        ...(streetAddress ? { address: streetAddress } : {}),
        ...(postalCode ? { postalCode } : {}),
        ...(admissionsPhone ? { phone: admissionsPhone } : {}),
        ...(campuses.length > 0 ? { campuses } : {}),
        ...(indigenousServices.length > 0 ? { indigenousServices } : {}),
        ...(admissionsEmail ? { admissionsEmail } : {}),
        ...(logoUrl ? { logoUrl, logo: logoUrl } : {}),
        ...(bannerUrl ? { bannerUrl } : {}),
        onboardingComplete: true,
      };
      const res = await fetch("/api/employer/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ ...orgData, displayName: name, email }),
      });
      if (!res.ok) throw new Error("Failed to create school profile");
      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan, orgId: user.uid }),
      });
      if (checkoutRes.ok) { const { url } = await checkoutRes.json(); if (url) { window.location.href = url; return; } }
      router.push("/org/dashboard");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to submit"); }
    finally { setSubmitting(false); }
  };

  const handleEmployerSubmit = async () => {
    if (!user) return;
    setSubmitting(true); setError("");
    try {
      const logoUrl = empLogoFile ? await uploadFile(empLogoFile, `org-logos/${user.uid}`) : "";
      const bannerUrl = empBannerFile ? await uploadFile(empBannerFile, `org-banners/${user.uid}`) : "";
      const idToken = await user.getIdToken();
      const orgData: Record<string, unknown> = {
        name: orgName, type: "employer",
        ...(empProvince || empCity ? { location: { ...(empProvince ? { province: empProvince } : {}), ...(empCity ? { city: empCity } : {}) } } : {}),
        ...(capabilities.length > 0 ? { capabilities } : {}),
        ...(logoUrl ? { logoUrl, logo: logoUrl } : {}),
        ...(bannerUrl ? { bannerUrl } : {}),
        onboardingComplete: true,
      };
      const res = await fetch("/api/employer/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ ...orgData, displayName: name || orgName, email }),
      });
      if (!res.ok) throw new Error("Failed to create org");
      router.push("/org/dashboard");
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to submit"); }
    finally { setSubmitting(false); }
  };

  const toggleService = (id: string) => setIndigenousServices(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const toggleCapability = (id: string) => setCapabilities(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);
  const addCampus = () => setCampuses(p => [...p, { name: "", city: "" }]);
  const removeCampus = (i: number) => setCampuses(p => p.filter((_, idx) => idx !== i));
  const updateCampus = (i: number, f: keyof Campus, v: string) => setCampuses(p => p.map((c, idx) => idx === i ? { ...c, [f]: v } : c));

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: CSS.bg, color: CSS.text, minHeight: "100vh" }}>
      <BackgroundMesh />
      <TopBar stepLabel={`Step ${current} of ${total}`} />
      <ProgressBar percent={percent} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <StepDots labels={labels} current={current} />

        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: CSS.error }}>{error}</div>}

        {/* STEP 1 */}
        {step === 1 && (<div>
          <StepHeader eyebrow="Getting Started" title="Join the" highlight="Community" desc="Choose how you'd like to use IOPPS. You can always expand your account later." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <RoleCard icon="👤" label="Community Member" desc="Find jobs, scholarships, events, and connect with Indigenous professionals across Canada." selected={role === "community"} onClick={() => { setRole("community"); setOrgType(""); }} />
            <RoleCard icon="🏢" label="Organization" desc="Post jobs, list programs, host events, and reach Indigenous talent nationwide." selected={role === "organization"} onClick={() => setRole("organization")} />
          </div>
          {role === "organization" && (<div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: CSS.textMuted }}>What type of organization?</div>
            <div style={{ display: "grid", gap: 12 }}>
              <OrgTypeCard icon="💼" label="Employer / Business" desc="Post jobs, list your business, host events, and connect with talent." selected={orgType === "employer"} onClick={() => setOrgType("employer")} />
              <OrgTypeCard icon="🎓" label="School / Educational Institution" desc="List training programs, post jobs, offer scholarships, and recruit Indigenous students." selected={orgType === "school"} onClick={() => setOrgType("school")} />
            </div>
          </div>)}
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <BtnPrimary onClick={() => goTo(2)} disabled={!role || (role === "organization" && !orgType)}>Continue →</BtnPrimary>
          </div>
        </div>)}

        {/* STEP 2 */}
        {step === 2 && (<div>
          <StepHeader eyebrow="Account Setup" title="Create your" highlight="Account" desc={orgType === "school" ? "Create your admin account. You'll set up your school profile next." : "Enter your details to get started."} />
          <GoogleButton onClick={handleGoogle} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: CSS.border }} />
            <span style={{ fontSize: 12, color: CSS.textDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>or sign up with email</span>
            <div style={{ flex: 1, height: 1, background: CSS.border }} />
          </div>
          <div style={{ display: "grid", gap: 20 }}>
            <FormInput label={orgType === "school" ? "Contact Name" : "Display Name"} required placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
            <FormInput label="Email Address" required type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div><FormInput label="Password" required type="password" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} /><PasswordStrength password={password} /></div>
              <FormInput label="Confirm Password" required type="password" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 24, background: CSS.card, border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: CSS.success, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span></div>
            <span style={{ fontSize: 13, color: CSS.success }}>Protected by reCAPTCHA Enterprise</span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <BtnGhost onClick={() => goTo(1)}>← Back</BtnGhost>
            <BtnPrimary onClick={handleCreateAccount} disabled={submitting}>{submitting ? "Creating..." : "Create Account →"}</BtnPrimary>
          </div>
        </div>)}

        {/* STEP 3 */}
        {step === 3 && (<div>
          <StepHeader eyebrow="Verification" title="Check your" highlight="Inbox" desc={`We've sent a verification link to ${email || "your email"}.`} />
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📧</div>
            <div style={{ fontSize: 14, color: CSS.textDim, marginBottom: 24 }}>Didn&apos;t receive it? Check spam or</div>
            <BtnSecondary>Resend Verification Email</BtnSecondary>
          </div>
          {role === "community" && <InfoBanner icon="🎉"><strong style={{ color: CSS.text }}>You&apos;re all set!</strong> Once verified, explore jobs, events, and more.</InfoBanner>}
          {role === "organization" && (<div>
            <InfoBanner icon="🏢"><strong style={{ color: CSS.text }}>One more thing!</strong> Set up your organization profile next (~3 minutes).</InfoBanner>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
              <BtnPrimary onClick={() => goTo(orgType === "school" ? 4 : 10)}>Continue to Setup →</BtnPrimary>
            </div>
          </div>)}
        </div>)}

        {/* STEP 4: School Details */}
        {step === 4 && (<div>
          <StepHeader eyebrow="School Setup — 1 of 6" title="Tell us about your" highlight="Institution" desc="Basic details about your school." />
          <div style={{ display: "grid", gap: 20 }}>
            <FormInput label="Institution Name" required placeholder="e.g., First Nations University of Canada" value={schoolName} onChange={e => setSchoolName(e.target.value)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <FormSelect label="Institution Type" required value={institutionType} onChange={e => setInstitutionType(e.target.value)} options={[{ value: "", label: "Select type..." }, ...INSTITUTION_TYPES]} />
              <FormInput label="Website" placeholder="https://www.yourschool.ca" value={website} onChange={e => setWebsite(e.target.value)} />
            </div>
            <FormTextarea label="Short Description" required placeholder="Brief overview (max 300 chars)" maxLength={300} value={description} onChange={e => setDescription(e.target.value)} />
            <CheckboxItem icon="🏛️" label="This is an Indigenous-controlled institution" checked={indigenousControlled} onToggle={() => setIndigenousControlled(!indigenousControlled)} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}><BtnGhost onClick={() => goTo(3)}>← Back</BtnGhost><BtnPrimary onClick={() => goTo(5)} disabled={!schoolName || !institutionType}>Continue →</BtnPrimary></div>
        </div>)}

        {/* STEP 5: Location */}
        {step === 5 && (<div>
          <StepHeader eyebrow="School Setup — 2 of 6" title="Where are you" highlight="Located?" desc="Add your main campus and any additional locations." />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Main Campus</div>
          <div style={{ display: "grid", gap: 20, marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <FormSelect label="Province / Territory" required value={province} onChange={e => setProvince(e.target.value)} options={[{ value: "", label: "Select..." }, ...PROVINCES.map(p => ({ value: p, label: p }))]} />
              <FormInput label="City" required placeholder="e.g., Regina" value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <FormInput label="Street Address" placeholder="1 First Nations Way" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <FormInput label="Postal Code" placeholder="S4S 7K2" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
              <FormInput label="Admissions Phone" placeholder="(306) 555-0100" value={admissionsPhone} onChange={e => setAdmissionsPhone(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Additional Campuses</span>
            <button onClick={addCampus} style={{ fontSize: 13, color: CSS.accent, cursor: "pointer", fontWeight: 500, background: "none", border: "none", fontFamily: "inherit" }}>+ Add Campus</button>
          </div>
          {campuses.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end", padding: 16, background: "rgba(15,23,42,0.5)", borderRadius: 10, border: `1px solid ${CSS.borderLight}`, marginBottom: 8 }}>
              <FormInput label="Campus Name" placeholder="e.g., Northern Campus" value={c.name} onChange={e => updateCampus(i, "name", e.target.value)} />
              <FormInput label="City" placeholder="City" value={c.city} onChange={e => updateCampus(i, "city", e.target.value)} />
              <button onClick={() => removeCampus(i)} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${CSS.border}`, background: "transparent", color: CSS.textDim, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}><BtnGhost onClick={() => goTo(4)}>← Back</BtnGhost><BtnPrimary onClick={() => goTo(6)} disabled={!province || !city}>Continue →</BtnPrimary></div>
        </div>)}

        {/* STEP 6: Services */}
        {step === 6 && (<div>
          <StepHeader eyebrow="School Setup — 3 of 6" title="Indigenous" highlight="Services" desc="What Indigenous-specific supports does your institution offer?" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {INDIGENOUS_SERVICES.map(s => <CheckboxItem key={s.id} icon={s.icon} label={s.label} checked={indigenousServices.includes(s.id)} onToggle={() => toggleService(s.id)} />)}
          </div>
          <div style={{ marginTop: 24 }}><InfoBanner icon="💡">Students search by these services. The more you share, the easier it is for the right students to find you.</InfoBanner></div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}><BtnGhost onClick={() => goTo(5)}>← Back</BtnGhost><BtnSecondary onClick={() => goTo(7)}>Skip for now</BtnSecondary><BtnPrimary onClick={() => goTo(7)}>Continue →</BtnPrimary></div>
        </div>)}

        {/* STEP 7: Branding */}
        {step === 7 && (<div>
          <StepHeader eyebrow="School Setup — 4 of 6" title="Brand your" highlight="Profile" desc="Upload your logo and banner to stand out." />
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, marginBottom: 24 }}>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted, marginBottom: 8 }}>Logo</div><UploadZone label="Upload Logo" hint="400×400px, PNG or JPG" hasFile={!!logoFile} onFileChange={setLogoFile} /></div>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted, marginBottom: 8 }}>Banner Image</div><UploadZone label="Upload Banner" hint="1200×400px recommended" hasFile={!!bannerFile} onFileChange={setBannerFile} /></div>
          </div>
          <FormInput label="Admissions Email" type="email" placeholder="admissions@yourschool.ca" value={admissionsEmail} onChange={e => setAdmissionsEmail(e.target.value)} />
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}><BtnGhost onClick={() => goTo(6)}>← Back</BtnGhost><BtnSecondary onClick={() => goTo(8)}>Skip for now</BtnSecondary><BtnPrimary onClick={() => goTo(8)}>Continue →</BtnPrimary></div>
        </div>)}

        {/* STEP 8: Plan */}
        {step === 8 && (<div>
          <StepHeader eyebrow="School Setup — 5 of 6" title="Your" highlight="Plan" desc="Choose your plan to get started." />
          <div onClick={() => setSelectedPlan("tier3")} style={{ background: CSS.card, border: `1px solid ${selectedPlan === "tier3" ? CSS.accent : CSS.border}`, borderRadius: 16, padding: 24, cursor: "pointer", position: "relative", boxShadow: selectedPlan === "tier3" ? `0 0 0 1px ${CSS.accent}, 0 8px 32px rgba(20,184,166,0.12)` : "none" }}>
            <div style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 20, background: `linear-gradient(135deg,${CSS.accent},${CSS.blue})`, color: "#fff" }}>School Plan</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>School Subscription</div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>$5,500 <span style={{ fontSize: 14, fontWeight: 400, color: CSS.textMuted }}>CAD</span></div>
            <div style={{ fontSize: 12, color: CSS.textDim, marginBottom: 16 }}>per year</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              {[["20 program listings","Unlimited job posts","6 featured listings","Dedicated account manager"],["Custom branding","Advanced analytics","Student inquiry inbox","Public school profile"]].map((col,ci) => (
                <ul key={ci} style={{ listStyle: "none", padding: 0, margin: 0 }}>{col.map(f => <li key={f} style={{ fontSize: 13, color: CSS.textMuted, padding: "6px 0", display: "flex", gap: 8 }}><span style={{ color: CSS.accent, fontWeight: 700, fontSize: 12 }}>✓</span>{f}</li>)}</ul>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: CSS.textMuted }}>Or: Pay Per Post</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[{ id: "standard-post", l: "Standard Job Post", p: "$125", n: "per post · 45 days" },{ id: "featured-post", l: "Featured Job Post", p: "$200", n: "per post · 45 days", b: "Best Value" },{ id: "program-post", l: "Program Post", p: "$50", n: "per post · 45 days" }].map(x => (
                <div key={x.id} onClick={() => setSelectedPlan(x.id)} style={{ background: CSS.card, border: `1px solid ${selectedPlan === x.id ? CSS.accent : x.b ? "rgba(245,158,11,0.3)" : CSS.border}`, borderRadius: 12, padding: 16, textAlign: "center", cursor: "pointer", boxShadow: selectedPlan === x.id ? `0 0 0 1px ${CSS.accent}` : "none" }}>
                  {x.b && <div style={{ fontSize: 10, fontWeight: 600, color: CSS.amber, textTransform: "uppercase", marginBottom: 4 }}>{x.b}</div>}
                  <div style={{ fontSize: 12, color: CSS.textDim, marginBottom: 4 }}>{x.l}</div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{x.p}</div>
                  <div style={{ fontSize: 11, color: CSS.textDim }}>{x.n}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}><BtnGhost onClick={() => goTo(7)}>← Back</BtnGhost><BtnPrimary onClick={() => goTo(9)}>Continue →</BtnPrimary></div>
        </div>)}

        {/* STEP 9: Review */}
        {step === 9 && (<div>
          <StepHeader eyebrow="School Setup — 6 of 6" title="Review &" highlight="Submit" desc="Double-check your information." />
          <ReviewSection icon="🎓" title="Institution Details" onEdit={() => goTo(4)}>
            <ReviewRow label="Name" value={schoolName} />
            <ReviewRow label="Type" value={INSTITUTION_TYPES.find(t => t.value === institutionType)?.label || institutionType} />
            <ReviewRow label="Indigenous-controlled" value={indigenousControlled ? "Yes ✓" : "No"} />
          </ReviewSection>
          <ReviewSection icon="📍" title="Location" onEdit={() => goTo(5)}>
            <ReviewRow label="Main Campus" value={`${city}, ${province}`} />
            <ReviewRow label="Additional Campuses" value={campuses.length > 0 ? `${campuses.length} campus(es)` : "None"} />
          </ReviewSection>
          <ReviewSection icon="🪶" title="Indigenous Services" onEdit={() => goTo(6)}>
            <ReviewRow label="Offered" value={indigenousServices.length > 0
              ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>{indigenousServices.map(id => { const s = INDIGENOUS_SERVICES.find(x => x.id === id); return <span key={id} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: CSS.accentLight, color: CSS.accent, fontWeight: 500 }}>{s?.label || id}</span>; })}</div>
              : "None selected"} />
          </ReviewSection>
          <ReviewSection icon="💳" title="Selected Plan" onEdit={() => goTo(8)}>
            <ReviewRow label="Plan" value={<span style={{ color: CSS.accent, fontWeight: 600 }}>{selectedPlan === "tier3" ? "School — $5,500/yr" : selectedPlan === "program-post" ? "Program Post — $50" : selectedPlan === "standard-post" ? "Job Post — $125" : "Featured — $200"}</span>} />
            {selectedPlan === "tier3" && <><ReviewRow label="Programs" value="20 program listings" /><ReviewRow label="Jobs" value="Unlimited" /><ReviewRow label="Featured" value="6 included" /></>}
          </ReviewSection>
          <InfoBanner icon="💳"><strong style={{ color: CSS.text }}>Ready to pay?</strong> Secure Stripe checkout. Account activates immediately after payment.</InfoBanner>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}><BtnGhost onClick={() => goTo(8)}>← Back</BtnGhost><BtnPrimary onClick={handleSchoolSubmit} disabled={submitting} style={{ flex: 1, justifyContent: "center" }}>{submitting ? "Processing..." : "Proceed to Payment →"}</BtnPrimary></div>
        </div>)}

        {/* STEP 10: Employer Basics */}
        {step === 10 && (<div>
          <StepHeader eyebrow="Employer Setup — 1 of 3" title="About your" highlight="Organization" desc="Tell us about your business." />
          <div style={{ display: "grid", gap: 20 }}>
            <FormInput label="Organization Name" required placeholder="e.g., Northern Resources Inc." value={orgName} onChange={e => setOrgName(e.target.value)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <FormSelect label="Province / Territory" value={empProvince} onChange={e => setEmpProvince(e.target.value)} options={[{ value: "", label: "Select..." }, ...PROVINCES.map(p => ({ value: p, label: p }))]} />
              <FormInput label="City" placeholder="City" value={empCity} onChange={e => setEmpCity(e.target.value)} />
            </div>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted, marginBottom: 8 }}>What do you want to do on IOPPS?</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{EMPLOYER_CAPABILITIES.map(c => <CheckboxItem key={c.id} icon={c.icon} label={c.label} checked={capabilities.includes(c.id)} onToggle={() => toggleCapability(c.id)} />)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}><BtnGhost onClick={() => goTo(3)}>← Back</BtnGhost><BtnPrimary onClick={() => goTo(11)} disabled={!orgName}>Continue →</BtnPrimary></div>
        </div>)}

        {/* STEP 11: Employer Brand */}
        {step === 11 && (<div>
          <StepHeader eyebrow="Employer Setup — 2 of 3" title="Brand your" highlight="Profile" desc="Profiles with branding get 4× more engagement." />
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24 }}>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted, marginBottom: 8 }}>Logo</div><UploadZone label="Upload Logo" hint="400×400px, PNG or JPG" hasFile={!!empLogoFile} onFileChange={setEmpLogoFile} /></div>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted, marginBottom: 8 }}>Cover Image</div><UploadZone label="Upload Cover" hint="1200×400px recommended" hasFile={!!empBannerFile} onFileChange={setEmpBannerFile} /></div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}><BtnGhost onClick={() => goTo(10)}>← Back</BtnGhost><BtnSecondary onClick={() => goTo(12)}>Skip for now</BtnSecondary><BtnPrimary onClick={() => goTo(12)}>Continue →</BtnPrimary></div>
        </div>)}

        {/* STEP 12: Employer Launch */}
        {step === 12 && (<div>
          <StepHeader eyebrow="Employer Setup — 3 of 3" title="Ready to" highlight="Launch?" desc="Your organization profile is ready." />
          <ReviewSection icon="🏢" title="Organization Summary" onEdit={() => goTo(10)}>
            <ReviewRow label="Name" value={orgName} />
            <ReviewRow label="Location" value={[empCity, empProvince].filter(Boolean).join(", ") || "Not set"} />
            <ReviewRow label="Capabilities" value={<div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>{capabilities.map(id => { const c = EMPLOYER_CAPABILITIES.find(x => x.id === id); return <span key={id} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: CSS.accentLight, color: CSS.accent, fontWeight: 500 }}>{c?.label || id}</span>; })}</div>} />
          </ReviewSection>
          <InfoBanner icon="✅"><strong style={{ color: CSS.text }}>Auto-approved!</strong> Your profile goes live immediately after verification.</InfoBanner>
          <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "center" }}><BtnGhost onClick={() => goTo(11)}>← Back</BtnGhost><BtnPrimary onClick={handleEmployerSubmit} disabled={submitting} style={{ flex: 1, justifyContent: "center" }}>{submitting ? "Creating..." : "Publish & Go Live 🚀"}</BtnPrimary></div>
        </div>)}

      </div>
    </div>
  );
}
