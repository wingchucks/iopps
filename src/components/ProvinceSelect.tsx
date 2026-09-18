"use client";

import type { SelectHTMLAttributes } from "react";
import { CANADIAN_PROVINCES, provinceCode } from "@/lib/canadian-provinces";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & {
  value: string; onChange: (value: string) => void; placeholder?: string;
};

export default function ProvinceSelect({ value, onChange, placeholder = "Select province or territory", ...props }: Props) {
  const selected = provinceCode(value) || value;
  return <select {...props} value={selected} onChange={event => onChange(event.target.value)}>
    <option value="">{placeholder}</option>
    {CANADIAN_PROVINCES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
    {selected && !provinceCode(selected) && <option value={selected}>{selected} (existing location)</option>}
  </select>;
}
