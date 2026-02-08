"use client";

import { ReactNode } from "react";
import { NotificationProvider } from "@/components/notifications";
import { MessageProvider, MessageDrawer } from "@/components/messaging";

/**
 * Client-side provider wrapper for global contexts.
 * Must be rendered inside AuthProvider (since the providers use useAuth internally).
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <MessageProvider>
        {children}
        <MessageDrawer />
      </MessageProvider>
    </NotificationProvider>
  );
}
