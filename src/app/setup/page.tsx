"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setupDestination, setupCompletionDestination } from "./destination";
import { useAuth } from "@/lib/auth-context";
import { getMemberProfile, updateMemberProfile } from "@/lib/firestore/members";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { auth, storage } from "@/lib/firebase";
import AccountAvatarMenu from "@/components/AccountAvatarMenu";
import ProtectedRoute from "@/components/ProtectedRoute";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Link from "next/link";
import { interestOptions } from "@/lib/constants/interests";

const stepInfo = [
  { num: 1, title: "Your Profile", subtitle: "Tell us a bit about yourself so the community can connect with you." },
  { num: 2, title: "Identity & Heritage", subtitle: "Share your cultural background and connections." },
  { num: 3, title: "About You", subtitle: "Let the community know what you do and what you bring." },
  { num: 4, title: "Your Interests", subtitle: "Choose what matters most to you and we'll personalize your feed." },
  { num: 5, title: "You're Ready", subtitle: "Welcome to the community. Your journey starts now." },
];

export default function SetupPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<p role="status">Loading your account...</p>}><SetupAccess /></Suspense>
    </ProtectedRoute>
  );
}

function SetupAccess() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [readyUid, setReadyUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadingUser = auth.currentUser;
    if (!loadingUser || loadingUser.uid !== user.uid) return;
    const isCurrent = () => !cancelled && auth.currentUser === loadingUser;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    setError("");
    void (async () => {
      try {
        const token = await user.getIdToken();
        if (!isCurrent()) return;
        const response = await fetch("/api/auth/account", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Account unavailable");
        const data = await response.json();
        if (!isCurrent()) return;
        // Completion is durable, but optional Auth photo sync can fail afterward.
        // Keep that repair reachable after reload without reopening every completed wizard.
        let photoRepair = false;
        if (data.destination === "/feed" && searchParams.get("edit") !== "1") {
          const member = await getMemberProfile(user.uid, controller.signal);
          if (!isCurrent()) return;
          photoRepair = !!member?.photoURL && member.photoURL !== loadingUser.photoURL;
        }
        const destination = setupDestination(data.destination, searchParams, false, photoRepair);
        if (destination) router.replace(destination);
        else setReadyUid(user.uid);
      } catch {
        if (isCurrent()) setError("We couldn’t load your account. Please retry.");
      } finally { clearTimeout(timer); }
    })();
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [user, router, searchParams, attempt]);
  if (!user || readyUid !== user.uid) return <div className="p-8">
    {error ? <><p role="alert">{error}</p><button onClick={() => setAttempt(value => value + 1)}>Try again</button></> : <p role="status">Loading your account...</p>}
  </div>;
  return <SetupWizard key={user.uid} />;
}

