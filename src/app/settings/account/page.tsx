"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { updateMemberProfile, deleteMemberProfile } from "@/lib/firestore/members";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";

export default function AccountSettingsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <AccountContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function AccountContent() {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Display name
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [savingName, setSavingName] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleUpdateName = async () => {
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await updateMemberProfile(user.uid, {
        displayName: displayName.trim(),
      });
      showToast("Display name updated");
    } catch (err) {
      console.error("Failed to update display name:", err);
      showToast("Failed to update name. Please try again.", "error");
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password changed successfully");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to change password.";
      if (message.includes("wrong-password") || message.includes("invalid-credential")) {
        setPasswordError("Current password is incorrect.");
      } else {
        setPasswordError(message);
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email) return;
    setDeleteError("");
    setDeleting(true);
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        deletePassword
      );
      await reauthenticateWithCredential(user, credential);
      await deleteMemberProfile(user.uid);
      await deleteUser(user);
      router.push("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete account.";
      if (message.includes("wrong-password") || message.includes("invalid-credential")) {
        setDeleteError("Password is incorrect.");
      } else {
        setDeleteError(message);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[700px] mx-auto px-4 py-8 md:px-10">
      <Link
        href="/settings"
        className="text-sm text-teal font-semibold no-underline hover:underline mb-4 inline-block"
      >
        &larr; Back to Settings
      </Link>
      <h1 className="text-2xl font-extrabold text-text mb-1">Account</h1>
      <p className="text-sm text-text-muted mb-6">
        Manage your account details and security.
      </p>

      {/* Display Name */}
      <Card className="mb-4">
        <div className="p-5">
          <h3 className="text-[15px] font-bold text-text mb-3">
            Display Name
          </h3>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal mb-3"
            placeholder="Your display name"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpdateName}
              disabled={savingName || !displayName.trim()}
              className="px-5 py-2.5 rounded-xl border-none font-semibold text-sm text-white cursor-pointer transition-opacity hover:opacity-90"
              style={{
                background: "var(--teal)",
                opacity: savingName || !displayName.trim() ? 0.5 : 1,
              }}
            >
              {savingName ? "Saving..." : "Update Name"}
            </button>
          </div>
        </div>
      </Card>

      {/* Email (read-only) */}
      <Card className="mb-4">
        <div className="p-5">
          <h3 className="text-[15px] font-bold text-text mb-1">
            Email Address
          </h3>
          <p className="text-xs text-text-muted mb-3">
            Your email is used for sign-in and cannot be changed here.
          </p>
          <div
            className="px-4 py-3 rounded-xl text-sm text-text-sec"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          >
            {user?.email || "No email"}
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="mb-4">
        <div className="p-5">
          <h3 className="text-[15px] font-bold text-text mb-3">
            Change Password
          </h3>
          <div className="flex flex-col gap-3 mb-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
              placeholder="Current password"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
              placeholder="New password"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text text-sm outline-none transition-all focus:border-teal"
              placeholder="Confirm new password"
            />
          </div>
          {passwordError && (
            <p className="text-sm text-red mb-3">{passwordError}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleChangePassword}
              disabled={
                savingPassword || !currentPassword || !newPassword || !confirmPassword
              }
              className="px-5 py-2.5 rounded-xl border-none font-semibold text-sm text-white cursor-pointer transition-opacity hover:opacity-90"
              style={{
                background: "var(--teal)",
                opacity:
                  savingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                    ? 0.5
                    : 1,
              }}
            >
              {savingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      </Card>

      {/* Sign Out */}
      <Card className="mb-4">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-text m-0">Sign Out</h3>
              <p className="text-xs text-text-muted m-0">
                Sign out of your account on this device
              </p>
            </div>
            <Button
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              style={{
                color: "var(--text)",
                borderColor: "var(--border)",
              }}
              small
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone - Delete Account */}
      <Card
        style={{
          border: "1.5px solid var(--red)",
        }}
      >
        <div className="p-5">
          <h3 className="text-[15px] font-bold text-red mb-1">
            Delete Account
          </h3>
          <p className="text-xs text-text-muted mb-3">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              className="px-5 py-2.5 rounded-xl border-none font-semibold text-sm cursor-pointer transition-opacity hover:opacity-90"
              style={{
                background: "var(--red-soft)",
                color: "var(--red)",
              }}
            >
              Delete My Account
            </button>
          ) : (
            <div>
              <p className="text-sm text-text-sec mb-3">
                Enter your password to confirm account deletion:
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-red bg-card text-text text-sm outline-none mb-3"
                placeholder="Your password"
              />
              {deleteError && (
                <p className="text-sm text-red mb-3">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDelete(false);
                    setDeletePassword("");
                    setDeleteError("");
                  }}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer"
                  style={{
                    border: "1.5px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--text)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || !deletePassword}
                  className="px-5 py-2.5 rounded-xl border-none font-semibold text-sm text-white cursor-pointer transition-opacity hover:opacity-90"
                  style={{
                    background: "var(--red)",
                    opacity: deleting || !deletePassword ? 0.5 : 1,
                  }}
                >
                  {deleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
