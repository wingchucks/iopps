"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";
import { onNotifications, onUnreadNotificationCount, markAsRead, markAllAsRead, type Notification } from "./firestore/notifications";

const emptyState = { owner: "", notifications: [] as Notification[], loading: true, error: "", unreadCount: null as number | null };

// History and total unread count are separate: a recent preview is not the inbox total.
export function useNotifications(pageSize = 20) {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const owner = useRef(uid);
  const pendingWrite = useRef("");
  owner.current = uid;
  const [state, setState] = useState(emptyState);
  const [attempt, setAttempt] = useState(0);
  const [action, setAction] = useState({ owner: "", error: "", busy: false });

  useEffect(() => {
    let active = true;
    setState({ ...emptyState, owner: uid });
    setAction({ owner: uid, error: "", busy: false });
    if (!uid) return;
    const current = () => active && owner.current === uid;
    const failed = () => { if (current()) setState(previous => ({ ...previous, loading: false, error: "Notifications could not be loaded" })); };
    const history = onNotifications(uid, notifications => {
      if (current()) setState(previous => ({ ...previous, notifications, loading: false }));
    }, failed, pageSize);
    const count = onUnreadNotificationCount(uid, unreadCount => {
      if (current()) setState(previous => ({ ...previous, unreadCount }));
    }, failed);
    return () => { active = false; history(); count(); };
  }, [uid, pageSize, attempt]);

  async function markRead(notification?: Notification) {
    if (!uid || owner.current !== uid || pendingWrite.current === uid) return false;
    if (notification && notification.userId !== uid) return false;
    if (notification?.read) return true;
    setAction({ owner: uid, busy: true, error: "" });
    pendingWrite.current = uid;
    try {
      if (notification) await markAsRead(notification.id);
      else await markAllAsRead(uid);
      return owner.current === uid;
    } catch {
      if (owner.current === uid) setAction({ owner: uid, busy: false, error: "Could not mark notifications as read. Please try again." });
      return false;
    } finally {
      if (pendingWrite.current === uid) pendingWrite.current = "";
      if (owner.current === uid) setAction(previous => ({ ...previous, busy: false }));
    }
  }

  return {
    ...(state.owner === uid ? state : emptyState),
    actionError: action.owner === uid ? action.error : "",
    busy: action.owner === uid && action.busy,
    retry: () => setAttempt(value => value + 1),
    markRead,
  };
}
