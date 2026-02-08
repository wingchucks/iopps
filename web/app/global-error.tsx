"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Global Error Boundary for Next.js App Router
 *
 * This component catches all unhandled errors in the application
 * and reports them to Sentry. It also displays a user-friendly
 * error message to the user.
 *
 * This must be placed at app/global-error.tsx to catch errors
 * across the entire application.
 */

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error, {
      tags: {
        boundary: "global",
      },
      contexts: {
        errorBoundary: {
          digest: error.digest,
          componentStack: error.stack,
        },
      },
    });

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Global Error Boundary caught:", error);
    }
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "20px",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            backgroundColor: "#f9fafb",
          }}
        >
          <div
            style={{
              maxWidth: "500px",
              width: "100%",
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "40px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              textAlign: "center",
            }}
          >
            {/* Error Icon */}
            <div
              style={{
                width: "80px",
                height: "80px",
                margin: "0 auto 24px",
                backgroundColor: "#fee2e2",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            {/* Error Title */}
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "600",
                color: "#111827",
                marginBottom: "12px",
              }}
            >
              Something went wrong
            </h1>

            {/* Error Message */}
            <p
              style={{
                fontSize: "16px",
                color: "#6b7280",
                marginBottom: "24px",
                lineHeight: "1.5",
              }}
            >
              We&apos;re sorry, but something unexpected happened. Our team has been
              notified and is working to fix the issue.
            </p>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === "development" && (
              <details
                style={{
                  marginBottom: "24px",
                  textAlign: "left",
                  backgroundColor: "#f9fafb",
                  padding: "16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    overflow: "auto",
                    fontSize: "12px",
                    color: "#dc2626",
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {error.message}
                  {error.digest && `\n\nDigest: ${error.digest}`}
                  {error.stack && `\n\nStack:\n${error.stack}`}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={reset}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#2563eb")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#3b82f6")
                }
              >
                Try Again
              </button>

              <button
                onClick={() => (window.location.href = "/")}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "white",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f9fafb")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "white")
                }
              >
                Go to Home
              </button>
            </div>

            {/* Support Link */}
            <p
              style={{
                marginTop: "24px",
                fontSize: "14px",
                color: "#9ca3af",
              }}
            >
              If the problem persists, please{" "}
              <a
                href="/contact"
                style={{
                  color: "#3b82f6",
                  textDecoration: "underline",
                }}
              >
                contact support
              </a>
              .
            </p>

            {/* Error ID (if available) */}
            {error.digest && (
              <p
                style={{
                  marginTop: "16px",
                  fontSize: "12px",
                  color: "#9ca3af",
                  fontFamily: "monospace",
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
