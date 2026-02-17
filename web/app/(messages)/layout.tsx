"use client";

import { ReactNode } from "react";

export default function MessagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden min-h-[600px] flex">
        {children}
      </div>
    </div>
  );
}