function SetupWizard() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [community, setCommunity] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [savedPhotoURL, setSavedPhotoURL] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [nation, setNation] = useState("");
  const [territory, setTerritory] = useState("");
  const [languages, setLanguages] = useState("");
  const [headline, setHeadline] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [targetRolesText, setTargetRolesText] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const { user } = useAuth();
  const router = useRouter();
  const displayName = savedDisplayName || user?.displayName || "there";
  const activeUid = useRef<string | null>(user?.uid ?? null);
  useEffect(() => {
    if (!photoFile) return;
    const preview = URL.createObjectURL(photoFile);
    setPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [photoFile]);
  useEffect(() => {
    activeUid.current = user?.uid ?? null;
    return () => { activeUid.current = null; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoadError(false);
    const loadingUser = auth.currentUser;
    if (!loadingUser || loadingUser.uid !== user.uid) return;
    getMemberProfile(user.uid).then((existing) => {
      if (cancelled || auth.currentUser !== loadingUser) return;
      setBio(existing?.bio || "");
      setCommunity(existing?.community || "");
      setLocation(existing?.location || "");
      setNation(existing?.nation || "");
      setTerritory(existing?.territory || "");
      setLanguages(existing?.languages || "");
      setHeadline(existing?.headline || "");
      setSkillsText(existing?.skillsText ?? existing?.skills?.join(", ") ?? "");
      setTargetRolesText(existing?.targetRoles?.join(", ") ?? "");
      setSavedDisplayName(existing?.displayName || "");
      setInterests(existing?.interests || []);
      setPhotoPreview(existing?.photoURL || null);
      setSavedPhotoURL(existing?.photoURL || null);
      setLoadedUid(user.uid);
    }).catch(() => { if (!cancelled && auth.currentUser === loadingUser) setLoadError(true); });
    return () => { cancelled = true; };
  }, [user, loadAttempt]);

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const parsedSkills = skillsText.split(",").map((s) => s.trim()).filter(Boolean);

  const handleFinish = async () => {
    if (!user || loadedUid !== user.uid || saving) return;
    // Context waits for session reconciliation; also bind to the live SDK
    // object so even a replacement same-UID session cannot resume this save.
    const savingUser = auth.currentUser;
    if (!savingUser || savingUser.uid !== user.uid) return;
    const isCurrent = () => activeUid.current === user.uid && auth.currentUser === savingUser;
    setSaving(true);
    setSaveError("");
    let profileSaved = false;
    let photoSaved = false;
    try {
      const token = await savingUser.getIdToken();
      if (!isCurrent()) return;
      const response = await fetch("/api/profile/setup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ community, location, bio, interests, nation, territory, languages, headline, skillsText, targetRoles: targetRolesText.split(",").map(value => value.trim()).filter(Boolean) }),
      });
      if (!isCurrent()) return;
      if (!response.ok) {
        if (response.status === 400) {
          const result = await response.json().catch(() => null);
          if (!isCurrent()) return;
          const labels: Record<string, string> = {
            community: "Community / First Nation", location: "Location", bio: "Bio",
            nation: "Nation / People", territory: "Territory / Homeland", languages: "Languages Spoken",
            headline: "Professional Headline", skillsText: "Skills", interests: "Interests", targetRoles: "Target Roles",
          };
          if (typeof result?.field === "string" && Object.hasOwn(labels, result.field)) {
            setSaveError(`Check ${labels[result.field]} and try again. Use Back to edit this field. Your draft is still here.`);
            return;
          }
        }
        throw new Error("Setup save failed");
      }
      profileSaved = true;
      // The setup endpoint creates the member atomically. Persist the optional
      // photo afterward, using the existing own-member photo update contract.
      let photoURL = savedPhotoURL;
      if (photoFile) {
        const extension = photoFile.type === "image/png" ? "png" : photoFile.type === "image/webp" ? "webp" : "jpg";
        const target = ref(storage, `avatars/${user.uid}.${extension}`);
        await uploadBytes(target, photoFile);
        if (!isCurrent()) return;
        photoURL = await getDownloadURL(target);
        if (!isCurrent()) return;
        await updateMemberProfile(user.uid, { photoURL });
        if (!isCurrent()) return;
        setSavedPhotoURL(photoURL);
      }
      // Repair a previous sync failure after reload using the saved member URL,
      // without requiring the lost local File or changing the setup transaction.
      if (photoURL && photoURL !== savingUser.photoURL) {
        photoSaved = true;
        await updateProfile(savingUser, { photoURL });
        if (!isCurrent()) return;
      }
      router.push(setupCompletionDestination(searchParams));
    } catch (err) {
      console.error("Failed to save profile:", err);
      if (isCurrent()) setSaveError(photoSaved
        ? "Your profile and photo were saved, but your account photo could not be updated. Please try again."
        : profileSaved
        ? "Your profile was saved, but your photo could not be saved. Your selected photo is still here. Please try again."
        : "Your profile could not be saved. Your draft is still here. Please try again.");
    } finally {
      if (isCurrent()) setSaving(false);
    }
  };

  if (!user || auth.currentUser?.uid !== user.uid) return <p role="status">Loading your profile...</p>;
  if (loadedUid !== user.uid) return <div className="p-8">
    {loadError ? <><p role="alert">We couldn’t load your profile. Please retry.</p><button onClick={() => setLoadAttempt(value => value + 1)}>Try again</button></> : <p role="status">Loading your profile...</p>}
  </div>;

  const currentStepInfo = stepInfo[step - 1];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {saveError && <p role="alert" className="p-4">{saveError}</p>}

      {/* Brand panel */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{
          background: "linear-gradient(160deg, var(--navy-deep) 0%, var(--navy) 40%, #0E4D5A 100%)",
        }}
      >
        <div className="px-8 pt-10 pb-8 lg:pb-0 lg:pt-16 lg:px-12 lg:w-[400px] lg:min-h-screen lg:flex lg:flex-col lg:justify-between relative z-10">
          <div>
            <Link href="/" className="no-underline">
              <h1
                className="text-white font-black tracking-[4px] mb-6 auth-fade-up"
                style={{ fontSize: "clamp(28px, 5vw, 36px)" }}
              >
                IOPPS
              </h1>
            </Link>

            {/* Step indicators — desktop */}
            <div className="hidden lg:flex flex-col gap-0 auth-fade-up" style={{ animationDelay: ".1s" }}>
              {stepInfo.map((s, i) => {
                const isActive = step === s.num;
                const isDone = step > s.num;
                return (
                  <div key={s.num} className="flex gap-4">
                    {/* Dot + line */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 text-sm font-bold"
                        style={{
                          background: isDone
                            ? "var(--teal)"
                            : isActive
                            ? "rgba(13,148,136,.25)"
                            : "rgba(255,255,255,.06)",
                          color: isDone || isActive ? "#fff" : "rgba(255,255,255,.3)",
                          border: isActive ? "2px solid var(--teal)" : "2px solid transparent",
                        }}
                      >
                        {isDone ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          s.num
                        )}
                      </div>
                      {i < stepInfo.length - 1 && (
                        <div
                          className="w-0.5 transition-all duration-300"
                          style={{
                            height: 40,
                            background: isDone ? "var(--teal)" : "rgba(255,255,255,.08)",
                          }}
                        />
                      )}
                    </div>
                    {/* Label */}
                    <div className="pt-1.5 pb-4">
                      <p
                        className="text-sm font-semibold m-0 transition-colors duration-300"
                        style={{ color: isActive || isDone ? "#fff" : "rgba(255,255,255,.3)" }}
                      >
                        {s.title}
                      </p>
                      {isActive && (
                        <p className="text-xs m-0 mt-1 auth-fade-up" style={{ color: "rgba(255,255,255,.45)", maxWidth: 200, lineHeight: 1.5 }}>
                          {s.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom stat */}
          <div className="hidden lg:block pb-12 auth-fade-up" style={{ animationDelay: ".3s" }}>
            <p style={{ color: "rgba(255,255,255,.3)", fontSize: 12 }}>
              Join Indigenous professionals across North America
            </p>
          </div>
        </div>

        {/* Decorative shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute rounded-full"
            style={{
              width: 260, height: 260, top: "20%", right: -60,
              border: "1px solid rgba(13,148,136,.12)",
              animation: "auth-pulse-ring 7s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 160, height: 160, bottom: "20%", left: -40,
              background: "rgba(13,148,136,.05)",
              animation: "auth-float-slow 9s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 bg-bg flex items-start lg:items-center justify-center px-6 py-10 lg:py-8 overflow-y-auto">
        <div className="w-full" style={{ maxWidth: 480 }}>
          <div className="flex justify-end mb-4">
            <AccountAvatarMenu name={displayName} src={user.photoURL} profileHref="/profile" onSignOut={() => router.push("/logout")} />
          </div>

          {/* Mobile step indicator */}
          <div className="lg:hidden mb-6">
            <div className="flex gap-2 mb-2">
              {stepInfo.map(({ num: s }) => (
                <div
                  key={s}
                  className="flex-1 h-1.5 rounded-full transition-all duration-300"
                  style={{ background: s <= step ? "var(--teal)" : "var(--border)" }}
                />
              ))}
            </div>
            <p className="text-xs text-text-muted">Step {step} of {stepInfo.length} — {currentStepInfo.title}</p>
          </div>

          {/* ═══ STEP 1: Profile Basics ═══ */}
          {step === 1 && (
            <div className="auth-scale-in">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-shrink-0">
                  {photoPreview || user?.photoURL ? <img src={photoPreview || user?.photoURL || ""} alt="Profile" className="rounded-2xl object-cover" style={{ width: 64, height: 64 }} /> : <Avatar name={displayName} size={64} />}
                  <button type="button" disabled={saving} onClick={() => photoInput.current?.click()} className="block text-xs text-teal cursor-pointer">Choose profile photo</button>
                  <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size >= 5 * 1024 * 1024) {
                      setPhotoError("Choose a JPG, PNG or WebP image under 5MB.");
                      return;
                    }
                    setPhotoError("");
                    setPhotoFile(file);
                  }} />
                  <p className="text-xs text-text-muted">Optional · saved when you finish setup.</p>
                  {photoError && <p role="alert" className="text-xs">{photoError}</p>}
                </div>
                <div>
                  <h2 className="font-bold text-text m-0" style={{ fontSize: 24 }}>
                    Hey {displayName}!
                  </h2>
                  <p className="text-sm text-text-muted m-0 mt-0.5">Tell us about yourself</p>
                </div>
              </div>

              <label className="block mb-5">
                <span className="text-xs font-semibold text-text-sec mb-2 block tracking-wide uppercase">
                  Community / First Nation
                </span>
                <input
                  type="text"
                  value={community}
                  onChange={(e) => setCommunity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/10"
                  placeholder="e.g. Muskoday First Nation"
                />
              </label>

              <label className="block mb-8">
                <span className="text-xs font-semibold text-text-sec mb-2 block tracking-wide uppercase">
                  Location
                </span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/10"
                  placeholder="e.g. Saskatoon, SK"
                />
              </label>

              <button
                onClick={() => setStep(2)}
                className="brand-button w-full font-bold text-white rounded-xl transition-all duration-200 cursor-pointer border-0"
                style={{
                  background: "var(--button-gradient)",
                  padding: "14px 24px",
                  fontSize: 15,
                  boxShadow: "var(--button-gradient-shadow)",
                }}
              >
                Continue
              </button>

              <button
                onClick={() => { handleFinish(); }}
                disabled={saving}
                className="w-full mt-3 text-sm font-medium text-text-muted bg-transparent border-0 cursor-pointer hover:text-text-sec transition-colors py-2"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* ═══ STEP 2: Identity & Heritage ═══ */}
          {step === 2 && (
            <div className="auth-scale-in">
              <h2 className="font-bold text-text mb-1" style={{ fontSize: 24 }}>Identity & Heritage</h2>
              <p className="text-sm text-text-muted mb-7">
                Share your cultural background and connections. All fields are optional.
              </p>

              <label className="block mb-5">
                <span className="text-xs font-semibold text-text-sec mb-2 block tracking-wide uppercase">
                  Nation / People
                </span>
                <input
                  type="text"
                  value={nation}
                  onChange={(e) => setNation(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/10"
                  placeholder="e.g. Cree, Anishinaabe, Metis"
                />
              </label>

              <label className="block mb-5">
                <span className="text-xs font-semibold text-text-sec mb-2 block tracking-wide uppercase">
                  Territory / Homeland
                </span>
                <input
                  type="text"
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/10"
                  placeholder="e.g. Treaty 6, Metis Nation Region 3"
                />
              </label>

              <label className="block mb-8">
                <span className="text-xs font-semibold text-text-sec mb-2 block tracking-wide uppercase">
                  Languages Spoken
                </span>
                <input
                  type="text"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/10"
                  placeholder="e.g. Cree, Michif, English, French"
                />
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 font-semibold rounded-xl cursor-pointer transition-all duration-200 button-gradient-soft text-text border border-border hover:border-text-muted"
                  style={{ padding: "14px 24px", fontSize: 15 }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="brand-button flex-[2] font-bold text-white rounded-xl transition-all duration-200 cursor-pointer border-0"
                  style={{
                    background: "var(--button-gradient)",
                    padding: "14px 24px",
                    fontSize: 15,
                    boxShadow: "var(--button-gradient-shadow)",
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: About You ═══ */}
          {step === 3 && (
            <div className="auth-scale-in">
              <h2 className="font-bold text-text mb-1" style={{ fontSize: 24 }}>About You</h2>
              <p className="text-sm text-text-muted mb-7">
                Let the community know what you do and what you bring. All fields are optional.
              </p>

              <label className="block mb-5">
                <span className="text-xs font-semibold text-text-sec mb-2 block tracking-wide uppercase">
                  Professional Headline
                </span>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => {
                    if (e.target.value.length <= 80 || e.target.value.length < headline.length) setHeadline(e.target.value);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/10"
                  placeholder="e.g. Software Developer | Treaty 6"
                />
                <span className="text-xs text-text-muted mt-1 block text-right">{headline.length}/80</span>
              </label>

              <label className="block mb-5">
                <span className="text-xs font-semibold text-text-sec mb-2 block tracking-wide uppercase">
                  Short Bio
                </span>
                <textarea
                  value={bio}
                  onChange={(e) => { setBio(e.target.value); }}
                  aria-describedby="setup-bio-count"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/10 resize-none"
                  placeholder="A few words about yourself..."
                />
                <span id="setup-bio-count" aria-live="polite" className="text-xs text-text-muted mt-1 block text-right">
                  {`${bio.length} characters`}
                </span>
              </label>

              <label className="block mb-8">
                <span className="text-xs font-semibold text-text-sec mb-2 block tracking-wide uppercase">
                  Skills
                </span>
                <input
                  type="text"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/10"
                  placeholder="e.g. Project Management, Web Development"
                />
                <span className="text-xs text-text-muted mt-1 block">Comma-separated</span>
              </label>

              <div className="mb-8">
                <label htmlFor="setup-target-roles" className="text-xs font-semibold text-text-sec mb-2 block tracking-wide uppercase">Target Roles</label>
                <input id="setup-target-roles" type="text" value={targetRolesText} onChange={event => setTargetRolesText(event.target.value)}
                  aria-describedby="setup-target-roles-help"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all duration-200 focus:border-teal focus:ring-2 focus:ring-teal/10" />
                <p id="setup-target-roles-help" className="text-xs text-text-muted mt-1">Optional · comma-separated</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 font-semibold rounded-xl cursor-pointer transition-all duration-200 button-gradient-soft text-text border border-border hover:border-text-muted"
                  style={{ padding: "14px 24px", fontSize: 15 }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="brand-button flex-[2] font-bold text-white rounded-xl transition-all duration-200 cursor-pointer border-0"
                  style={{
                    background: "var(--button-gradient)",
                    padding: "14px 24px",
                    fontSize: 15,
                    boxShadow: "var(--button-gradient-shadow)",
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: Interests ═══ */}
          {step === 4 && (
            <div className="auth-scale-in">
              <h2 className="font-bold text-text mb-1" style={{ fontSize: 24 }}>What interests you?</h2>
              <p className="text-sm text-text-muted mb-7">
                Select categories to personalize your feed. You can change these later.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {interestOptions.map((opt) => {
                  const selected = interests.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      aria-pressed={selected}
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

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 font-semibold rounded-xl cursor-pointer transition-all duration-200 button-gradient-soft text-text border border-border hover:border-text-muted"
                  style={{ padding: "14px 24px", fontSize: 15 }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="brand-button flex-[2] font-bold text-white rounded-xl transition-all duration-200 cursor-pointer border-0"
                  style={{
                    background: "var(--button-gradient)",
                    padding: "14px 24px",
                    fontSize: 15,
                    boxShadow: "var(--button-gradient-shadow)",
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: Confirmation + Preview ═══ */}
          {step === 5 && (
            <div className="auth-scale-in">
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{ background: "var(--green-soft)" }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 className="font-bold text-text mb-1" style={{ fontSize: 24 }}>You&apos;re all set!</h2>
                <p className="text-sm text-text-muted max-w-xs mx-auto">
                  Here&apos;s a preview of your profile. You can edit everything later.
                </p>
              </div>

              {/* Profile preview card */}
              <div
                className="rounded-2xl border border-border overflow-hidden mb-8"
                style={{ background: "var(--card)" }}
              >
                {/* Mini banner */}
                <div
                  className="h-16"
                  style={{ background: "linear-gradient(135deg, var(--navy-deep), var(--navy), #0E4D5A)" }}
                />
                <div className="px-5 pb-5" style={{ marginTop: -28 }}>
                  <div className="flex items-end gap-3 mb-3">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile"
                        className="rounded-xl object-cover border-4 border-card"
                        style={{ width: 56, height: 56 }}
                      />
                    ) : user?.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="rounded-xl object-cover border-4 border-card"
                        style={{ width: 56, height: 56 }}
                      />
                    ) : (
                      <div className="border-4 border-card rounded-xl">
                        <Avatar name={displayName} size={48} />
                      </div>
                    )}
                    <div className="pb-0.5">
                      <p className="text-base font-bold text-text m-0">{displayName}</p>
                      {headline && <p className="text-xs text-text-sec m-0 mt-0.5">{headline}</p>}
                      {community && <p className="text-xs text-teal m-0">{community}</p>}
                    </div>
                  </div>
                  {bio && (
                    <p className="text-sm text-text-sec mb-3 leading-relaxed">{bio}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {location && (
                      <Badge text={`\u{1F4CD} ${location}`} color="var(--text-sec)" small />
                    )}
                    {nation && (
                      <Badge text={nation} color="var(--gold)" small />
                    )}
                    {territory && (
                      <Badge text={territory} color="var(--gold)" small />
                    )}
                    {languages && (
                      <Badge text={`\u{1F5E3}\u{FE0F} ${languages}`} color="var(--purple)" small />
                    )}
                    {parsedSkills.length > 0 && (
                      <>
                        {parsedSkills.slice(0, 3).map((skill) => (
                          <Badge key={skill} text={skill} color="var(--teal)" small />
                        ))}
                        {parsedSkills.length > 3 && (
                          <Badge text={`+${parsedSkills.length - 3} more`} color="var(--text-muted)" small />
                        )}
                      </>
                    )}
                    {interests.map((id) => {
                      const opt = interestOptions.find((o) => o.id === id);
                      return opt ? (
                        <Badge key={id} text={`${opt.icon} ${opt.label}`} color="var(--teal)" small />
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 font-semibold rounded-xl cursor-pointer transition-all duration-200 button-gradient-soft text-text border border-border hover:border-text-muted"
                  style={{ padding: "14px 24px", fontSize: 15 }}
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="brand-button flex-[2] font-bold text-white rounded-xl transition-all duration-200 cursor-pointer border-0 disabled:opacity-60"
                  style={{
                    background: "var(--button-gradient)",
                    padding: "14px 24px",
                    fontSize: 15,
                    boxShadow: "var(--button-gradient-shadow)",
                  }}
                >
                  {saving ? "Saving..." : "Go to My Feed"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
