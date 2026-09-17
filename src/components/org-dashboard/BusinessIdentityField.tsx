"use client";

import type { OrganizationBusinessIdentity } from "@/lib/organization-profile";

const options = [
  ["indigenous", "Indigenous-owned or led"],
  ["non_indigenous", "Non-Indigenous business or organization"],
  ["not_specified", "Prefer not to specify"],
] as const;

export default function BusinessIdentityField({ value, onChange }: { value: OrganizationBusinessIdentity; onChange: (value: OrganizationBusinessIdentity) => void }) {
  return <fieldset className="business-identity-field">
    <legend>Business identity <span>(optional)</span></legend>
    <p>Choose how your organization identifies. This controls the Indigenous-owned or led directory label.</p>
    {options.map(([id, label]) => <label key={id}><input type="radio" name="business-identity" value={id} checked={value === id} onChange={() => onChange(id)} />{label}</label>)}
    <p>Community affiliations and Treaty territory are listed separately. You can change this choice at any time.</p>
  </fieldset>;
}
