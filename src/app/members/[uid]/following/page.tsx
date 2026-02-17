"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import FollowButton from "@/components/FollowButton";
import { getMemberProfile, type MemberProfile } from "@/lib/firestore/members";
import { getFollowing, type Connection } from "@/lib/firestore/connections";

export default function FollowingPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <FollowingContent />
      </div>
    </ProtectedRoute>
  );
}

function FollowingContent() {
  const params = useParams();
  const uid = params.uid as string;
  const [owner, setOwner] = useState<MemberProfile | null>(null);
  const [following, setFollowing] = useState<(Connection & { profile?: MemberProfile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ownerProfile, conns] = await Promise.all([
          getMemberProfile(uid),
          getFollowing(uid),
        ]);
        setOwner(ownerProfile);
        const enriched = await Promise.all(
          conns.map(async (c) => {
            const profile = await getMemberProfile(c.followingId);
            return { ...c, profile: profile || undefined };
          })
        );
        setFollowing(enriched);
      } catch (err) {
        console.error("Failed to load following:", err);
      } finally {
        setLoading(false);
      }
    }
    if (uid) load();
  }, [uid]);

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
          Following
        </h1>
        {owner && (
          <p className="text-sm text-text-muted mb-6">
            People {owner.displayName} follows
          </p>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[72px] rounded-2xl" />
            ))}
          </div>
        ) : following.length === 0 ? (
          <Card>
            <div style={{ padding: 24 }} className="text-center">
              <p className="text-sm text-text-muted">Not following anyone yet.</p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {following.map((f) => {
              const name = f.profile?.displayName || f.followingName || "Unknown";
              const community = f.profile?.community || "";
              return (
                <Card key={f.id}>
                  <div
                    style={{ padding: 14 }}
                    className="flex items-center gap-3"
                  >
                    <Link href={`/members/${f.followingId}`}>
                      <Avatar
                        name={name}
                        size={44}
                        src={f.profile?.photoURL}
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/members/${f.followingId}`}
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
                      targetUserId={f.followingId}
                      targetUserName={name}
                      small
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
