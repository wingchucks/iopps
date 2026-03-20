"use client";

import { useEffect, useState } from "react";

interface Stats {
  members: number;
  jobs: number;
  organizations: number;
  events: number;
}

export default function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats/public")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, []);

  const items = [
    { label: "Community Members", value: stats ? stats.members : null },
    { label: "Jobs Posted", value: stats ? stats.jobs : null },
    { label: "Events Listed", value: stats ? stats.events : null },
    { label: "Organizations", value: stats ? stats.organizations : null },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-8 md:gap-16">
      {items.map((stat) => (
        <div key={stat.label} className="text-center">
          <p className="text-2xl md:text-3xl font-extrabold text-teal mb-0.5">
            {stat.value !== null ? stat.value.toLocaleString() : "\u2014"}
          </p>
          <p className="text-xs font-semibold text-text-muted tracking-wide m-0">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
