import type { Application } from "@/lib/firestore/applications";
import type { MemberProfile } from "@/lib/firestore/members";
import { displayLocation } from "@/lib/utils";

/** Only render data returned by the authorized employer application endpoint. */
export default function ApplicationDetails({ application, profile }: { application: Application; profile?: Partial<MemberProfile> }) {
  const snapshot = application.profileSnapshot || profile;
  return (
    <details className="mt-3 rounded-lg border border-border p-3 text-sm break-words">
      <summary className="cursor-pointer font-semibold text-teal">View application details</summary>
      <div className="mt-3 space-y-4">
        <p className="text-xs text-text-sec">{application.profileSnapshot ? "Profile as submitted with this application." : "Current profile information, where available."}</p>
        {snapshot?.email && <p><strong>Email: </strong><a className="text-teal underline" href={`mailto:${snapshot.email}`}>{snapshot.email}</a></p>}
        {snapshot?.headline && <p>{snapshot.headline}</p>}
        {snapshot?.location && <p><strong>Location: </strong>{displayLocation(snapshot.location)}</p>}
        {snapshot?.bio && <p className="whitespace-pre-wrap">{snapshot.bio}</p>}
        {!!snapshot?.skills?.length && <p><strong>Skills: </strong>{snapshot.skills.join(", ")}</p>}
        {!!snapshot?.education?.length && <div><h3 className="font-semibold">Education</h3><ul className="list-disc pl-5">{snapshot.education.map((item, index) => <li key={index}>{[item.degree, item.field, item.school, item.year].filter(Boolean).join(" · ")}</li>)}</ul></div>}
        <div><h3 className="font-semibold">Cover letter</h3><p className="whitespace-pre-wrap">{application.coverLetter || "No cover letter submitted."}</p></div>
        <div><h3 className="font-semibold">References</h3><p className="whitespace-pre-wrap">{application.references || "No references submitted."}</p></div>
      </div>
    </details>
  );
}
