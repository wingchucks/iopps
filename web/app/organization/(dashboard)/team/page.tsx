'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  getEmployerProfile,
  getTeamMembers,
  getInvitationsForEmployer,
  createInvitation,
  revokeInvitation,
  removeTeamMember,
  updateTeamMemberRole,
} from '@/lib/firestore';
import type { EmployerProfile, TeamMember, TeamInvitation, TeamRole } from '@/lib/types';
import {
  UsersIcon,
  EnvelopeIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const ROLE_OPTIONS: { value: TeamRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'editor', label: 'Editor', description: 'Can edit content but not billing' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

interface MemberRowProps {
  member: TeamMember;
  isOwner: boolean;
  currentUserId: string;
  onRoleChange: (memberId: string, role: TeamRole) => void;
  onRemove: (memberId: string) => void;
}

function MemberRow({ member, isOwner, currentUserId, onRoleChange, onRemove }: MemberRowProps) {
  const isCurrentUser = member.id === currentUserId;

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
          <span className="text-sm font-semibold text-slate-400">
            {(member.displayName || member.email).charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-slate-200 font-medium">
            {member.displayName || member.email}
            {isCurrentUser && <span className="text-xs text-slate-500 ml-2">(you)</span>}
          </p>
          <p className="text-sm text-slate-500">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isOwner ? (
          <span className="px-2 py-1 text-xs font-medium rounded bg-accent/10 text-accent">
            Owner
          </span>
        ) : (
          <select
            value={member.role}
            onChange={e => onRoleChange(member.id, e.target.value as TeamRole)}
            disabled={isCurrentUser}
            className="px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-accent/50 disabled:opacity-50"
          >
            {ROLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {!isOwner && !isCurrentUser && (
          <button
            onClick={() => onRemove(member.id)}
            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface InvitationRowProps {
  invitation: TeamInvitation;
  onRevoke: (id: string) => void;
}

function InvitationRow({ invitation, onRevoke }: InvitationRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center">
          <ClockIcon className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <p className="text-slate-300">{invitation.invitedEmail}</p>
          <p className="text-sm text-amber-400/80">Pending invitation</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="px-2 py-1 text-xs font-medium rounded bg-slate-800 text-slate-400">
          {invitation.role}
        </span>
        <button
          onClick={() => onRevoke(invitation.id)}
          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('editor');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    async function loadTeamData() {
      if (!user) return;

      try {
        const employerProfile = await getEmployerProfile(user.uid);
        if (employerProfile) {
          setProfile(employerProfile);

          const [teamMembers, teamInvitations] = await Promise.all([
            getTeamMembers(employerProfile.id),
            getInvitationsForEmployer(employerProfile.id),
          ]);

          setMembers(teamMembers);
          setInvitations(teamInvitations.filter(i => i.status === 'pending'));
        }
      } catch (error) {
        console.error('Error loading team data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTeamData();
  }, [user]);

  const handleInvite = async () => {
    if (!profile || !inviteEmail.trim() || !user) return;

    setInviting(true);
    try {
      await createInvitation(profile.id, profile.organizationName, inviteEmail.trim(), inviteRole, user.uid);

      // Reload invitations
      const updatedInvitations = await getInvitationsForEmployer(profile.id);
      setInvitations(updatedInvitations.filter(i => i.status === 'pending'));

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('editor');
    } catch (error) {
      console.error('Error creating invitation:', error);
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await revokeInvitation(invitationId);
      setInvitations(prev => prev.filter(i => i.id !== invitationId));
    } catch (error) {
      console.error('Error revoking invitation:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!profile) return;

    try {
      await removeTeamMember(profile.id, memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    if (!profile) return;

    try {
      await updateTeamMemberRole(profile.id, memberId, newRole);
      setMembers(prev =>
        prev.map(m => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Team & Permissions</h1>
          <p className="text-slate-400 mt-1">
            Manage who has access to your organization
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Team Members */}
      <div className="bg-card border border-card-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <UsersIcon className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold text-slate-50">Team Members</h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-800 text-slate-400">
            {members.length + 1}
          </span>
        </div>

        <div className="space-y-0">
          {/* Owner (current user if they own the org) */}
          {profile && (
            <MemberRow
              member={{
                id: profile.userId,
                email: user?.email || '',
                displayName: profile.organizationName,
                role: 'admin',
                addedBy: profile.userId,
                addedAt: null,
              }}
              isOwner={true}
              currentUserId={user?.uid || ''}
              onRoleChange={() => {}}
              onRemove={() => {}}
            />
          )}

          {/* Other members */}
          {members.map(member => (
            <MemberRow
              key={member.id}
              member={member}
              isOwner={false}
              currentUserId={user?.uid || ''}
              onRoleChange={handleRoleChange}
              onRemove={handleRemoveMember}
            />
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <EnvelopeIcon className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-slate-50">Pending Invitations</h2>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-900/30 text-amber-400">
              {invitations.length}
            </span>
          </div>

          <div className="space-y-0">
            {invitations.map(invitation => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                onRevoke={handleRevokeInvitation}
              />
            ))}
          </div>
        </div>
      )}

      {/* Role Descriptions */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold text-slate-300 mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROLE_OPTIONS.map(role => (
            <div key={role.value} className="text-sm">
              <p className="font-medium text-slate-200">{role.label}</p>
              <p className="text-slate-500">{role.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-50 mb-4">Invite Team Member</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent/50"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as TeamRole)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-accent/50"
                >
                  {ROLE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {inviting ? 'Sending...' : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
