"use client";
const PROVINCES = [
  ["AB","Alberta"],["BC","British Columbia"],["MB","Manitoba"],["NB","New Brunswick"],
  ["NL","Newfoundland and Labrador"],["NS","Nova Scotia"],["NT","Northwest Territories"],
  ["NU","Nunavut"],["ON","Ontario"],["PE","Prince Edward Island"],["QC","Quebec"],
  ["SK","Saskatchewan"],["YT","Yukon"],
];
export const formatJobLocation = (city: string, province: string) => [city.trim(),province.trim()].filter(Boolean).join(", ");
export default function JobLocationFields({city,province,onChange,required=false}: {
  city:string; province:string; onChange:(city:string,province:string)=>void; required?:boolean;
}) {
  const selected = PROVINCES.find(([code,name])=>code.toLowerCase()===province.toLowerCase() || name.toLowerCase()===province.toLowerCase())?.[0] || province;
  const special = "Canada-wide / multiple provinces";
  return <fieldset className="hiring-fields"><legend>Where is this opportunity?</legend><div className="hiring-fields-grid">
    <label>City, community or worksite<input autoComplete="address-level2" maxLength={200} value={city} onChange={e=>onChange(e.target.value,province)} placeholder="e.g. Saskatoon or community name" /></label>
    <label>Province / territory{required?" *":""}<select required={required} autoComplete="address-level1" value={selected} onChange={e=>onChange(city,e.target.value)}><option value="">Select province / territory</option>{PROVINCES.map(([code,name])=><option key={code} value={code}>{name}</option>)}<option value={special}>{special}</option>{selected && !PROVINCES.some(([code])=>code===selected) && selected!==special && <option value={selected}>{selected} (existing location)</option>}</select></label>
  </div><p>For remote roles, select where candidates may work from. For several locations, choose multiple provinces and list the communities or work sites above.</p></fieldset>;
}
