"use client";

const TERRITORIES = [
  "Treaty 1",
  "Treaty 2",
  "Treaty 3",
  "Treaty 4",
  "Treaty 5",
  "Treaty 6",
  "Treaty 7",
  "Treaty 8",
  "Treaty 9",
  "Treaty 10",
  "Treaty 11",
  "Robinson-Superior Treaty",
  "Robinson-Huron Treaty",
  "Douglas Treaties",
  "Unceded Territories",
  "Inuit Nunangat",
  "Prefer not to say",
] as const;

interface TerritorySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

export function TerritorySelect({
  value,
  onChange,
  className = "",
  id,
}: TerritorySelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">Select territory</option>
      {TERRITORIES.map((territory) => (
        <option key={territory} value={territory}>
          {territory}
        </option>
      ))}
    </select>
  );
}

export { TERRITORIES };
