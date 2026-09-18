"use client";

import Link from "next/link";
import { useState } from "react";
import CanonicalEditProfileTab, { type DashboardProfileForm, type HoursMap, type ProfileSection } from "@/components/org-dashboard/CanonicalEditProfileTab";
import { normalizeOrganizationProfilePatch } from "@/lib/organization-profile";

const initialForm: DashboardProfileForm = {
  name: "Prairie Pathways — Demo Company", businessIdentity: "not_specified",
  tagline: "Good work starts with a connection.",
  description: "A fictional organization offering community event planning and communications services. Use this sample to explore how your own business could tell its story on IOPPS.",
  industry: "Professional Services", size: "1-10", foundedYear: "", city: "Saskatoon", province: "SK", address: "",
  website: "", contactEmail: "hello@example.invalid", phone: "", linkedin: "", instagram: "", facebook: "", twitter: "", logoUrl: "", bannerUrl: "",
};
const initialServices = ["Event planning", "Communications"];
const initialHours = Object.fromEntries(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => [day, { open: "9:00 AM", close: "5:00 PM", isOpen: false }])) as HoursMap;
const previewText = (value: unknown) => typeof value === "string" ? value : "";

export default function BusinessProfileDemo({ publicView, onNameSaved }: { publicView: boolean; onNameSaved: (name: string) => void }) {
  const [profileSub, setProfileSub] = useState<ProfileSection>("Identity");
  const [profileForm, setProfileForm] = useState(initialForm);
  const [hours, setHours] = useState(initialHours);
  const [gallery, setGallery] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>(["Community services"]);
  const [tagInput, setTagInput] = useState("");
  const [services, setServices] = useState(initialServices);
  const [serviceInput, setServiceInput] = useState("");
  const [indigenousGroups, setIndigenousGroups] = useState<string[]>([]);
  const [nation, setNation] = useState("");
  const [treatyTerritory, setTreatyTerritory] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [saved, setSaved] = useState<Record<string, unknown>>({ ...initialForm, location: { city: initialForm.city, province: initialForm.province }, services: initialServices, tags, indigenousGroups, nation, treatyTerritory });
  const saveProfile = async (fields: Record<string, unknown>) => {
    const { updates } = normalizeOrganizationProfilePatch(fields);
    setSaved(current => ({ ...current, ...updates }));
    if (typeof updates.name === "string") onNameSaved(updates.name);
    setSaveMsg("Saved!");
  };
  const checks = [
    { label: "Business name", done: Boolean(profileForm.name.trim()) },
    { label: "Story", done: Boolean(profileForm.description.trim()) },
    { label: "Location", done: Boolean(profileForm.city.trim() && profileForm.province) },
    { label: "Services", done: services.length > 0 },
    { label: "Contact", done: Boolean(profileForm.contactEmail.trim() || profileForm.website.trim() || profileForm.phone.trim()) },
  ];
  const completed = checks.filter(check => check.done).length;
  const location = saved.location as { city?: string; province?: string } | undefined;
  const savedServices = Array.isArray(saved.services) ? saved.services.filter((item): item is string => typeof item === "string") : [];
  const savedGroups = Array.isArray(saved.indigenousGroups) ? saved.indigenousGroups.filter((item): item is string => typeof item === "string") : [];

  return <section>
    <div className="business-demo-toolbar">
      <p>Save a section, then preview it. Changes stay in this demo for this visit. <Link href="/demo/business-review" className="underline">Try the listing review flow →</Link></p>
      <Link className="employer-primary" href={publicView ? "/demo/employer?workspace=business&tab=Profile" : "/demo/employer?workspace=business&tab=Profile&view=public"}>{publicView ? "Edit sample profile" : "Preview sample profile →"}</Link>
    </div>
    {publicView ? <article className="business-demo-public">
      <header><span className="op-eyebrow">Fictional business · profile preview</span><h2>{previewText(saved.name)}</h2><p>{previewText(saved.tagline)}</p><div className="flex flex-wrap gap-2 mt-4">{saved.businessIdentity === "indigenous" && <span className="business-demo-badge">Indigenous-owned or led · demo selection</span>}<span>{[location?.city, location?.province].filter(Boolean).join(", ")}</span></div></header>
      <div className="business-demo-public-content"><section><h3>Our story</h3><p className="whitespace-pre-wrap">{previewText(saved.description)}</p><h3>What we do</h3><div className="flex flex-wrap gap-2">{savedServices.map(service => <span className="business-demo-badge" key={service}>{service}</span>)}</div>{(savedGroups.length > 0 || saved.nation || saved.treatyTerritory) ? <><h3>Community connections</h3><p>{[...savedGroups, previewText(saved.nation), previewText(saved.treatyTerritory)].filter(Boolean).join(" · ")}</p></> : null}</section><aside><h3>Contact details</h3><p>{previewText(saved.contactEmail) || "No public email added"}</p>{saved.phone ? <p>{previewText(saved.phone)}</p> : null}{saved.website ? <p>{previewText(saved.website)}</p> : null}<p className="text-sm mt-4">This is a sample profile. It is not listed publicly, and contact details are shown as text only.</p><Link href="/demo/employer?tab=Post%20a%20Job" className="journey-text-link">Try hiring from this account →</Link></aside></div>
    </article> : <CanonicalEditProfileTab demo
      profileSub={profileSub} setProfileSub={section => { setProfileSub(section); setSaveMsg(""); }} profileForm={profileForm} setProfileForm={setProfileForm}
      hours={hours} setHours={setHours} gallery={gallery} setGallery={setGallery} tags={tags} setTags={setTags} tagInput={tagInput} setTagInput={setTagInput}
      services={services} setServices={setServices} serviceInput={serviceInput} setServiceInput={setServiceInput} indigenousGroups={indigenousGroups} setIndigenousGroups={setIndigenousGroups}
      nation={nation} setNation={setNation} treatyTerritory={treatyTerritory} setTreatyTerritory={setTreatyTerritory} saving={false} saveMsg={saveMsg} saveProfile={saveProfile}
      profileChecks={{ checks, completed, total: checks.length, percent: Math.round(completed / checks.length * 100) }} getToken={async () => { throw new Error("Demo uploads are unavailable"); }}
      persistSingleMedia={async () => { throw new Error("Demo uploads are unavailable"); }} isSchool={false} schoolIsPublished={false} toggleSchoolPublished={async () => {}}
    />}
  </section>;
}
