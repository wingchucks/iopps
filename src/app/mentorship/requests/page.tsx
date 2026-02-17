"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getMentorRequests,
  getMyMentorRequests,
  updateRequestStatus,
  type MentorshipRequest,
} from "@/lib/firestore/mentorship";

function statusBadge(status: string) {
  switch (status) {
    case "accepted":
      return { text: "Accepted", color: "var(--green)", bg: "var(--green-soft)" };
    case "declined":
      return { text: "Declined", color: "var(--red)", bg: "var(--red-soft)" };
    default:
      return { text: "Pending", color: "var(--gold)", bg: "var(--gold-soft)" };
  }
}

function formatDate(ts: unknown): string {
  if (!ts) return "";
  const d = typeof (ts as { toDate?: () => Date }).toDate === "function"
    ? (ts as { toDate: () => Date }).toDate()
    : new Date(ts as string);
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function MentorshipRequestsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [received, setReceived] = useState<MentorshipRequest[]>([]);
  const [sent, setSent] = useState<MentorshipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getMentorRequests(user.uid),
      getMyMentorRequests(user.uid),
    ])
      .then(([r, s]) => {
        setReceived(r);
        setSent(s);
      })
      .catch((err) => console.error("Failed to load requests:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const handleUpdateStatus = async (
    requestId: string,
    status: "accepted" | "declined"
  ) => {
    setUpdating(requestId);
    try {
      await updateRequestStatus(requestId, status);
      setReceived((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status } : r))
      );
      showToast(
        status === "accepted"
          ? "Request accepted!"
          : "Request declined."
      );
    } catch (err) {
      console.error("Failed to update request:", err);
      showToast("Failed to update request.", "error");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <div className="max-w-3xl mx-auto px-4 md:px-10 py-8">
          <Link
            href="/mentorship"
            className="inline-flex items-center gap-1 text-sm font-medium mb-6"
            style={{ color: "var(--purple)" }}
          >
            &larr; Back to Mentorship
          </Link>

          <h1
            className="text-2xl font-bold mb-6"
            style={{ color: "var(--text)" }}
          >
            Mentorship Requests
          </h1>

          {/* Tabs */}
          <div
            className="flex gap-1 p-1 rounded-xl mb-6"
            style={{ background: "var(--border)" }}
          >
            <button
              onClick={() => setTab("received")}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
              style={{
                background: tab === "received" ? "var(--card)" : "transparent",
                color:
                  tab === "received"
                    ? "var(--purple)"
                    : "var(--text-muted)",
              }}
            >
              Received Requests
            </button>
            <button
              onClick={() => setTab("sent")}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
              style={{
                background: tab === "sent" ? "var(--card)" : "transparent",
                color:
                  tab === "sent" ? "var(--purple)" : "var(--text-muted)",
              }}
            >
              My Requests
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-2xl skeleton" />
              ))}
            </div>
          ) : tab === "received" ? (
            received.length === 0 ? (
              <Card className="p-10 text-center">
                <p
                  className="font-bold mb-1"
                  style={{ color: "var(--text)" }}
                >
                  No received requests
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-sec)" }}
                >
                  When someone requests you as a mentor, it will appear here.
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {received.map((req) => {
                  const badge = statusBadge(req.status);
                  return (
                    <Card key={req.id} className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                            style={{
                              background:
                                "linear-gradient(135deg, var(--purple), #5B21B6)",
                            }}
                          >
                            {req.menteeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3
                              className="font-bold text-sm"
                              style={{ color: "var(--text)" }}
                            >
                              {req.menteeName}
                            </h3>
                            <p
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {formatDate(req.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          text={badge.text}
                          color={badge.color}
                          bg={badge.bg}
                          small
                        />
                      </div>

                      <p
                        className="text-sm mb-3"
                        style={{ color: "var(--text-sec)" }}
                      >
                        {req.message}
                      </p>

                      {req.goals.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {req.goals.map((g) => (
                            <Badge
                              key={g}
                              text={g}
                              color="var(--purple)"
                              bg="var(--purple-soft)"
                              small
                            />
                          ))}
                        </div>
                      )}

                      {req.status === "pending" && (
                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              handleUpdateStatus(req.id, "accepted")
                            }
                            disabled={updating === req.id}
                            className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
                            style={{ background: "var(--green)" }}
                          >
                            {updating === req.id ? "..." : "Accept"}
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateStatus(req.id, "declined")
                            }
                            disabled={updating === req.id}
                            className="flex-1 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                            style={{
                              border: "1px solid var(--border)",
                              color: "var(--text-sec)",
                            }}
                          >
                            {updating === req.id ? "..." : "Decline"}
                          </button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )
          ) : sent.length === 0 ? (
            <Card className="p-10 text-center">
              <p
                className="font-bold mb-1"
                style={{ color: "var(--text)" }}
              >
                No sent requests
              </p>
              <p
                className="text-sm"
                style={{ color: "var(--text-sec)" }}
              >
                Requests you send to mentors will appear here.
              </p>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {sent.map((req) => {
                const badge = statusBadge(req.status);
                return (
                  <Card key={req.id} className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--purple), #5B21B6)",
                          }}
                        >
                          {req.mentorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3
                            className="font-bold text-sm"
                            style={{ color: "var(--text)" }}
                          >
                            {req.mentorName}
                          </h3>
                          <p
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {formatDate(req.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        text={badge.text}
                        color={badge.color}
                        bg={badge.bg}
                        small
                      />
                    </div>

                    <p
                      className="text-sm mb-3"
                      style={{ color: "var(--text-sec)" }}
                    >
                      {req.message}
                    </p>

                    {req.goals.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {req.goals.map((g) => (
                          <Badge
                            key={g}
                            text={g}
                            color="var(--purple)"
                            bg="var(--purple-soft)"
                            small
                          />
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        <div className="pb-24" />
      </div>
    </ProtectedRoute>
  );
}
