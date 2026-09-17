export const TERRITORY_OPTIONS = [
  ...Array.from({ length: 11 }, (_, i) => `Treaty ${i + 1}`),
  "Other historic treaty", "Modern treaty / land claim agreement", "Unceded territory",
  "Métis homeland / settlement", "Inuit region", "Multiple territories / regions", "Not sure",
];
export const CHECK_OPTIONS = ["", "Required", "Required after an offer", "Not required"];
export const SUPPORT_OPTIONS = ["Paid training", "Apprenticeship opportunities", "Mentorship", "Cultural leave", "Flexible scheduling", "Transportation support", "Relocation support", "Housing / accommodation", "Equipment provided"];
export interface HiringDetails {
  territory: string; territoryName: string; criminalRecordCheck: string; vulnerableSectorCheck: string;
  driversLicense: boolean; licenceClass: string; willTrain: boolean; trainingDetails: string;
  certifications: string; schedule: string; supports: string[]; indigenousEncouraged: boolean;
}
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0,max) : "";
/** Unselected fields stay unspecified. Legacy flags remain compatible. */
export function normalizeHiringDetails(value: unknown, legacy: unknown = {}): HiringDetails {
  const v = record(value); const old = record(legacy);
  const flag = (key: string) => typeof v[key] === "boolean" ? v[key] === true : old[key] === true;
  return {
    territory: TERRITORY_OPTIONS.includes(text(v.territory)) ? text(v.territory) : "",
    territoryName: text(v.territoryName, 200),
    criminalRecordCheck: CHECK_OPTIONS.includes(text(v.criminalRecordCheck)) ? text(v.criminalRecordCheck) : "",
    vulnerableSectorCheck: CHECK_OPTIONS.includes(text(v.vulnerableSectorCheck)) ? text(v.vulnerableSectorCheck) : "",
    driversLicense: flag("driversLicense"), licenceClass: flag("driversLicense") ? text(v.licenceClass,100) : "",
    willTrain: flag("willTrain"), trainingDetails: flag("willTrain") ? text(v.trainingDetails) : "",
    certifications: text(v.certifications), schedule: text(v.schedule),
    supports: Array.isArray(v.supports) ? [...new Set(v.supports.filter((s): s is string => typeof s === "string" && SUPPORT_OPTIONS.includes(s)))] : [],
    indigenousEncouraged: v.indigenousEncouraged === true,
  };
}
