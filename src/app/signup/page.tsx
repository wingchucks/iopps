"use client";

import React, { Suspense, useState, useCallback, useRef, useEffect } from "react";
import { readSignupDraft, saveSignupDraft, clearSignupDraft, SIGNUP_DRAFT_TTL } from "@/lib/signup-draft";
import { decodeEmployerDraft, encodeEmployerDraft, employerDraftKey } from "@/lib/employer-draft";
import { authIntentHref, postSignupDestination, signupPasswordError } from "@/lib/auth-redirect";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authErrorMessage } from "@/lib/auth-errors";
import { organizationSetupError, organizationContactEmailError } from "@/lib/organization-setup-error";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAppCheckTokenValue, storage } from "@/lib/firebase";
import { ONE_TIME_PLANS, SUBSCRIPTION_PLANS } from "@/lib/pricing";
import {
  BackgroundMesh, TopBar, ProgressBar, StepDots,
  FormInput, FormSelect, FormTextarea, CheckboxItem, UploadZone,
  RoleCard, BtnPrimary, BtnSecondary, BtnGhost,
  InfoBanner, ReviewSection, ReviewRow, GoogleButton, PasswordStrength,
} from "@/components/signup/ui";
import {
  CSS, INSTITUTION_TYPES, PROVINCES, INDIGENOUS_SERVICES,
  EMPLOYER_CAPABILITIES,
} from "@/components/signup/constants";

import { StepHeader } from "./StepHeader";

type Role = "" | "community" | "organization";
type OrgType = "" | "employer" | "school";
type BusinessIdentity = "indigenous" | "non_indigenous" | "not_specified";
interface Campus { name: string; city: string; }

const BUSINESS_IDENTITY_OPTIONS: Array<{
  value: BusinessIdentity;
  label: string;
  description: string;
}> = [
  {
    value: "indigenous",
    label: "Indigenous business or employer",
    description: "Create your organization profile for free.",
  },
  {
    value: "non_indigenous",
    label: "Non-Indigenous company or employer",
    description: "Create your profile now and only pay when you want promoted visibility.",
  },
  {
    value: "not_specified",
    label: "Prefer not to say yet",
    description: "You can update this later from your organization profile.",
  },
];

function UnifiedSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberDestination = authIntentHref("/setup", new URLSearchParams({ redirect: searchParams.get("redirect") || "" }));
  const orgDestination = postSignupDestination(searchParams, "/org/dashboard");
  const intent = "intent";
  const entrepreneurIntent = searchParams.get(intent) === "indigenous-business";
  const explicitOrganization = searchParams.get("resume") === "organization" || searchParams.get("type") === "employer" || entrepreneurIntent;
  const { signUp, signInWithGoogle, user, loading: authLoading, sendVerificationEmail, reloadUser } = useAuth();

  const [step, setStep] = useState(1);
  const formStartedAtRef = useRef(Date.now());
  const [role, setRole] = useState<Role>(searchParams.get("resume") === "organization" ? "organization" : (entrepreneurIntent || searchParams.get("type") === "employer") ? "organization" : "");
  const [websiteTrap, setWebsiteTrap] = useState("");
  const [orgType, setOrgType] = useState<OrgType>(searchParams.get("resume") === "organization" ? "employer" : (entrepreneurIntent || searchParams.get("type") === "employer") ? "employer" : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // C-5: field-level validation errors keyed by input id (name, email, password, confirmPassword)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [accountUid, setAccountUid] = useState<string | null>(null);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [signupNotice, setSignupNotice] = useState("");
  const [deliveryNotice, setDeliveryNotice] = useState("");


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
  const [selectedPlan, setSelectedPlan] = useState(["tier1", "tier2", "featured-post"].includes(searchParams.get("plan") || "") ? searchParams.get("plan")! : "");

  // Employer
  const [orgName, setOrgName] = useState("");
  const [businessIdentity, setBusinessIdentity] = useState<BusinessIdentity>("not_specified");
  const [empDescription, setEmpDescription] = useState("");
  const [empWebsite, setEmpWebsite] = useState("");
  const [empServices, setEmpServices] = useState("");
  const [empProvince, setEmpProvince] = useState("");
  const [empCity, setEmpCity] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>(searchParams.get("intent") === "hiring" ? ["post_jobs"] : ["list_business"]);
  const [empLogoFile, setEmpLogoFile] = useState<File | null>(null);
  const [empBannerFile, setEmpBannerFile] = useState<File | null>(null);

  const [draftUid, setDraftUid] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [observedOwner, setObservedOwner] = useState<string | null>(user?.uid ?? null);
  const anonymousExpiresAt = useRef(Date.now() + SIGNUP_DRAFT_TTL);
  const currentOwner = user?.uid ?? null;
  const completedDraft = useRef(false);
  // Invalidate immediately during identity render, including A -> B -> A.
  const operationOwner = useRef({ uid: user?.uid, generation: 0 });
  if (operationOwner.current.uid !== user?.uid) {
    operationOwner.current = { uid: user?.uid, generation: operationOwner.current.generation + 1 };
  }
  useEffect(() => () => { operationOwner.current.generation += 1; }, []);
  useEffect(() => {
    // Reset the previous owner's private state before reading the new UID's draft.
    if (!draftReady || authLoading || observedOwner !== currentOwner) return;
    if (!user || role !== "organization" || orgType !== "employer") return;
    if (draftUid === user.uid) return;
    try {
      const draft = decodeEmployerDraft(user.uid, localStorage.getItem(employerDraftKey(user.uid)));
      if (draft) {
        setAccountUid(user.uid); setEmail(user.email || "");
        setOrgName(draft.orgName); setEmpDescription(draft.empDescription);
        setEmpServices(draft.empServices); setEmpWebsite(draft.empWebsite);
        setEmpProvince(draft.empProvince); setEmpCity(draft.empCity);
        setBusinessIdentity(draft.businessIdentity); setCapabilities(draft.capabilities);
        setStep(user.emailVerified ? draft.step === 3 ? 10 : draft.step : 3);
      }
    } catch { setSignupNotice("Draft storage is unavailable. Keep this tab open until setup is complete."); }
    setDraftUid(user.uid);
  }, [user, role, orgType, accountUid, draftUid, draftReady, authLoading, observedOwner, currentOwner]);

  useEffect(() => {
    if (!user || draftUid !== user.uid || accountUid !== user.uid || role !== "organization" || orgType !== "employer" || completedDraft.current) return;
    try {
      localStorage.setItem(employerDraftKey(user.uid), encodeEmployerDraft(user.uid, { step, orgName, empDescription, empServices, empWebsite, empProvince, empCity, businessIdentity, capabilities }));
    } catch { /* Storage is optional; account and validation remain authoritative. */ }
  }, [user, draftUid, accountUid, role, orgType, step, orgName, empDescription, empServices, empWebsite, empProvince, empCity, businessIdentity, capabilities]);

  useEffect(() => {
    if (authLoading) return;
    if (!draftReady) {
      const draft = readSignupDraft();

      if (!currentOwner && draft && (!explicitOrganization || draft.role === "organization")) {
        setRole(draft.role); setOrgType(draft.orgType); setStep(draft.step);

        anonymousExpiresAt.current = draft.expiresAt;
      }
      if (currentOwner) clearSignupDraft();
      setObservedOwner(currentOwner); setDraftReady(true);
      return;
    }
    if (observedOwner === currentOwner) return;
    clearSignupDraft();
    // Credential creation may notify auth before its promise resolves. Preserve
    // that in-flight flow; an already observed account switch always resets.
    if (observedOwner !== null || (!submitting && accountUid !== currentOwner)) {
      // URL intent is public navigation, never authorization or another user's draft.
      // A cross-tab login can arrive after Continue was clicked while anonymous.
      // Retain only that public URL-intent navigation, never private form state.
      setStep(previous => observedOwner === null && explicitOrganization && previous === 2 ? 2 : 1);
      setRole(explicitOrganization ? "organization" : ""); setOrgType(explicitOrganization ? "employer" : ""); setAccountUid(null); setDraftUid(null);
      setName(""); setEmail(""); setPassword(""); setConfirmPassword(""); setConsent(false);
      setSchoolName(""); setInstitutionType(""); setWebsite(""); setDescription(""); setIndigenousControlled(false);
      setProvince(""); setCity(""); setStreetAddress(""); setPostalCode(""); setAdmissionsPhone(""); setAdmissionsEmail("");
      setCampuses([]); setIndigenousServices([]); setSelectedPlan("");
      setOrgName(""); setEmpDescription(""); setEmpServices(""); setEmpWebsite("");
      setEmpProvince(""); setEmpCity(""); setBusinessIdentity("not_specified"); setCapabilities(["list_business"]);
      setLogoFile(null); setBannerFile(null); setEmpLogoFile(null); setEmpBannerFile(null);
      setWebsiteTrap(""); formStartedAtRef.current = Date.now(); completedDraft.current = false;
      setVerificationEmailSent(false); setSignupNotice(""); setDeliveryNotice("");
      setError(""); setFieldErrors({}); setSubmitting(false);
      anonymousExpiresAt.current = Date.now() + SIGNUP_DRAFT_TTL;
    }
    setObservedOwner(currentOwner);
  }, [authLoading, draftReady, currentOwner, observedOwner, submitting, accountUid, explicitOrganization]);
  useEffect(() => {
    if (!draftReady || authLoading || observedOwner !== currentOwner) return;
    if (user || accountUid) { clearSignupDraft(); return; }
    if (step !== 1 && step !== 2) return;
    saveSignupDraft({ role, orgType, step }, anonymousExpiresAt.current);
  }, [draftReady, authLoading, observedOwner, currentOwner, user, accountUid, role, orgType, step]);

  const goTo = useCallback((s: number) => { setStep(s); setError(""); setFieldErrors({}); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

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

  const verificationDestination = role === "organization"
    ? (step === 13 ? orgDestination : authIntentHref(`/signup?resume=organization&type=${orgType}`, searchParams))
    : memberDestination;

  const handleCreateAccount = async () => {
    if (submitting) return;
    if (!consent) { setError("Please agree to the Terms of Service and Privacy Policy before creating an account."); return; }
    if (user) {
      setError("You’re already signed in. Sign out before creating a different account, or continue from your account dashboard.");
      return;
    }
    setError("");
    // C-5: client-side validation with per-field errors
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Please enter your name.";
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) errs.email = "Email is required.";
    else if (!emailRe.test(email.trim())) errs.email = "Please enter a valid email address.";
    const passwordError = signupPasswordError(password);
    if (passwordError) errs.password = passwordError;
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password.";
    else if (password && confirmPassword !== password) errs.confirmPassword = "Passwords don't match.";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      // scroll first invalid field into view
      const firstKey = ["name", "email", "password", "confirmPassword"].find((k) => errs[k]);
      if (firstKey && typeof document !== "undefined") {
        requestAnimationFrame(() => {
          const el = document.getElementById(firstKey);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            (el as HTMLInputElement).focus({ preventScroll: true });
          }
        });
      }
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
        const outcome = await signUp(name, email, password, verificationDestination);
        setAccountUid(outcome.user.uid);
        setVerificationEmailSent(outcome.verificationEmailSent);
        setDeliveryNotice(outcome.verificationError);
        setSignupNotice([outcome.profileError, !outcome.sessionReady ? "Your account was created, but your session needs attention. Please sign in again to continue." : ""].filter(Boolean).join(" "));
        try {
          const cu = outcome.user;
          if (outcome.sessionReady) {
            const t = await cu.getIdToken();
            const profileResponse = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + t },
              body: JSON.stringify({
                displayName: name,
                signupRole: role,
              }),
            });
            if (!profileResponse.ok) throw new Error("Profile save unavailable");
          }
        } catch {
          setSignupNotice(previous => [previous, "Your account was created, but your profile details could not be saved. Please finish them in setup."].filter(Boolean).join(" "));
        }
        goTo(3);
      }
    catch (err: unknown) { setError(authErrorMessage(err, "Signup failed. Please try again.")); }
    finally { setSubmitting(false); }
  };

  const handleGoogle = async () => {
    if (submitting) return;
    if (!consent) { setError("Please agree to the Terms of Service and Privacy Policy before creating an account."); return; }
    setError(""); setSubmitting(true);
    try {
        const cred = await signInWithGoogle();
        try {
          if (cred?.user) {
            const t = await cred.user.getIdToken();
            const profileResponse = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + t },
              body: JSON.stringify({
                displayName: cred.user.displayName || name,
                signupRole: role,
              }),
            });
            if (!profileResponse.ok) throw new Error("Profile save unavailable");
          }
        } catch {
          setSignupNotice("You’re signed in, but your profile details could not be saved. Please finish them in setup.");
        }
        setAccountUid(cred.user.uid);
        setEmail(cred.user.email || "");
        if (!cred.user.emailVerified) {
          goTo(3);
          return;
        }
        if (role === "organization") {
          goTo(orgType === "school" ? 4 : 10);
        } else {
          router.push(memberDestination);
        }
      }
    catch (err: unknown) { setError(authErrorMessage(err, "Google sign-in failed. Please try again.")); }
    finally { setSubmitting(false); }
  };

  const handleContinueAfterVerification = async () => {
    setError("");
    if (!user || (accountUid && user.uid !== accountUid)) {
      setError("Please sign in to the account you just created before continuing.");
      return;
    }

    setSubmitting(true);
    try {
      if (!await reloadUser(accountUid || user.uid)) {
        setError("Please verify your email before continuing.");
        return;
      }

      if (role === "organization") {
        goTo(orgType === "school" ? 4 : 10);
      } else {
        router.push(memberDestination);
      }
    } catch (err: unknown) {
      setError(authErrorMessage(err, "We couldn’t verify your session. Please retry."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (submitting) return;
    if (!user || (accountUid && user.uid !== accountUid)) { setError("Please sign in to the account you just created before requesting another email."); return; }
    setError("");
    setSubmitting(true);
    try {
      const sent = await sendVerificationEmail(verificationDestination, accountUid || user.uid);
      setVerificationEmailSent(sent);
      if (sent) setDeliveryNotice("");
    } catch (err: unknown) {
      setError(authErrorMessage(err, "Failed to resend verification email. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const uploadFile = async (file: File, path: string, isCurrent: () => boolean = () => true) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    if (!isCurrent()) return "";
    return getDownloadURL(storageRef);
  };

  const handleSchoolSubmit = async () => {
    if (!user) return;
    if (!selectedPlan) { goTo(8); setError("Choose a plan before continuing."); return; }
    setSubmitting(true); setError("");
    try {
      const logoUrl = logoFile ? await uploadFile(logoFile, `org-logos/${user.uid}`) : "";
      const bannerUrl = bannerFile ? await uploadFile(bannerFile, `org-banners/${user.uid}`) : "";
      const idToken = await user.getIdToken();
      const appCheckToken = await getAppCheckTokenValue();
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
        },
        body: JSON.stringify({
          ...orgData,
          contactName: name || schoolName,
          contactEmail: email || user.email,
          honeypot: websiteTrap,
          formStartedAt: formStartedAtRef.current,
        }),
      });
      if (!res.ok) {
        setError(organizationSetupError(res.status, await res.json().catch(() => null))); return;
      }
      // Navigate to authenticated checkout for explicit review; signup never grants a plan.
      const checkoutIntent = new URLSearchParams(searchParams.toString());
      checkoutIntent.set("plan", selectedPlan);
      router.push(postSignupDestination(checkoutIntent, "/org/plans"));
    } catch (err: unknown) { setError(authErrorMessage(err, "We couldn’t save your organization profile. Check the required details and try again.")); }
    finally { setSubmitting(false); }
  };

  const handleEmployerSubmit = async () => {
    if (submitting) return;
    if (!user || (accountUid && user.uid !== accountUid)) { setError("Sign in to the account that owns this draft, then resume organization setup."); return; }
    if (!user.emailVerified) { goTo(3); setError("Verify your email before creating your organization."); return; }
    const contactError = organizationContactEmailError(email || user.email);
    if (contactError) { setError(contactError); return; }
    if (!orgName.trim() || !empDescription.trim() || !empServices.trim()) { goTo(10); setError("Enter your organization name, description and services before continuing."); return; }
    const operationUser = user;
    const generation = ++operationOwner.current.generation;
    const isCurrent = () => operationOwner.current.uid === operationUser.uid && operationOwner.current.generation === generation;
    setSubmitting(true); setError("");
    try {
      const logoUrl = empLogoFile ? await uploadFile(empLogoFile, `org-logos/${operationUser.uid}`, isCurrent) : "";
      if (!isCurrent()) return;
      const bannerUrl = empBannerFile ? await uploadFile(empBannerFile, `org-banners/${operationUser.uid}`, isCurrent) : "";
      if (!isCurrent()) return;
      const idToken = await operationUser.getIdToken();
      if (!isCurrent()) return;
      const appCheckToken = await getAppCheckTokenValue();
      if (!isCurrent()) return;
      const orgData: Record<string, unknown> = {
        name: orgName, type: "employer",
        businessIdentity,
        description: empDescription,
        website: empWebsite,
        services: empServices.split(",").map(service => service.trim()).filter((service, index, all) => service.length > 0 && all.indexOf(service) === index),
        ...(empProvince || empCity ? { location: { ...(empProvince ? { province: empProvince } : {}), ...(empCity ? { city: empCity } : {}) } } : {}),
        ...(capabilities.length > 0 ? { capabilities } : {}),
        ...(logoUrl ? { logoUrl, logo: logoUrl } : {}),
        ...(bannerUrl ? { bannerUrl } : {}),
        onboardingComplete: true,
      };
      const res = await fetch("/api/employer/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
          ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
        },
        body: JSON.stringify({
          ...orgData,
          contactName: name || orgName,
          contactEmail: email || user.email,
          honeypot: websiteTrap,
          formStartedAt: formStartedAtRef.current,
        }),
      });
      if (!res.ok) {
        const failure = await res.json().catch(() => null);
        if (isCurrent()) setError(organizationSetupError(res.status, failure));
        return;
      }
      // A completed request owns only its captured draft, never the next account's UI.
      try { localStorage.removeItem(employerDraftKey(operationUser.uid)); } catch { /* optional storage */ }
      if (!isCurrent()) return;
      completedDraft.current = true;
      await operationUser.getIdToken(true);
      if (!isCurrent()) return;
      if (operationUser.emailVerified) {
        router.push(orgDestination);
      } else {
        goTo(13); // success+verify step
      }
    } catch (err: unknown) { if (isCurrent()) setError(authErrorMessage(err, "We couldn’t save your organization profile. Check the required details and try again.")); }
    finally { if (isCurrent()) setSubmitting(false); }
  };

  const toggleService = (id: string) => setIndigenousServices(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const toggleCapability = (id: string) => setCapabilities(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);
  const addCampus = () => setCampuses(p => [...p, { name: "", city: "" }]);
  const removeCampus = (i: number) => setCampuses(p => p.filter((_, idx) => idx !== i));
  const updateCampus = (i: number, f: keyof Campus, v: string) => setCampuses(p => p.map((c, idx) => idx === i ? { ...c, [f]: v } : c));

  // Do not expose the previous account's fields even for the render before reset effects.
  if ((observedOwner !== currentOwner && !(observedOwner === null && accountUid === currentOwner)) || (draftUid && draftUid !== user?.uid)) return <p role="status">Updating account…</p>;

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: CSS.bg, color: CSS.text, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <BackgroundMesh />
      <div style={{ position: "sticky", top: 0, zIndex: 50, flexShrink: 0 }}>
        <TopBar loginHref={authIntentHref("/login", searchParams)} stepLabel={`Step ${current} of ${total}`} />
        <ProgressBar percent={percent} />
      </div>
      <fieldset disabled={!draftReady || authLoading} style={{ border: 0, minWidth: 0, position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px", flex: 1, width: "100%" }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-10000px",
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
        >
          <label htmlFor="unified-signup-website-trap">Website</label>
          <input
            id="unified-signup-website-trap"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={websiteTrap}
            onChange={(event) => setWebsiteTrap(event.target.value)}
          />
        </div>
        <StepDots labels={labels} current={current} />

        {(signupNotice || deliveryNotice) && <div role="status" style={{ marginBottom: 24 }}>{signupNotice} {deliveryNotice} <a href={authIntentHref("/login", searchParams)}>Sign in</a></div>}
        {error && <div role="alert" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: CSS.error }}>{error}</div>}

        {/* STEP 1 */}
        {step === 1 && (<div>
          {entrepreneurIntent && (
            <InfoBanner icon="🪶"><strong style={{ color: CSS.text }}>Indigenous Entrepreneur Signup</strong><br />Your free business profile and directory listing starts here.</InfoBanner>
          )}
          <StepHeader eyebrow={entrepreneurIntent ? "Free Business Profile" : "Getting Started"} title={entrepreneurIntent ? "Create your" : "What kind of"} highlight={entrepreneurIntent ? "Business Profile" : "account do you need?"} desc={entrepreneurIntent ? "Help customers discover your work with a free business profile. First, choose who you’re joining as." : "Are you signing up for yourself or on behalf of an organization?"} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RoleCard icon="👤" label="Individual" desc="For people looking for jobs, training, scholarships, events, or professional connections." selected={role === "community"} onClick={() => { setRole("community"); setOrgType(""); }} />
            <RoleCard icon="🏢" label={entrepreneurIntent ? "My business" : "Business or organization"} desc={entrepreneurIntent ? "Showcase your products and services, share your story, and help customers find you." : "Create a public profile, promote your work, or hire talent. For businesses, First Nations, nonprofits, and organizations."} selected={role === "organization"} onClick={() => { setRole("organization"); setOrgType("employer"); }} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <BtnPrimary onClick={() => goTo(2)} disabled={!role || (role === "organization" && !orgType)}>Continue →</BtnPrimary>
          </div>
        </div>)}

        {/* STEP 2 */}
        {step === 2 && (<div>
          <StepHeader eyebrow="Account Setup" title="Create your" highlight="Account" desc={orgType === "school" ? "Create your admin account. You'll set up your school profile next." : "Enter your details to get started."} />
          <div style={{ marginBottom: 20 }}>
            <input id="signup-consent" type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} />{" "}
            <label htmlFor="signup-consent">I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></label>
          </div>
          {user && searchParams.get("resume") === "organization" && (
            <BtnSecondary onClick={() => {
              setAccountUid(user.uid);
              setEmail(user.email || "");
              goTo(user.emailVerified ? (orgType === "school" ? 4 : 10) : 3);
            }}>Continue organization setup as {user.email}</BtnSecondary>
          )}
          <GoogleButton onClick={handleGoogle} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
            <div style={{ flex: 1, height: 1, background: CSS.border }} />
            <span style={{ fontSize: 12, color: CSS.textDim, textTransform: "uppercase", letterSpacing: "0.1em" }}>or sign up with email</span>
            <div style={{ flex: 1, height: 1, background: CSS.border }} />
          </div>
          <div style={{ display: "grid", gap: 20 }}>
            <div>
              <FormInput id="name" label={role === "organization" ? "Your Name (Contact Person)" : orgType === "school" ? "Contact Name" : "Your Name"} required autoComplete="name" error={fieldErrors.name} placeholder={role === "organization" ? "e.g., Jane Smith" : "Your full name"} value={name} onChange={e => { setName(e.target.value); if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: "" })); }} />
              {role === "organization" && <div style={{ fontSize: 12, color: CSS.textDim, marginTop: 6, paddingLeft: 2 }}>&#8594; You&apos;ll enter your <strong style={{ color: CSS.textMuted }}>business name</strong> in Basics, after email verification.</div>}
            </div>
            <FormInput id="email" label="Email Address" required type="email" autoComplete="email" error={fieldErrors.email} placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" })); }} />
            <div className="signup-account-password-grid grid grid-cols-1 gap-5 min-w-0 sm:grid-cols-2">
              <div><FormInput id="password" label="Password" required type="password" minLength={8} autoComplete="new-password" error={fieldErrors.password} placeholder="Min. 8 characters" value={password} onChange={e => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" })); }} /><PasswordStrength password={password} /></div>
              <FormInput id="confirmPassword" label="Confirm Password" required type="password" minLength={8} autoComplete="new-password" error={fieldErrors.confirmPassword} placeholder="Re-enter password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: "" })); }} />
            </div>
          </div>

          <div style={{ marginTop: 24, background: CSS.card, border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: CSS.success, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span></div>
            <span style={{ fontSize: 13, color: CSS.success }}>Secure account creation</span>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
            <BtnGhost onClick={() => goTo(1)}>← Back</BtnGhost>
            <BtnPrimary onClick={handleCreateAccount} disabled={submitting}>{submitting ? "Creating..." : "Create Account →"}</BtnPrimary>
          </div>
        </div>)}

        {/* STEP 3 */}
        {step === 3 && (<div>
          <StepHeader eyebrow="Verification" title="Check your" highlight="Inbox" desc={verificationEmailSent ? `We've sent a verification link to ${email || "your email"}.` : "Verify your email address to continue. Request a verification link below."} />
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📧</div>
            <div style={{ fontSize: 14, color: CSS.textDim, marginBottom: 8 }}>Didn&apos;t receive it? Check your spam folder.</div>
            <div style={{ fontSize: 14, color: CSS.textDim, marginBottom: 24 }}>Still nothing? Click below to resend.</div>
            <BtnSecondary onClick={handleResendVerification}>
              {submitting ? "Sending..." : "Resend Verification Email"}
            </BtnSecondary>
          </div>
          {role === "community" && <InfoBanner icon="🎉"><strong style={{ color: CSS.text }}>You&apos;re all set!</strong> Verify your email, then finish your member setup.</InfoBanner>}
          {role === "organization" && (<div>
            <InfoBanner icon="🏢"><strong style={{ color: CSS.text }}>One more thing!</strong> Set up your organization profile next (~3 minutes).</InfoBanner>
          </div>)}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <BtnPrimary onClick={handleContinueAfterVerification} disabled={submitting}>
              {submitting ? "Checking..." : role === "organization" ? "I've Verified My Email →" : "Continue to Setup →"}
            </BtnPrimary>
          </div>
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
            <div style={{ fontSize: 32, fontWeight: 800 }}>{SUBSCRIPTION_PLANS.tier3.priceLabel} <span style={{ fontSize: 14, fontWeight: 400, color: CSS.textMuted }}>CAD</span></div>
            <div style={{ fontSize: 12, color: CSS.textDim, marginBottom: 16 }}>per year</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              {[SUBSCRIPTION_PLANS.tier3.features.slice(0, 3), SUBSCRIPTION_PLANS.tier3.features.slice(3)].map((col,ci) => (
                <ul key={ci} style={{ listStyle: "none", padding: 0, margin: 0 }}>{col.map(f => <li key={f} style={{ fontSize: 13, color: CSS.textMuted, padding: "6px 0", display: "flex", gap: 8 }}><span style={{ color: CSS.accent, fontWeight: 700, fontSize: 12 }}>✓</span>{f}</li>)}</ul>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: CSS.textMuted }}>Or: Pay Per Post</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { id: "standard-post", l: ONE_TIME_PLANS["standard-post"].title, p: ONE_TIME_PLANS["standard-post"].priceLabel, n: "per post · 45 days" },
                { id: "featured-post", l: ONE_TIME_PLANS["featured-post"].title, p: ONE_TIME_PLANS["featured-post"].priceLabel, n: "per post · 45 days", b: ONE_TIME_PLANS["featured-post"].badge },
                { id: "program-post", l: ONE_TIME_PLANS["program-post"].title, p: ONE_TIME_PLANS["program-post"].priceLabel, n: "per post · 45 days" },
              ].map(x => (
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
            <ReviewRow label="Plan" value={<span style={{ color: CSS.accent, fontWeight: 600 }}>{!selectedPlan ? "No plan selected" : selectedPlan === "tier3" ? `School - ${SUBSCRIPTION_PLANS.tier3.priceLabel}/yr` : selectedPlan === "program-post" ? `${ONE_TIME_PLANS["program-post"].title} - ${ONE_TIME_PLANS["program-post"].priceLabel}` : selectedPlan === "standard-post" ? `${ONE_TIME_PLANS["standard-post"].title} - ${ONE_TIME_PLANS["standard-post"].priceLabel}` : `${ONE_TIME_PLANS["featured-post"].title} - ${ONE_TIME_PLANS["featured-post"].priceLabel}`}</span>} />
            {selectedPlan === "tier3" && <><ReviewRow label="Programs" value="20 program listings" /><ReviewRow label="Jobs" value="Unlimited" /><ReviewRow label="Featured" value="6 included" /></>}
          </ReviewSection>
          <InfoBanner icon="💳"><strong style={{ color: CSS.text }}>Ready to pay?</strong> Secure Stripe checkout. Account activates immediately after payment.</InfoBanner>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}><BtnGhost onClick={() => goTo(8)}>← Back</BtnGhost><BtnPrimary onClick={handleSchoolSubmit} disabled={submitting} style={{ flex: 1, justifyContent: "center" }}>{submitting ? "Processing..." : "Proceed to Payment →"}</BtnPrimary></div>
        </div>)}

        {/* STEP 10: Employer Basics */}
        {step === 10 && (<div>
          <StepHeader eyebrow={entrepreneurIntent ? "Business Profile — 1 of 3" : "Organization Setup — 1 of 3"} title="About your" highlight={entrepreneurIntent ? "Business" : "Organization"} desc={entrepreneurIntent ? "Share the essentials customers need to discover your business." : "Tell us about your business."} />
          <div style={{ display: "grid", gap: 20 }}>
            <FormInput label={entrepreneurIntent ? "Business Name" : "Organization Name"} required placeholder="e.g., Northern Resources Inc." value={orgName} onChange={e => setOrgName(e.target.value)} />
            <FormTextarea label="Short Business Description" required placeholder="Tell people what your business does and who you serve." maxLength={600} value={empDescription} onChange={e => setEmpDescription(e.target.value)} />
            <FormInput label="Products or Services (comma-separated)" required maxLength={500} placeholder="e.g., Catering, Consulting, Handmade goods" value={empServices} onChange={e => setEmpServices(e.target.value)} />
            <FormInput label="Website" type="url" maxLength={300} placeholder="https://www.yourbusiness.ca" value={empWebsite} onChange={e => setEmpWebsite(e.target.value)} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted, marginBottom: 8 }}>How should we represent your business?</div>
              <div style={{ display: "grid", gap: 12 }}>
                {BUSINESS_IDENTITY_OPTIONS.map((option) => (
                  <button className="brand-button"
                    key={option.value}
                    type="button"
                    onClick={() => setBusinessIdentity(option.value)}
                    style={{
                      textAlign: "left",
                      padding: "16px 18px",
                      borderRadius: 14,
                      border: `1px solid ${businessIdentity === option.value ? CSS.accent : CSS.border}`,
                      background: businessIdentity === option.value ? "rgba(20,184,166,0.08)" : CSS.card,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: CSS.text, marginBottom: 4 }}>{option.label}</div>
                    <div style={{ fontSize: 12, color: CSS.textDim }}>{option.description}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <FormSelect label="Province / Territory" required={entrepreneurIntent} value={empProvince} onChange={e => setEmpProvince(e.target.value)} options={[{ value: "", label: "Select..." }, ...PROVINCES.map(p => ({ value: p, label: p }))]} />
              <FormInput label="City" required={entrepreneurIntent} placeholder="City" value={empCity} onChange={e => setEmpCity(e.target.value)} />
            </div>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted, marginBottom: 8 }}>What do you want to do on IOPPS?</div><p style={{fontSize:13,color:CSS.textMuted,marginBottom:12}}>One account for your organization. Promote your business, hire, or do both. Posting jobs is optional.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{EMPLOYER_CAPABILITIES.map(c => <CheckboxItem key={c.id} icon={c.icon} label={c.label} checked={capabilities.includes(c.id)} onToggle={() => toggleCapability(c.id)} />)}</div>
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <InfoBanner icon="💡">
              Indigenous and non-Indigenous organizations can start with a Free Starter profile. A paid plan or featured-post purchase is needed for promoted visibility, not account creation. Standard is {SUBSCRIPTION_PLANS.tier1.priceLabel} CAD/year; Premium is {SUBSCRIPTION_PLANS.tier2.priceLabel} CAD/year. Review the plan features before purchasing.
            </InfoBanner>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}><BtnGhost onClick={() => goTo(3)}>← Back</BtnGhost><BtnPrimary onClick={() => goTo(11)} disabled={!orgName.trim() || !empDescription.trim() || !empServices.trim() || (entrepreneurIntent && (!empCity.trim() || !empProvince))}>Continue →</BtnPrimary></div>
        </div>)}

        {/* STEP 11: Employer Brand */}
        {step === 11 && (<div>
          <StepHeader eyebrow={entrepreneurIntent ? "Business Profile — 2 of 3" : "Organization Setup — 2 of 3"} title="Brand your" highlight="Profile" desc="Logo and cover image are optional. You can add or change them later in your organization profile. Selected files must be reselected after a refresh." />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[200px_1fr]">
            <div><div style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted, marginBottom: 8 }}>Logo (optional)</div><UploadZone label="Upload Logo" hint="400×400px, PNG or JPG" hasFile={!!empLogoFile} onFileChange={setEmpLogoFile} /></div>
            <div><div style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted, marginBottom: 8 }}>Cover Image</div><UploadZone label="Upload Cover" hint="1200×400px recommended" hasFile={!!empBannerFile} onFileChange={setEmpBannerFile} /></div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32 }}><BtnGhost onClick={() => goTo(10)}>← Back</BtnGhost><BtnSecondary onClick={() => { setEmpLogoFile(null); setEmpBannerFile(null); goTo(12); }}>Skip for now</BtnSecondary><BtnPrimary onClick={() => goTo(12)}>Continue →</BtnPrimary></div>
        </div>)}

        {/* STEP 12: Employer Launch */}
        {step === 12 && (<div>
          <StepHeader eyebrow={entrepreneurIntent ? "Business Profile — 3 of 3" : "Organization Setup — 3 of 3"} title="Ready to" highlight="Launch?" desc="Your organization profile is ready." />
          <ReviewSection icon="🏢" title="Organization Summary" onEdit={() => goTo(10)}>
            <ReviewRow label="Name" value={orgName} />
            <ReviewRow label="Business Identity" value={BUSINESS_IDENTITY_OPTIONS.find(option => option.value === businessIdentity)?.label || "Not set"} />
            <ReviewRow label="Description" value={empDescription} />
            <ReviewRow label="Products or Services" value={empServices} />
            <ReviewRow label="Website" value={empWebsite || "Not set"} />
            <ReviewRow label="Location" value={[empCity, empProvince].filter(Boolean).join(", ") || "Not set"} />
            <ReviewRow label="Capabilities" value={<div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>{capabilities.map(id => { const c = EMPLOYER_CAPABILITIES.find(x => x.id === id); return <span key={id} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: CSS.accentLight, color: CSS.accent, fontWeight: 500 }}>{c?.label || id}</span>; })}</div>} />
          </ReviewSection>
          <InfoBanner icon="✅"><strong style={{ color: CSS.text }}>Ready to create your profile.</strong> Verify your email to use your dashboard and post jobs. Submit your business listing for review when it is ready; it appears in the directory after approval.</InfoBanner>
          <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "center" }}><BtnGhost onClick={() => goTo(11)}>← Back</BtnGhost><BtnPrimary onClick={handleEmployerSubmit} disabled={submitting} style={{ flex: 1, justifyContent: "center" }}>{submitting ? "Creating..." : "Create organization profile"}</BtnPrimary></div>
        </div>)}

        {/* STEP 13: Post-launch success + email verify reminder (stays in wizard UI) */}
        {step === 13 && (<div>
          <div style={{ textAlign: "center", padding: "40px 0 32px" }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: CSS.text, marginBottom: 8 }}>You&apos;re almost live!</div>
            <div style={{ fontSize: 16, color: CSS.textMuted, marginBottom: 32, lineHeight: 1.6 }}>
              <strong style={{ color: CSS.text }}>{orgName}</strong> has been created.<br />
              One last step — verify your email to activate your profile.
            </div>
          </div>
          <div style={{ background: CSS.card, border: `1px solid rgba(20,184,166,0.25)`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ fontSize: 32 }}>📧</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: CSS.text, marginBottom: 4 }}>Check your inbox</div>
                <div style={{ fontSize: 13, color: CSS.textMuted, lineHeight: 1.5 }}>
                  {verificationEmailSent ? "We sent a verification link to " : "Request a verification link for "}<strong style={{ color: CSS.accent }}>{email || "your email"}</strong>.<br />
                  Check your spam folder if you don&apos;t see it within a minute.
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: CSS.card, border: `1px solid ${CSS.border}`, borderRadius: 16, padding: 24, marginBottom: 32 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: CSS.textMuted, marginBottom: 16 }}>What happens next</div>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                { icon: "✉️", text: "Click the verification link in your email" },
                { icon: "🏢", text: "After verification, your organization dashboard unlocks" },
                { icon: "💼", text: "Start posting jobs and reaching Indigenous talent" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: CSS.textMuted }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <BtnSecondary onClick={handleResendVerification}>
              {submitting ? "Sending..." : "Resend Verification Email"}
            </BtnSecondary>
            <BtnPrimary onClick={() => router.push(`/verify-email?next=${encodeURIComponent(orgDestination)}`)}>Verify Email to Continue &rarr;</BtnPrimary>
          </div>
        </div>)}

      </fieldset>
    </div>
  );
}

export default function UnifiedSignupPage() {
  return (
    <Suspense fallback={null}>
      <UnifiedSignupContent />
    </Suspense>
  );
}
