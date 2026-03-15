// Newsletter signup component — add to homepage or footer
// Usage: <NewsletterSignup />

"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus("success");
        setMessage(data.message);
        setEmail("");
        setName("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-[#1C1C1C] border border-[#00EDBA33] rounded-xl p-8 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-xl font-bold text-[#00EDBA] mb-2">You&apos;re In!</h3>
        <p className="text-gray-400">{message}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1C1C1C] border border-[#00EDBA33] rounded-xl p-8">
      <h3 className="text-xl font-bold text-white mb-2">
        📬 IOPPS Weekly Newsletter
      </h3>
      <p className="text-gray-400 mb-6 text-sm">
        Get the latest Indigenous jobs, events, scholarships, and opportunities delivered every Monday.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:border-[#00EDBA] focus:outline-none"
        />
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:border-[#00EDBA] focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full py-3 bg-[#00EDBA] text-[#1C1C1C] font-bold rounded-lg hover:bg-[#00d4a8] transition-colors disabled:opacity-50"
        >
          {status === "loading" ? "Subscribing..." : "Subscribe — It's Free"}
        </button>
        {status === "error" && (
          <p className="text-red-400 text-sm text-center">{message}</p>
        )}
      </form>
      <p className="text-gray-600 text-xs mt-3 text-center">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}
