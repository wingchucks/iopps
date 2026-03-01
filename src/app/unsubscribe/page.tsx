"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function UnsubscribeContent() {
  const params = useSearchParams();
  const success = params.get("success");
  const error = params.get("error");

  return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 480, padding: "48px 32px", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 24 }}>
          {success ? "✅" : error === "invalid" ? "❌" : "⚠️"}
        </div>
        <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: "0 0 16px" }}>
          {success ? "You've been unsubscribed" : "Something went wrong"}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 16, lineHeight: 1.6, margin: "0 0 32px" }}>
          {success
            ? "You've been removed from the IOPPS newsletter. You won't receive any more emails from us."
            : error === "invalid"
            ? "This unsubscribe link is invalid or has expired."
            : "We couldn't process your request. Please try again or contact us at hello@iopps.ca."}
        </p>
        {success && (
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
            Changed your mind?{" "}
            <a href="/settings/notifications" style={{ color: "#14B8A6", textDecoration: "none" }}>
              Re-subscribe in your settings
            </a>
          </p>
        )}
        <a
          href="/"
          style={{ display: "inline-block", marginTop: 24, padding: "12px 28px", background: "#0D9488", color: "#fff", textDecoration: "none", borderRadius: 10, fontWeight: 700, fontSize: 14 }}
        >
          Go to IOPPS.ca
        </a>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeContent />
    </Suspense>
  );
}