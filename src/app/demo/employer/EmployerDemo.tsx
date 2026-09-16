"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { EmployerOverview } from "@/components/employer/EmployerOverview";

const initialJobs = [
  { id: "demo-1", title: "Community Engagement Coordinator", location: "Saskatoon, SK", status: "active", applicationCount: 2, createdAt: "2026-09-15" },
  { id: "demo-2", title: "Office Administrator", location: "North Battleford, SK", status: "active", applicationCount: 1, createdAt: "2026-09-14" },
  { id: "demo-3", title: "Communications Assistant", location: "Remote", status: "draft", applicationCount: 0, createdAt: "2026-09-16" },
];
const initialPeople = [
  { id: "candidate-1", name: "Sample Candidate A", job: "Community Engagement Coordinator", status: "submitted", note: "" },
  { id: "candidate-2", name: "Sample Candidate B", job: "Community Engagement Coordinator", status: "shortlisted", note: "Sample note: discuss community outreach experience." },
  { id: "candidate-3", name: "Sample Candidate C", job: "Office Administrator", status: "reviewing", note: "" },
];
const tabs = ["Overview", "Jobs", "Applicants", "Post a Job", "Profile"];

export default function EmployerDemo() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = tabs.includes(params.get("tab") || "") ? params.get("tab")! : "Overview";
  const [jobs, setJobs] = useState(initialJobs);
  const [people, setPeople] = useState(initialPeople);
  const [company, setCompany] = useState("Prairie Pathways — Demo Company");
  const [story, setStory] = useState("A fictional organization for exploring the IOPPS employer experience. All roles and applicants on this page are examples.");
  const [notice, setNotice] = useState("");
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const navigate = (next: string) => router.push(`/demo/employer?tab=${encodeURIComponent(next)}`, { scroll: false });
  const saveJob = (status: string) => {
    setJobs(current => [{id: `demo-${Date.now()}`, title, location, status, applicationCount: 0, createdAt: "2026-09-16"}, ...current]);
    setNotice(status === "draft" ? "Demo draft saved for this visit." : "Demo job marked active. Nothing was published publicly.");
    setTitle(""); setLocation(""); setDescription(""); setRequirements(""); setStep(0); navigate("Jobs");
  };
  return <div className="employer-workspace min-h-screen" style={{background:"var(--bg)", color:"var(--text)"}}>
    <div className="demo-banner"><strong>DEMO MODE · Fictional company, jobs and applicants</strong><span>No sign-in needed. Changes last only for this visit. Nothing is posted or sent.</span></div>
    <main className="max-w-[1100px] mx-auto px-4 py-7 md:px-10">
      <div className="flex justify-between gap-4 mb-5"><Link href="/" className="font-bold">IOPPS</Link><button onClick={() => {setJobs(initialJobs); setPeople(initialPeople); setCompany("Prairie Pathways — Demo Company"); setNotice("Demo reset."); setStep(0); setTitle(""); setLocation(""); setDescription(""); setRequirements(""); navigate("Overview");}} className="underline text-sm">Reset demo</button></div>
      <header className="employer-hero rounded-[20px] p-7 mb-6"><p className="text-xs uppercase tracking-widest mb-2">Example employer account</p><h1 className="text-2xl md:text-3xl font-bold">{company}</h1><p className="mt-2">Explore your hiring workspace. Try creating a job and reviewing sample candidates.</p></header>
      <nav className="employer-tabs flex gap-2 mb-6" aria-label="Demo employer navigation">{tabs.map(item => <button key={item} onClick={() => navigate(item)} aria-current={tab === item ? "page" : undefined} className="px-4 py-2 rounded-xl border border-[var(--border)]">{item}</button>)}</nav>
      {notice && <p role="status" className="employer-note mb-5">{notice}</p>}
      {tab === "Overview" && <EmployerOverview demo statsAvailable stats={{totalPosts:jobs.length,activePosts:jobs.filter(j=>j.status === "active").length,applications:people.length,profileViews:48}} jobs={jobs} activity={[{id:"sample-activity",type:"application",message:"Sample Candidate A applied for Community Engagement Coordinator.",timestamp:"2026-09-16"}]} timeAgo={() => "Sample activity"} formatTimestamp={value => `Sample posting · ${String(value)}`} />}
      {tab === "Jobs" && <section className="employer-panel"><div className="employer-section-heading"><h2>Your demo jobs</h2><button className="employer-primary" onClick={() => navigate("Post a Job")}>+ Post a job</button></div>{jobs.map(job => <div key={job.id} className="employer-job-row"><div><label className="block text-xs mb-1" htmlFor={`title-${job.id}`}>Job title</label><input id={`title-${job.id}`} className="demo-input" value={job.title} onChange={e=>setJobs(current=>current.map(j=>j.id===job.id?{...j,title:e.target.value}:j))} /><p>{job.location} · {job.applicationCount} sample applications</p></div><label className="text-xs">Posting status<select className="demo-input mt-1" value={job.status} onChange={e=>{setJobs(current=>current.map(j=>j.id===job.id?{...j,status:e.target.value}:j));setNotice("Demo status updated. No real job was changed.");}}><option value="draft">Draft</option><option value="active">Active</option><option value="closed">Closed</option></select></label></div>)}</section>}
      {tab === "Applicants" && <section><h2 className="text-xl font-bold mb-4">Sample applicants</h2><p className="mb-5 text-sm">Try changing a hiring stage or adding a reviewer note.</p><div className="grid gap-4">{people.map(person=><article className="employer-panel" key={person.id}><div className="flex flex-wrap justify-between gap-4"><div><h3>{person.name}</h3><p>{person.job}</p></div><label className="text-xs">Hiring stage<select className="demo-input mt-1" value={person.status} onChange={e=>setPeople(current=>current.map(p=>p.id===person.id?{...p,status:e.target.value}:p))}>{["submitted","reviewing","shortlisted","interview","offered","rejected"].map(s=><option key={s}>{s}</option>)}</select></label></div><label className="block mt-4 text-sm">Reviewer note<textarea className="demo-input mt-2" value={person.note} onChange={e=>setPeople(current=>current.map(p=>p.id===person.id?{...p,note:e.target.value}:p))} placeholder="Add a sample note…" /></label></article>)}</div></section>}
      {tab === "Post a Job" && <section className="employer-panel"><h2>Create a demo job</h2><ol className="flex flex-wrap gap-4 my-5 text-sm">{["Job Details","Requirements","Review & Publish"].map((label,index)=><li key={label} aria-current={index===step?"step":undefined} className={index===step?"font-bold text-[var(--teal)]":""}>{index+1}. {label}</li>)}</ol><form onSubmit={e=>{e.preventDefault(); if(step<2)setStep(step+1);else saveJob("active");}}>
        {step===0 && <div className="grid gap-4"><label>Job title<input required className="demo-input mt-2" value={title} onChange={e=>setTitle(e.target.value)} /></label><label>Location<input required className="demo-input mt-2" value={location} onChange={e=>setLocation(e.target.value)} placeholder="City, province or remote" /></label><label>About the role<textarea required className="demo-input mt-2" value={description} onChange={e=>setDescription(e.target.value)} rows={4} /></label></div>}
        {step===1 && <label className="block">Requirements<textarea className="demo-input mt-2" value={requirements} onChange={e=>setRequirements(e.target.value)} rows={5} placeholder="Skills and experience for this example role" /></label>}
        {step===2 && <div className="employer-note"><h3>{title}</h3><p>{location}</p><p className="whitespace-pre-wrap my-3">{description}</p><p className="whitespace-pre-wrap">{requirements}</p><strong>This demonstration will not publish a real job.</strong></div>}
        <div className="flex flex-wrap gap-3 mt-6">{step>0 && <button type="button" className="px-4 py-3" onClick={()=>setStep(step-1)}>Back</button>}<button type="button" disabled={!title.trim()} className="px-4 py-3 border rounded-xl disabled:opacity-40" onClick={()=>saveJob("draft")}>Save demo draft</button><button type="submit" className="employer-primary">{step===2?"Simulate publishing":"Continue →"}</button></div></form></section>}
      {tab === "Profile" && <section className="employer-panel"><h2>Example company profile</h2><label className="block mt-5">Company name<input className="demo-input mt-2" value={company} onChange={e=>setCompany(e.target.value)} /></label><label className="block mt-5">Your story<textarea className="demo-input mt-2" rows={5} value={story} onChange={e=>setStory(e.target.value)} /></label><p className="employer-note">Edits update this demo only. This company is not listed in the public directory.</p></section>}
    </main>
  </div>;
}
