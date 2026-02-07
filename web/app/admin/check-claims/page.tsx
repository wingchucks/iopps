"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface ClaimsResponse {
  uid: string;
  email: string;
  emailVerified: boolean;
  customClaims: {
    admin: boolean | null;
    moderator: boolean | null;
    role: string | null;
    super_admin: boolean | null;
    isAdmin: boolean | null;
  };
  allCustomClaims: Record<string, unknown>;
  expectedFormat: {
    description: string;
    adminCheck: string;
    moderatorCheck: string;
    currentAdminValue: boolean | undefined;
    currentModeratorValue: boolean | undefined;
    wouldPassAdminCheck: boolean;
    wouldPassModeratorCheck: boolean;
  };
  error?: string;
}

export default function CheckClaimsPage() {
  const { user, loading } = useAuth();
  const [claims, setClaims] = useState<ClaimsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const checkClaims = async () => {
    if (!user) return;

    setChecking(true);
    setError(null);

    try {
      const token = await user.getIdToken(true); // Force refresh
      const response = await fetch("/api/admin/check-claims", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to check claims");
      } else {
        setClaims(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (user && !loading) {
      checkClaims();
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-muted)] mb-4">Please sign in to check your claims</p>
          <Link href="/login" className="text-accent hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-[var(--text-muted)] hover:text-accent">
            ← Back to Admin
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Firebase Auth Claims Diagnostic</h1>
        <p className="text-[var(--text-muted)] mb-6">
          This page shows your current Firebase Auth custom claims and whether they match what the Firestore rules expect.
        </p>

        <button
          onClick={checkClaims}
          disabled={checking}
          className="mb-6 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent disabled:opacity-50"
        >
          {checking ? "Checking..." : "Refresh Claims"}
        </button>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {claims && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="p-4 bg-surface border border-[var(--card-border)] rounded-lg">
              <h2 className="text-lg font-semibold text-white mb-3">User Info</h2>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-[var(--text-muted)]">UID:</dt>
                <dd className="text-foreground font-mono">{claims.uid}</dd>
                <dt className="text-[var(--text-muted)]">Email:</dt>
                <dd className="text-foreground">{claims.email}</dd>
                <dt className="text-[var(--text-muted)]">Email Verified:</dt>
                <dd className={claims.emailVerified ? "text-green-400" : "text-yellow-400"}>
                  {claims.emailVerified ? "Yes" : "No"}
                </dd>
              </dl>
            </div>

            {/* Permission Check Results */}
            <div className="p-4 bg-surface border border-[var(--card-border)] rounded-lg">
              <h2 className="text-lg font-semibold text-white mb-3">Permission Check Results</h2>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${claims.expectedFormat.wouldPassAdminCheck ? "bg-green-900/30 border border-green-800" : "bg-red-900/30 border border-red-800"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Admin Permission</span>
                    <span className={claims.expectedFormat.wouldPassAdminCheck ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}>
                      {claims.expectedFormat.wouldPassAdminCheck ? "PASS" : "FAIL"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Rule: <code className="bg-surface px-1 rounded">{claims.expectedFormat.adminCheck}</code>
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Current value: <code className="bg-surface px-1 rounded">{String(claims.expectedFormat.currentAdminValue)}</code>
                  </p>
                </div>

                <div className={`p-3 rounded-lg ${claims.expectedFormat.wouldPassModeratorCheck ? "bg-green-900/30 border border-green-800" : "bg-yellow-900/30 border border-yellow-800"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Moderator Permission</span>
                    <span className={claims.expectedFormat.wouldPassModeratorCheck ? "text-green-400 font-semibold" : "text-yellow-400 font-semibold"}>
                      {claims.expectedFormat.wouldPassModeratorCheck ? "PASS" : "NOT SET"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Rule: <code className="bg-surface px-1 rounded">{claims.expectedFormat.moderatorCheck}</code>
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Current value: <code className="bg-surface px-1 rounded">{String(claims.expectedFormat.currentModeratorValue)}</code>
                  </p>
                </div>
              </div>
            </div>

            {/* All Custom Claims */}
            <div className="p-4 bg-surface border border-[var(--card-border)] rounded-lg">
              <h2 className="text-lg font-semibold text-white mb-3">All Custom Claims (Raw)</h2>
              <pre className="text-sm text-[var(--text-secondary)] bg-background p-3 rounded-lg overflow-x-auto">
                {JSON.stringify(claims.allCustomClaims, null, 2)}
              </pre>
            </div>

            {/* Fix Instructions */}
            {!claims.expectedFormat.wouldPassAdminCheck && (
              <div className="p-4 bg-amber-900/30 border border-amber-800 rounded-lg">
                <h2 className="text-lg font-semibold text-amber-300 mb-3">How to Fix</h2>
                <p className="text-[var(--text-secondary)] text-sm mb-3">
                  Your account is missing the <code className="bg-surface px-1 rounded">admin: true</code> custom claim.
                </p>

                {/* Auto-fix button for super admin */}
                {user?.email === "nathan.arias@iopps.ca" && (
                  <div className="mb-4">
                    <button
                      onClick={async () => {
                        try {
                          const token = await user.getIdToken();
                          const response = await fetch("/api/admin/set-claims", {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({}),
                          });
                          const data = await response.json();
                          if (response.ok) {
                            alert("Claims updated! Click 'Refresh Claims' to verify.");
                          } else {
                            alert(`Error: ${data.error}`);
                          }
                        } catch (err) {
                          alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
                        }
                      }}
                      className="w-full px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-semibold"
                    >
                      Fix My Claims Automatically
                    </button>
                    <p className="text-xs text-amber-400 mt-2">
                      This will set <code>admin: true</code> on your account. Click "Refresh Claims" after to verify.
                    </p>
                  </div>
                )}

                <details className="mt-4">
                  <summary className="text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
                    Manual fix instructions (Firebase Admin SDK)
                  </summary>
                  <pre className="text-sm text-[var(--text-secondary)] bg-background p-3 rounded-lg overflow-x-auto mt-2">
{`// Using Firebase Admin SDK
const admin = require('firebase-admin');

await admin.auth().setCustomUserClaims('${claims.uid}', {
  admin: true,
  // Keep existing claims if needed
});

// User needs to sign out and back in, or refresh their token`}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
