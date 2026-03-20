"use client";

import { useSessionTimeout } from "@/lib/useSessionTimeout";
import { useTokenRefresh } from "@/lib/useTokenRefresh";

export default function SessionManager() {
  useSessionTimeout();
  useTokenRefresh();
  return null;
}
