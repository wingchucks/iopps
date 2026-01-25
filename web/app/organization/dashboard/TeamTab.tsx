"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  UserGroupIcon,
  EnvelopeIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import type { TeamMember, TeamInvitation, TeamRole } from "@/lib/types";
import toast from "react-hot-toast";

interface TeamData {
  members: TeamMember[];
  invitations: TeamInvitation[];
  isOwner: boolean;
  role: TeamRole;
}

export default function TeamTab() {
  const { user } = useAuth();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await user?.getIdToken();
      const response = await fetch("/api/organization/team", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch team data");
      }

      const data = await response.json();
      setTeamData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeam();
    }
  }, [user]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviting(true);
      setInviteError(null);

      const token = await user?.getIdToken();
      const response = await fetch("/api/organization/team", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send invitation");
      }

      // Reset form and refresh
      setInviteEmail("");
      setShowInviteForm(false);
      fetchTeam();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;

    try {
      setActionLoading(memberId);
      const token = await user?.getIdToken();
      const response = await fetch(`/api/organization/team/members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to remove team member");
      }

      fetchTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: TeamRole) => {
    try {
      setActionLoading(memberId);
      const token = await user?.getIdToken();
      const response = await fetch(`/api/organization/team/members/${memberId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      fetchTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;

    try {
      setActionLoading(invitationId);
      const token = await user?.getIdToken();
      const response = await fetch(
        `/api/organization/team/invitations/${invitationId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to revoke invitation");
      }

      fetchTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      setActionLoading(invitationId);
      const token = await user?.getIdToken();
      const response = await fetch(
        `/api/organization/team/invitations/${invitationId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to resend invitation");
      }

      toast.success("Invitation resent successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend invitation");
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadgeColor = (role: TeamRole) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "editor":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "viewer":
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "Unknown";
    const date =
      typeof timestamp === "object" && "toDate" in timestamp
        ? timestamp.toDate()
        : typeof timestamp === "object" && "_seconds" in timestamp
        ? new Date(timestamp._seconds * 1000)
        : new Date(timestamp);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8">
        <div className="flex items-center gap-3 text-slate-400">
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
          <span>Loading team data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-8">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchTeam}
          className="mt-4 text-sm text-red-400 hover:text-red-300"
        >
          Try again
        </button>
      </div>
    );
  }

  const pendingInvitations = teamData?.invitations.filter(
    (inv) => inv.status === "pending"
  ) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Team Members</h2>
          <p className="text-slate-400">
            {teamData?.isOwner
              ? "Manage your organization's team access"
              : `You are a ${teamData?.role} of this organization`}
          </p>
        </div>
        {teamData?.isOwner && (
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Invite Member
          </button>
        )}
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Invite Team Member
              </h3>
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteError(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="admin">Admin - Full access</option>
                  <option value="editor">Editor - Can edit content</option>
                  <option value="viewer">Viewer - Read only access</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {inviteRole === "admin" &&
                    "Admins can manage team, create content, and access all features"}
                  {inviteRole === "editor" &&
                    "Editors can create and edit jobs, events, and content"}
                  {inviteRole === "viewer" &&
                    "Viewers can view applications and analytics"}
                </p>
              </div>

              {inviteError && (
                <p className="text-sm text-red-400">{inviteError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteError(null);
                  }}
                  className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {inviting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Members List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="border-b border-slate-800 bg-slate-900/80 px-6 py-4">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Active Members</h3>
            <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
              {(teamData?.members.length || 0) + 1}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {/* Owner (always first) */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <UserGroupIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-white">
                  {teamData?.isOwner ? "You" : "Owner"}
                </p>
                <p className="text-sm text-slate-400">Organization Owner</p>
              </div>
            </div>
            <span className="rounded-full border bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1 text-xs font-medium">
              Owner
            </span>
          </div>

          {/* Team Members */}
          {teamData?.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between px-6 py-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-slate-300">
                  {member.displayName?.[0]?.toUpperCase() ||
                    member.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">
                    {member.displayName || member.email.split("@")[0]}
                  </p>
                  <p className="text-sm text-slate-400">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {teamData?.isOwner ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleUpdateRole(member.id, e.target.value as TeamRole)
                      }
                      disabled={actionLoading === member.id}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${getRoleBadgeColor(
                        member.role
                      )} bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={actionLoading === member.id}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove member"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${getRoleBadgeColor(
                      member.role
                    )}`}
                  >
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {(!teamData?.members || teamData.members.length === 0) && (
            <div className="px-6 py-8 text-center">
              <p className="text-slate-400">No team members yet</p>
              {teamData?.isOwner && (
                <p className="text-sm text-slate-500 mt-1">
                  Invite colleagues to help manage your organization
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {teamData?.isOwner && pendingInvitations.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="border-b border-slate-800 bg-slate-900/80 px-6 py-4">
            <div className="flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5 text-amber-400" />
              <h3 className="font-semibold text-white">Pending Invitations</h3>
              <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                {pendingInvitations.length}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-800">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                    <ClockIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {invitation.invitedEmail}
                    </p>
                    <p className="text-sm text-slate-400">
                      Invited {formatDate(invitation.createdAt)} &middot;{" "}
                      <span
                        className={`${getRoleBadgeColor(invitation.role)
                          .replace("bg-", "text-")
                          .replace("/20", "")}`}
                      >
                        {invitation.role}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResendInvitation(invitation.id)}
                    disabled={actionLoading === invitation.id}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => handleRevokeInvitation(invitation.id)}
                    disabled={actionLoading === invitation.id}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                    title="Revoke invitation"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Permissions Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="font-semibold text-white mb-4">Role Permissions</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
            <h4 className="font-medium text-purple-400 mb-2">Admin</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-purple-400" />
                Manage team members
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-purple-400" />
                Create & edit all content
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-purple-400" />
                View billing & analytics
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <h4 className="font-medium text-blue-400 mb-2">Editor</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-blue-400" />
                Create & edit content
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-blue-400" />
                Manage applications
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-blue-400" />
                View analytics
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-600/30 bg-slate-600/10 p-4">
            <h4 className="font-medium text-slate-300 mb-2">Viewer</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-slate-400" />
                View all content
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-slate-400" />
                View applications
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 text-slate-400" />
                View analytics
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
