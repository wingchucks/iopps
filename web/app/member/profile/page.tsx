"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getMemberProfile, upsertMemberProfile } from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function MemberProfilePage() {
  const { user, role, loading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [education, setEducation] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [indigenousAffiliation, setIndigenousAffiliation] = useState("");
  const [messagingHandle, setMessagingHandle] = useState("");
  const [availability, setAvailability] = useState("");
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeFileName, setResumeFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profileCompletion = useMemo(() => {
    const fields = [
      displayName,
      location,
      skills,
      experience,
      education,
      resumeUrl,
      indigenousAffiliation,
      messagingHandle,
      availability,
    ];
    const filled = fields.filter((field) => field && field.trim().length > 0)
      .length;
    return Math.round((filled / fields.length) * 100) || 0;
  }, [
    availability,
    displayName,
    education,
    experience,
    indigenousAffiliation,
    location,
    messagingHandle,
    resumeUrl,
    skills,
  ]);

  const profileSteps = useMemo(
    () => [
      {
        id: "bio",
        title: "Add your bio and location",
        description: "Share who you are and where employers can find you.",
        complete: Boolean(displayName && location),
      },
      {
        id: "skills",
        title: "List skills & experience",
        description: "Highlight training, education, and project experience.",
        complete: Boolean(skills && experience),
      },
      {
        id: "resume",
        title: "Upload your resume",
        description: "Give employers a downloadable summary.",
        complete: Boolean(resumeUrl),
      },
    ],
    [displayName, experience, location, resumeUrl, skills]
  );

  const handleResumeUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setUploadingResume(true);
      const resumeRef = ref(
        storage,
        `resumes/${user.uid}/${Date.now()}-${file.name}`
      );
      await uploadBytes(resumeRef, file);
      const url = await getDownloadURL(resumeRef);
      setResumeUrl(url);
      setResumeFileName(file.name);
      setStatusMessage("Resume uploaded successfully.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to upload resume."
      );
    } finally {
      setUploadingResume(false);
    }
  };

  useEffect(() => {
    if (!user || role !== "community") return;
    (async () => {
      try {
        const profile = await getMemberProfile(user.uid);
        if (profile) {
          setDisplayName(profile.displayName ?? "");
          setLocation(profile.location ?? "");
          setSkills((profile.skills ?? []).join(", "));
          setExperience(profile.experience ?? "");
          setEducation(profile.education ?? "");
          setResumeUrl(profile.resumeUrl ?? "");
          setIndigenousAffiliation(profile.indigenousAffiliation ?? "");
          setMessagingHandle(profile.messagingHandle ?? "");
          setAvailability(profile.availableForInterviews ?? "");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load your profile. Please try again.");
      }
    })();
  }, [user, role]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setStatusMessage(null);
    setError(null);
    try {
      await upsertMemberProfile(user.uid, {
        displayName,
        location,
        skills: skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        experience,
        education,
        resumeUrl,
        indigenousAffiliation,
        messagingHandle,
        availableForInterviews: availability,
      });
      setStatusMessage("Profile updated!");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Please sign in
        </h1>
        <p className="text-sm text-slate-300">
          Sign in or create an account to build your profile and resume.
        </p>
        <div className="flex gap-3">
          <ButtonLink href="/login">Login</ButtonLink>
          <ButtonLink href="/register" variant="outline">
            Register
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (role !== "community") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Community member access only
        </h1>
        <p className="text-sm text-slate-300">
          Switch to your community account to edit your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Community profile
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        Share your skills, experience, and story. Employers will see these
        details when you apply to jobs in the upcoming releases.
      </p>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Profile completeness
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">
            {profileCompletion}%
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-teal-500 transition-all"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Finish your profile to stand out to employers.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Next steps
          </p>
          <ul className="mt-3 space-y-2 text-xs">
            {profileSteps.map((step) => (
              <li
                key={step.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2"
              >
                <span className="text-left">
                  <span className="block font-semibold text-slate-50">
                    {step.title}
                  </span>
                  <span className="text-slate-400">{step.description}</span>
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em] ${
                    step.complete
                      ? "bg-teal-500/20 text-teal-200"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {step.complete ? "Done" : "Add"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
      >
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Skills
          </label>
          <input
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="Project management, HR, Pow wow logistics"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            Separate skills with commas.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Experience
          </label>
          <textarea
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Education
          </label>
          <textarea
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Resume link
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
            />
            <label className="flex cursor-pointer flex-col text-xs text-slate-200 sm:w-60">
              <span className="mb-1">or upload file</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                className="text-xs text-slate-100"
              />
            </label>
          </div>
          {uploadingResume && (
            <p className="text-xs text-slate-400">Uploading resume...</p>
          )}
          {resumeFileName && (
            <p className="text-xs text-teal-300">
              Uploaded: {resumeFileName}
            </p>
          )}
          {resumeUrl && (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex text-xs text-teal-300 underline"
            >
              View current resume
            </a>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Indigenous affiliation / Nation (optional)
          </label>
          <input
            type="text"
            value={indigenousAffiliation}
            onChange={(e) => setIndigenousAffiliation(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Messaging handle (email, LinkedIn, etc.)
          </label>
          <input
            type="text"
            value={messagingHandle}
            onChange={(e) => setMessagingHandle(e.target.value)}
            placeholder="linkedin.com/in/you or preferred email"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Availability for interviews
          </label>
          <textarea
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            rows={2}
            placeholder="Weekdays after 5 PM, weekends, etc."
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {statusMessage && (
          <p className="text-sm text-teal-300">{statusMessage}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-teal-400 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
