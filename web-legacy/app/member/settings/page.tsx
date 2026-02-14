"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getMemberProfile } from "@/lib/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import type { MemberProfile } from "@/lib/types";
import {
  User,
  Key,
  Bell,
  Eye,
  Mail,
  Database,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function SettingsHubContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  useEffect(() => {
    if (!user) return;

    async function loadProfile() {
      try {
        const memberProfile = await getMemberProfile(user!.uid);
        setProfile(memberProfile);
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const handlePasswordReset = async () => {
    if (!user?.email) return;

    try {
      setResettingPassword(true);
      await sendPasswordResetEmail(auth!, user.email);
      toast.success("Password reset email sent!");
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast.error("Error sending password reset email. Please try again.");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    toast.error("Please contact support@iopps.ca to delete your account.");
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error signing out. Please try again.");
    }
  };

  const displayName =
    profile?.displayName || user?.displayName || "Member";
  const avatarUrl =
    profile?.avatarUrl || profile?.photoURL || user?.photoURL || null;
  const affiliation = profile?.indigenousAffiliation || null;
  const location = profile?.location || null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        {/* Back nav */}
        <Link
          href={user ? `/member/${user.uid}` : '/discover'}
          className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[#14B8A6] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-foreground">Settings</h1>

        {/* Profile Card */}
        <Card className="mb-6 border-[var(--card-border)] bg-surface">
          <CardContent className="p-5">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-14 w-14 rounded-full object-cover border border-[var(--card-border)]"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 border border-accent/30">
                    <User className="h-7 w-7 text-accent" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-foreground truncate">
                    {displayName}
                  </p>
                  {(affiliation || location) && (
                    <p className="text-sm text-[var(--text-muted)] truncate">
                      {[affiliation, location].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <Link
                  href="/member/profile"
                  className="shrink-0 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-surface transition-colors"
                >
                  Edit Profile
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Section */}
        <Card className="mb-4 border-[var(--card-border)] bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--text-muted)]">
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2 pt-0">
            <SettingsLink
              icon={User}
              label="Edit Profile"
              href="/member/profile"
            />
            <SettingsButton
              icon={Key}
              label="Reset Password"
              onClick={handlePasswordReset}
              loading={resettingPassword}
            />
            <SettingsButton
              icon={Trash2}
              label="Delete Account"
              onClick={handleDeleteAccount}
              variant="danger"
            />
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card className="mb-4 border-[var(--card-border)] bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--text-muted)]">
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2 pt-0">
            <SettingsLink
              icon={Bell}
              label="Notification Settings"
              href="/member/settings/notifications"
            />
            <SettingsLink
              icon={Eye}
              label="Privacy & Visibility"
              href="/member/settings/privacy"
            />
            <SettingsLink
              icon={Mail}
              label="Email Digest"
              href="/member/email-preferences"
            />
          </CardContent>
        </Card>

        {/* Data & Sovereignty Section */}
        <Card className="mb-4 border-[var(--card-border)] bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--text-muted)]">
              Data & Sovereignty
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2 pt-0">
            <SettingsLink
              icon={Download}
              label="Export My Data"
              href="/member/settings/data-export"
            />
            <SettingsLink
              icon={Shield}
              label="OCAP/CARE Principles"
              href="/privacy"
            />
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="mb-6 border-[var(--card-border)] bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--text-muted)]">
              Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2 pt-0">
            <SettingsLink
              icon={HelpCircle}
              label="Contact Support"
              href="mailto:support@iopps.ca"
              external
            />
            <SettingsLink
              icon={Database}
              label="About IOPPS"
              href="/about"
            />
          </CardContent>
        </Card>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function SettingsLink({
  icon: Icon,
  label,
  href,
  external,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        className="flex items-center justify-between rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-surface"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-[var(--text-muted)]" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-surface"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-[var(--text-muted)]" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
    </Link>
  );
}

function SettingsButton({
  icon: Icon,
  label,
  onClick,
  loading,
  variant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  loading?: boolean;
  variant?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-foreground transition-colors hover:bg-surface disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`h-5 w-5 ${
            variant === "danger" ? "text-red-400" : "text-[var(--text-muted)]"
          }`}
        />
        <span
          className={`text-sm font-medium ${
            variant === "danger" ? "text-red-400" : ""
          }`}
        >
          {label}
        </span>
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
      ) : (
        <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
      )}
    </button>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsHubContent />
    </ProtectedRoute>
  );
}
