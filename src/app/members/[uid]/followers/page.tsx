"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import Button from "@/components/Button";
import FollowButton from "@/components/FollowButton";
import { getMemberProfile, type MemberProfile } from "@/lib/firestore/members";
import { getFollowersPaginated, type Connection } from "@/lib/firestore/connections";
import type { QueryDocumentSnapshot } from "firebase/firestore";

export default function FollowersPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <FollowersContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function FollowersContent() {
  const params = useParams();
  const uid = params.uid as string;
  const [owner, setOwner] = useState<MemberProfile | null>(null);
  const [followers, setFollowers] = useState<(Connection & { profile?: MemberProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<QueryDocumentSnapshot | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [ownerProfile, { items, lastDoc }] = await Promise.all([
          getMemberProfile(uid),
          getFollowersPaginated(uid),
        ]);
        setOwner(ownerProfile);
        cursorRef.current = lastDoc;
        setHasMore(lastDoc !== null);
        // Load profiles for each follower
        const enriched = await Promise.all(
          items.map(async (c) => {
            const profile = await getMemberProfile(c.followerId);
            return { ...c, profile: profile || undefined };
          })
        );
        setFollowers(enriched);
      } catch (err) {
        console.error("Failed to load followers:", err);
      } finally {
        setLoading(false);
      }
    }
    if (uid) load();
  }, [uid]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const { items, lastDoc } = await getFollowersPaginated(uid, cursorRef.current);
      cursorRef.current = lastDoc;
      setHasMore(lastDoc !== null);
      const enriched = await Promise.all(
        items.map(async (c) => {
          const profile = await getMemberProfile(c.followerId);
          return { ...c, profile: profile || undefined };
        })
      );
      setFollowers((prev) => [...prev, ...enriched]);
    } catch (err) {
      console.error("Failed to load more followers:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [uid, loadingMore, hasMore]);

  return (
    <div className="max-w-[700px] mx-auto">
      <div className="px-4 pt-4 md:px-10">
        <Link
          href={`/members/${uid}`}
          className="text-teal text-sm font-semibold no-underline hover:underline"
        >
          &#8592; Back to profile
        </Link>
      </div>

      <div className="px-4 py-6 md:px-10">
        <h1 className="text-xl font-extrabold text-text mb-1">
          Followers
        </h1>
        {owner && (
          <p className="text-sm text-text-muted mb-6">
            People following {owner.displayName}
          </p>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[72px] rounded-2xl" />
            ))}
          </div>
        ) : followers.length === 0 ? (
          <Card>
            <div style={{ padding: 24 }} className="text-center">
              <p className="text-sm text-text-muted">No followers yet.</p>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {followers.map((f) => {
                const name = f.profile?.displayName || f.followerName || "Unknown";
                const community = f.profile?.community || "";
                return (
                  <Card key={f.id}>
                    <div
                      style={{ padding: 14 }}
                      className="flex items-center gap-3"
                    >
                      <Link href={`/members/${f.followerId}`}>
                        <Avatar
                          name={name}
                          size={44}
                          src={f.profile?.photoURL}
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/members/${f.followerId}`}
                          className="text-sm font-bold text-text no-underline hover:underline truncate block"
                        >
                          {name}
                        </Link>
                        {community && (
                          <p className="text-xs text-text-muted m-0 truncate">
                            {community}
                          </p>
                        )}
                      </div>
                      <FollowButton
                        targetUserId={f.followerId}
                        targetUserName={name}
                        small
                      />
                    </div>
                  </Card>
                );
              })}
            </div>

            {hasMore && (
              <div className="text-center mt-6">
                <Button
                  onClick={loadMore}
                  style={{
                    background: "var(--card)",
                    color: "var(--text-sec)",
                    border: "1px solid var(--border)",
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
