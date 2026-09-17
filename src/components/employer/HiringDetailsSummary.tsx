import { normalizeHiringDetails } from "@/lib/job-hiring-details";
export default function HiringDetailsSummary({value, legacy}: {value: unknown; legacy?: unknown}) {
  const d = normalizeHiringDetails(value, legacy);
  const rows = [
    ["Workplace territory / region", [d.territory,d.territoryName].filter(Boolean).join(" · ")],
    ["Criminal record check (CPIC)", d.criminalRecordCheck], ["Vulnerable sector check", d.vulnerableSectorCheck],
    ["Driver’s licence", d.driversLicense ? `Required${d.licenceClass ? ` — ${d.licenceClass}` : ""}` : ""],
    ["Training", d.willTrain ? `Provided${d.trainingDetails ? ` — ${d.trainingDetails}` : ""}` : ""],
    ["Certifications / tickets", d.certifications], ["Schedule and travel", d.schedule], ["Supports offered",d.supports.join(" · ")],
  ].filter(([,v])=>Boolean(v));
  if (!rows.length && !d.indigenousEncouraged) return null;
  return <section className="hiring-summary"><h3>At a glance: requirements & supports</h3>{d.indigenousEncouraged && <p className="employer-note">All applicants are welcome. First Nations, Métis and Inuit candidates are encouraged to apply.</p>}<dl>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>;
}
