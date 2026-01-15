"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  where,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MemberProfile } from "@/lib/types";
import {
  AdminLoadingState,
  AdminEmptyState,
  AdminSearchInput,
  StatusBadge,
} from "@/components/admin";
import {
  UserIcon,
  DocumentTextIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  MapPinIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface MemberWithUser extends MemberProfile {
  email?: string;
  disabled?: boolean;
  userCreatedAt?: { seconds: number };
  applicationCount?: number;
  savedJobCount?: number;
}

function AdminMembersContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [filter, setFilter] = useState<"all" | "with_resume" | "with_skills" | "recent">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (role !== "admin" && role !== "moderator")) {
      router.push("/");
      return;
    }
    loadMembers();
  }, [user, role, authLoading, router]);

  async function loadMembers() {
    try {
      setLoading(true);

      // Get all member profiles
      const membersRef = collection(db!, "members");
      const membersSnap = await getDocs(query(membersRef, orderBy("createdAt", "desc")));

      const memberProfiles = membersSnap.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      } as MemberProfile));

      // Get user data for each member
      const usersRef = collection(db!, "users");
      const communityUsersSnap = await getDocs(
        query(usersRef, where("role", "==", "community"))
      );

      const userMap = new Map<string, { email: string; disabled?: boolean; createdAt?: { seconds: number } }>();
      communityUsersSnap.docs.forEach((doc) => {
        const data = doc.data();
        userMap.set(doc.id, {
          email: data.email,
          disabled: data.disabled,
          createdAt: data.createdAt,
        });
      });

      // Get application counts
      const applicationsRef = collection(db!, "applications");
      const applicationsSnap = await getDocs(applicationsRef);
      const applicationCounts = new Map<string, number>();
      applicationsSnap.docs.forEach((doc) => {
        const data = doc.data();
        const memberId = data.memberId || data.userId;
        if (memberId) {
          applicationCounts.set(memberId, (applicationCounts.get(memberId) || 0) + 1);
        }
      });

      // Combine data
      const membersWithData: MemberWithUser[] = memberProfiles.map((member) => {
        const userData = userMap.get(member.userId);
        return {
          ...member,
          email: userData?.email,
          disabled: userData?.disabled,
          userCreatedAt: userData?.createdAt,
          applicationCount: applicationCounts.get(member.userId) || 0,
        };
      });

      // Add community users without member profiles
      communityUsersSnap.docs.forEach((doc) => {
        const hasProfile = memberProfiles.some((m) => m.userId === doc.id);
        if (!hasProfile) {
          const data = doc.data();
          membersWithData.push({
            id: doc.id,
            userId: doc.id,
            email: data.email,
            displayName: data.displayName,
            disabled: data.disabled,
            userCreatedAt: data.createdAt,
            applicationCount: applicationCounts.get(doc.id) || 0,
          });
        }
      });

      setMembers(membersWithData);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleMemberStatus(userId: string, currentDisabled: boolean) {
    if (!user) return;
    const action = currentDisabled ? "enable" : "disable";
    if (!confirm(`Are you sure you want to ${action} this member?`)) return;

    try {
      setProcessing(userId);
      const userRef = doc(db!, "users", userId);
      await updateDoc(userRef, { disabled: !currentDisabled, updatedAt: serverTimestamp() });
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, disabled: !currentDisabled } : m))
      );
    } catch (error) {
      console.error("Error toggling member status:", error);
      toast.error("Failed to update member status. Please try again.");
    } finally {
      setProcessing(null);
    }
  }

  if (authLoading || loading) {
    return <AdminLoadingState message="Loading members..." />;
  }

  if (!user || (role !== "admin" && role !== "moderator")) {
    return null;
  }

  // Filter members
  const filteredMembers = members.filter((m) => {
    if (filter === "with_resume" && !m.resumeUrl) return false;
    if (filter === "with_skills" && (!m.skills || m.skills.length === 0)) return false;
    if (filter === "recent") {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const createdAt = m.userCreatedAt?.seconds ? m.userCreatedAt.seconds * 1000 : 0;
      if (createdAt < thirtyDaysAgo) return false;
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        m.email?.toLowerCase().includes(search) ||
        m.displayName?.toLowerCase().includes(search) ||
        m.location?.toLowerCase().includes(search) ||
        m.skills?.some((s) => s.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Stats
  const totalMembers = members.length;
  const withResume = members.filter((m) => m.resumeUrl).length;
  const withSkills = members.filter((m) => m.skills && m.skills.length > 0).length;
  const withExperience = members.filter((m) => m.experience && m.experience.length > 0).length;
  const totalApplications = members.reduce((sum, m) => sum + (m.applicationCount || 0), 0);
  const activeMembers = members.filter((m) => !m.disabled).length;

  return (
    <div className="min-h-screen bg-[#020306]">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#08090C]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin"
                className="text-sm text-slate-400 hover:text-[#14B8A6]"
              >
                ← Admin Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
                Members - Job Seekers
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">Total Members</p>
            <p className="mt-1 text-2xl font-bold text-slate-100">{totalMembers}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">Active</p>
            <p className="mt-1 text-2xl font-bold text-green-400">{activeMembers}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">With Resume</p>
            <p className="mt-1 text-2xl font-bold text-teal-400">{withResume}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">With Skills</p>
            <p className="mt-1 text-2xl font-bold text-purple-400">{withSkills}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">With Experience</p>
            <p className="mt-1 text-2xl font-bold text-blue-400">{withExperience}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#08090C] p-4">
            <p className="text-sm font-medium text-slate-400">Applications</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{totalApplications}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "all"
                ? "bg-[#14B8A6] text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-[#14B8A6]"
            }`}
          >
            All ({totalMembers})
          </button>
          <button
            onClick={() => setFilter("with_resume")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "with_resume"
                ? "bg-teal-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-teal-500"
            }`}
          >
            With Resume ({withResume})
          </button>
          <button
            onClick={() => setFilter("with_skills")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "with_skills"
                ? "bg-purple-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-purple-500"
            }`}
          >
            With Skills ({withSkills})
          </button>
          <button
            onClick={() => setFilter("recent")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "recent"
                ? "bg-amber-500 text-slate-900"
                : "border border-slate-700 text-slate-300 hover:border-amber-500"
            }`}
          >
            Recent (30 days)
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <AdminSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by email, name, location, or skills..."
          />
        </div>

        {/* Members List */}
        <div className="space-y-4">
          {filteredMembers.length === 0 ? (
            <AdminEmptyState
              title="No members found"
              message="No members match the current filter."
            />
          ) : (
            filteredMembers.map((member) => {
              const isProcessing = processing === member.userId;

              return (
                <div
                  key={member.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Member Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                          <UserIcon className="h-6 w-6 text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-50">
                                {member.displayName || member.email || "Unknown Member"}
                              </h3>
                              {member.displayName && member.email && (
                                <p className="text-sm text-slate-400">{member.email}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <StatusBadge status={member.disabled ? "disabled" : "active"} />
                              {member.resumeUrl && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-medium text-teal-400">
                                  <DocumentTextIcon className="h-3 w-3" />
                                  Resume
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Profile Stats */}
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
                            {member.location && (
                              <span className="flex items-center gap-1">
                                <MapPinIcon className="h-4 w-4" />
                                {member.location}
                              </span>
                            )}
                            {member.skills && member.skills.length > 0 && (
                              <span className="flex items-center gap-1">
                                <BriefcaseIcon className="h-4 w-4" />
                                {member.skills.length} skill{member.skills.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {member.experience && member.experience.length > 0 && (
                              <span className="flex items-center gap-1">
                                <BriefcaseIcon className="h-4 w-4" />
                                {member.experience.length} experience{member.experience.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {member.education && member.education.length > 0 && (
                              <span className="flex items-center gap-1">
                                <AcademicCapIcon className="h-4 w-4" />
                                {member.education.length} education
                              </span>
                            )}
                            {(member.applicationCount ?? 0) > 0 && (
                              <span className="text-amber-400">
                                {member.applicationCount} application{member.applicationCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* Skills Tags */}
                          {member.skills && member.skills.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {member.skills.slice(0, 5).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400"
                                >
                                  {skill}
                                </span>
                              ))}
                              {member.skills.length > 5 && (
                                <span className="text-xs text-slate-500">
                                  +{member.skills.length - 5} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Indigenous Affiliation */}
                          {member.indigenousAffiliation && (
                            <p className="mt-2 text-sm text-[#14B8A6]">
                              {member.indigenousAffiliation}
                            </p>
                          )}

                          {/* Dates */}
                          <div className="mt-3 flex gap-4 text-xs text-slate-500">
                            {member.userCreatedAt && (
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                Joined: {new Date(member.userCreatedAt.seconds * 1000).toLocaleDateString()}
                              </span>
                            )}
                            <span className="text-slate-600">ID: {member.userId}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-col">
                      {member.resumeUrl && (
                        <a
                          href={member.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md border border-teal-600 px-4 py-2 text-center text-sm font-semibold text-teal-400 transition hover:bg-teal-600/10"
                        >
                          View Resume
                        </a>
                      )}
                      <button
                        onClick={() => toggleMemberStatus(member.userId, member.disabled || false)}
                        disabled={isProcessing}
                        className={`rounded-md px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                          member.disabled
                            ? "bg-green-600 text-white hover:bg-green-500"
                            : "border border-slate-600 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        {isProcessing ? "Processing..." : member.disabled ? "Enable" : "Disable"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminMembersPage() {
  return (
    <Suspense fallback={<AdminLoadingState message="Loading members..." />}>
      <AdminMembersContent />
    </Suspense>
  );
}
