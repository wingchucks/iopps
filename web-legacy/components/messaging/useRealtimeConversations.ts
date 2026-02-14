"use client";

import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import {
  getConversationsQuery,
  getPeerConversationsQueries,
} from "@/lib/firestore/messaging";
import type { Conversation } from "@/lib/types";
import type { PeerConversation } from "@/lib/firestore/messaging";

export function useRealtimeConversations(userId: string | null) {
  const [employerConversations, setEmployerConversations] = useState<Conversation[]>([]);
  const [peerConversations, setPeerConversations] = useState<PeerConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setEmployerConversations([]);
      setPeerConversations([]);
      setLoading(false);
      return;
    }

    let loadedCount = 0;
    const totalListeners = 3; // 1 employer + 2 peer queries
    const unsubs: (() => void)[] = [];

    function checkLoaded() {
      loadedCount++;
      if (loadedCount >= totalListeners) {
        setLoading(false);
      }
    }

    // 1. Employer conversations (where user is the member)
    const employerQuery = getConversationsQuery(userId, "member");
    const employerUnsub = onSnapshot(
      employerQuery,
      (snapshot) => {
        const convos = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Conversation)
        );
        setEmployerConversations(convos);
        checkLoaded();
      },
      (error) => {
        console.error("Error listening to employer conversations:", error);
        checkLoaded();
      }
    );
    unsubs.push(employerUnsub);

    // 2. Peer conversations (two queries: participant1 and participant2)
    const [peerQuery1, peerQuery2] = getPeerConversationsQueries(userId);

    let peerResults1: PeerConversation[] = [];
    let peerResults2: PeerConversation[] = [];

    function mergePeerResults() {
      const allPeer = [...peerResults1, ...peerResults2];
      // Dedupe by id
      const seen = new Set<string>();
      const deduped = allPeer.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      // Sort by lastMessageAt desc
      deduped.sort((a, b) => {
        const timeA = a.lastMessageAt?.toMillis?.() || a.lastMessageAt?.seconds
          ? (a.lastMessageAt.seconds * 1000)
          : 0;
        const timeB = b.lastMessageAt?.toMillis?.() || b.lastMessageAt?.seconds
          ? (b.lastMessageAt.seconds * 1000)
          : 0;
        return timeB - timeA;
      });
      setPeerConversations(deduped);
    }

    const peerUnsub1 = onSnapshot(
      peerQuery1,
      (snapshot) => {
        peerResults1 = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as PeerConversation)
        );
        mergePeerResults();
        checkLoaded();
      },
      (error) => {
        console.error("Error listening to peer conversations (q1):", error);
        checkLoaded();
      }
    );
    unsubs.push(peerUnsub1);

    const peerUnsub2 = onSnapshot(
      peerQuery2,
      (snapshot) => {
        peerResults2 = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as PeerConversation)
        );
        mergePeerResults();
        checkLoaded();
      },
      (error) => {
        console.error("Error listening to peer conversations (q2):", error);
        checkLoaded();
      }
    );
    unsubs.push(peerUnsub2);

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [userId]);

  return { employerConversations, peerConversations, loading };
}
