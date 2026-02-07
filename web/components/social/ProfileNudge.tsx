"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getMemberProfile, upsertMemberProfile } from "@/lib/firestore";
import type { MemberProfile } from "@/lib/types";
import { X, User, FileText, MapPin, Sparkles, Camera } from "lucide-react";
import Link from "next/link";

interface ProfileField {
  key: string;
  label: string;
  icon: React.ReactNode;
  check: (profile: MemberProfile) => boolean;
}

const PROFILE_FIELDS: ProfileField[] = [
  {
    key: "avatar",
    label: "Add a profile photo",
    icon: <Camera className="h-4 w-4" />,
    check: (p) => !!(p.avatarUrl || p.photoURL),
  },
  {
    key: "bio",
    label: "Write a short bio",
    icon: <FileText className="h-4 w-4" />,
    check: (p) => !!(p.bio && p.bio.trim().length > 0),
  },
  {
    key: "skills",
    label: "Add your skills",
    icon: <Sparkles className="h-4 w-4" />,
    check: (p) => !!(p.skills && p.skills.length > 0),
  },
  {
    key: "location",
    label: "Add your location",
    icon: <MapPin className="h-4 w-4" />,
    check: (p) => !!(p.location && p.location.trim().length > 0),
  },
  {
    key: "affiliation",
    label: "Add Indigenous affiliation",
    icon: <User className="h-4 w-4" />,
    check: (p) => !!(p.indigenousAffiliation && p.indigenousAffiliation.trim().length > 0),
  },
];

function calculateCompleteness(profile: MemberProfile): number {
  const completed = PROFILE_FIELDS.filter((f) => f.check(profile)).length;
  return Math.round((completed / PROFILE_FIELDS.length) * 100);
}

export default function ProfileNudge() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMemberProfile(user.uid)
      .then((p) => {
        setProfile(p);
        if (p?.wizardDismissed) {
          setDismissed(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleDismiss = async () => {
    setDismissed(true);
    if (user && profile) {
      try {
        await upsertMemberProfile(user.uid, {
          ...profile,
          wizardDismissed: true,
        });
      } catch {
        // Non-critical
      }
    }
  };

  if (loading || !user || !profile || dismissed) return null;

  const completeness = calculateCompleteness(profile);
  if (completeness >= 80) return null;

  const incomplete = PROFILE_FIELDS.filter((f) => !f.check(profile));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Complete your profile</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Stand out to employers and the community
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-600 hover:text-slate-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-slate-800 mb-4">
        <div
          className="h-full rounded-full transition-all duration-500 bg-emerald-500"
          style={{ width: `${completeness}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mb-3">{completeness}% complete</p>

      {/* Quick wins */}
      <div className="space-y-2">
        {incomplete.slice(0, 3).map((field) => (
          <Link
            key={field.key}
            href="/member/settings"
            className="flex items-center gap-3 rounded-xl bg-slate-800/50 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
          >
            <span className="text-emerald-500">{field.icon}</span>
            {field.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
