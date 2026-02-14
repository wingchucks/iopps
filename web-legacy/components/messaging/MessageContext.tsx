"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import {
  getConversationsQuery,
  getPeerConversationsQueries,
} from "@/lib/firestore/messaging";

interface MessageContextValue {
  /** Whether the message drawer is open */
  isOpen: boolean;
  /** Open the drawer to the conversation list */
  openDrawer: () => void;
  /** Close the drawer */
  closeDrawer: () => void;
  /** Open the drawer directly to a specific conversation */
  openConversation: (conversationId: string) => void;
  /** The conversation ID to open to (set by openConversation, cleared after use) */
  targetConversationId: string | null;
  /** Clear the target conversation after it has been handled */
  clearTargetConversation: () => void;
  /** Total unread message count across all conversations */
  unreadCount: number;
}

const MessageContext = createContext<MessageContextValue | undefined>(undefined);

export function MessageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [targetConversationId, setTargetConversationId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setTargetConversationId(null);
  }, []);

  const openConversation = useCallback((conversationId: string) => {
    setTargetConversationId(conversationId);
    setIsOpen(true);
  }, []);

  const clearTargetConversation = useCallback(() => {
    setTargetConversationId(null);
  }, []);

  // Real-time unread count listener
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state when user logs out
      setUnreadCount(0);
      return;
    }

    const unsubs: (() => void)[] = [];

    let employerUnread = 0;
    let peerUnread1 = 0;
    let peerUnread2 = 0;

    function updateTotal() {
      setUnreadCount(employerUnread + peerUnread1 + peerUnread2);
    }

    // Listen to employer conversations (where user is the member)
    try {
      const employerQuery = getConversationsQuery(user.uid, "member");
      const employerUnsub = onSnapshot(
        employerQuery,
        (snapshot) => {
          employerUnread = snapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + (data.memberUnreadCount || 0);
          }, 0);
          updateTotal();
        },
        (error) => {
          console.error("Error listening to employer conversations for unread:", error);
        }
      );
      unsubs.push(employerUnsub);
    } catch {
      // Firebase may not be initialized
    }

    // Listen to peer conversations
    try {
      const [peerQuery1, peerQuery2] = getPeerConversationsQueries(user.uid);

      const peerUnsub1 = onSnapshot(
        peerQuery1,
        (snapshot) => {
          peerUnread1 = snapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + (data.participant1UnreadCount || 0);
          }, 0);
          updateTotal();
        },
        (error) => {
          console.error("Error listening to peer conversations (q1) for unread:", error);
        }
      );
      unsubs.push(peerUnsub1);

      const peerUnsub2 = onSnapshot(
        peerQuery2,
        (snapshot) => {
          peerUnread2 = snapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            return sum + (data.participant2UnreadCount || 0);
          }, 0);
          updateTotal();
        },
        (error) => {
          console.error("Error listening to peer conversations (q2) for unread:", error);
        }
      );
      unsubs.push(peerUnsub2);
    } catch {
      // Firebase may not be initialized
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [user]);

  return (
    <MessageContext.Provider
      value={{
        isOpen,
        openDrawer,
        closeDrawer,
        openConversation,
        targetConversationId,
        clearTargetConversation,
        unreadCount,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}

export function useMessageDrawer() {
  const ctx = useContext(MessageContext);
  if (!ctx) {
    throw new Error("useMessageDrawer must be used within a MessageProvider");
  }
  return ctx;
}
