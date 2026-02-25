"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import OrgRoute from "@/components/OrgRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { getMemberProfile } from "@/lib/firestore/members";
import type { MemberProfile } from "@/lib/firestore/members";
import { getOrganization } from "@/lib/firestore/organizations";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TeamInvite {
  id: string;
  email: string;
  role: "admin" | "member";
  status: "pending" | "accepted" | "declined";
  invitedBy: string;
  createdAt: unknown;
}

export default function TeamPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const profile = await getMemberProfile(user.uid);
      if (!profile?.orgId) return;
      setOrgId(profile.orgId);

      const org = await getOrganization(profile.orgId);
      if (org) setOrgName(org.name);

      // Fetch team members
      const membersSnap = await getDocs(
        query(collection(db, "members"), where("orgId", "==", profile.orgId))
      );
      setMembers(
        membersSnap.docs.map((d) => d.data() as MemberProfile)
      );

      // Fetch pending invites
      const invitesSnap = await getDocs(
        collection(db, "organizations", profile.orgId, "teamInvites")
      );
      setInvites(
        invitesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamInvite)
      );

      setLoading(false);
    })();
  }, [user]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !orgId) return;
    setSending(true);
    try {
      const inviteId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await setDoc(
        doc(db, "organizations", orgId, "teamInvites", inviteId),
        {
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          status: "pending",
          invitedBy: user?.uid || "",
          orgName,
          createdAt: serverTimestamp(),
        }
      );
      setInvites((prev) => [
        ...prev,
        {
          id: inviteId,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          status: "pending",
          invitedBy: user?.uid || "",
          createdAt: new Date(),
        },
      ]);
      setInviteEmail("");
      showToast("Invite sent", "success");
    } catch (err) {
      console.error("Invite failed:", err);
      showToast("Failed to send invite", "error");
    } finally {
      setSending(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: "admin" | "member") => {
    try {
      await updateDoc(doc(db, "members", uid), { orgRole: newRole });
      setMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, orgRole: newRole } : m))
      );
      showToast("Role updated", "success");
    } catch (err) {
      console.error("Role change failed:", err);
      showToast("Failed to update role", "error");
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!confirm("Remove this member from your organization?")) return;
    try {
      await updateDoc(doc(db, "members", uid), {
        orgId: null,
        orgRole: null,
      });
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
      showToast("Member removed", "success");
    } catch (err) {
      console.error("Remove failed:", err);
      showToast("Failed to remove member", "error");
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, "organizations", orgId, "teamInvites", inviteId));
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      showToast("Invite cancelled", "success");
    } catch (err) {
      console.error("Cancel invite failed:", err);
      showToast("Failed to cancel invite", "error");
    }
  };

  const roleBadge = (role?: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      owner: { bg: "rgba(245,158,11,.12)", color: "#F59E0B" },
      admin: { bg: "rgba(139,92,246,.12)", color: "#8B5CF6" },
      member: { bg: "rgba(13,148,136,.12)", color: "#0D9488" },
    };
    const c = colors[role || "member"] || colors.member;
    return (
      <span
        className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
        style={{ background: c.bg, color: c.color }}
      >
        {role || "member"}
      </span>
    );
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <OrgRoute requiredRole="owner">
      <AppShell>
        <div className="min-h-screen bg-bg">
          <div className="max-w-[900px] mx-auto px-4 py-8 md:px-10">
            <Link
              href="/org/dashboard"
              className="text-sm font-semibold mb-6 inline-block no-underline"
              style={{ color: "var(--teal)" }}
            >
              &larr; Back to Dashboard
            </Link>

            <h1
              className="text-2xl font-bold mb-2"
              style={{ color: "var(--text)" }}
            >
              Team Members
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Manage who has access to your organization dashboard
            </p>

            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-2xl skeleton" />
                ))}
              </div>
            ) : (
              <>
                {/* Invite section */}
                <Card className="p-5 mb-6">
                  <h2
                    className="text-base font-bold mb-3"
                    style={{ color: "var(--text)" }}
                  >
                    Invite a Team Member
                  </h2>
                  <div className="flex gap-3 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@example.com"
                        className="w-full px-3 py-2.5 rounded-xl text-sm"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1.5"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) =>
                          setInviteRole(e.target.value as "admin" | "member")
                        }
                        className="px-3 py-2.5 rounded-xl text-sm cursor-pointer"
                        style={inputStyle}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <Button
                      primary
                      small
                      onClick={handleInvite}
                      className={sending ? "opacity-50 pointer-events-none" : ""}
                    >
                      {sending ? "Sending..." : "Send Invite"}
                    </Button>
                  </div>
                </Card>

                {/* Current members */}
                <h2
                  className="text-base font-bold mb-3"
                  style={{ color: "var(--text)" }}
                >
                  Current Members ({members.length})
                </h2>
                <div className="flex flex-col gap-2 mb-6">
                  {members.map((member) => {
                    const isCurrentUser = member.uid === user?.uid;
                    const isOwner = member.orgRole === "owner";
                    return (
                      <Card key={member.uid} className="p-4">
                        <div className="flex items-center gap-3">
                          {member.photoURL ? (
                            <img
                              src={member.photoURL}
                              alt={member.displayName}
                              className="w-10 h-10 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                              style={{
                                background:
                                  "linear-gradient(135deg, var(--teal), var(--navy))",
                              }}
                            >
                              {member.displayName?.charAt(0)?.toUpperCase() ||
                                "?"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className="text-sm font-bold truncate"
                                style={{ color: "var(--text)" }}
                              >
                                {member.displayName}
                              </p>
                              {roleBadge(member.orgRole)}
                              {isCurrentUser && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                  style={{
                                    background: "var(--bg)",
                                    color: "var(--text-muted)",
                                    border: "1px solid var(--border)",
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <p
                              className="text-xs truncate"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {member.email}
                            </p>
                          </div>
                          {!isCurrentUser && !isOwner && (
                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={member.orgRole || "member"}
                                onChange={(e) =>
                                  handleRoleChange(
                                    member.uid,
                                    e.target.value as "admin" | "member"
                                  )
                                }
                                className="px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                                style={inputStyle}
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.uid)}
                                className="px-2.5 py-1 rounded-lg border-none cursor-pointer text-xs font-semibold"
                                style={{
                                  background: "rgba(220,38,38,.1)",
                                  color: "#DC2626",
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Pending invites */}
                {invites.filter((i) => i.status === "pending").length > 0 && (
                  <>
                    <h2
                      className="text-base font-bold mb-3"
                      style={{ color: "var(--text)" }}
                    >
                      Pending Invites
                    </h2>
                    <div className="flex flex-col gap-2">
                      {invites
                        .filter((i) => i.status === "pending")
                        .map((invite) => (
                          <Card key={invite.id} className="p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p
                                  className="text-sm font-semibold"
                                  style={{ color: "var(--text)" }}
                                >
                                  {invite.email}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {roleBadge(invite.role)}
                                  <span
                                    className="text-xs"
                                    style={{ color: "var(--text-muted)" }}
                                  >
                                    Pending
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleCancelInvite(invite.id)}
                                className="px-3 py-1.5 rounded-lg border-none cursor-pointer text-xs font-semibold"
                                style={{
                                  background: "rgba(107,114,128,.1)",
                                  color: "#6B7280",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </Card>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </AppShell>
    </OrgRoute>
  );
}
