"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorType: "expired" | "network" | "unknown";
}

export default class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorType: "unknown" };
  }

  static getDerivedStateFromError(error: Error): State {
    const msg = error.message?.toLowerCase() || "";
    if (
      msg.includes("token") ||
      msg.includes("expired") ||
      msg.includes("revoked") ||
      msg.includes("user-token-expired") ||
      msg.includes("auth/id-token-expired")
    ) {
      return { hasError: true, errorType: "expired" };
    }
    if (msg.includes("network") || msg.includes("fetch")) {
      return { hasError: true, errorType: "network" };
    }
    return { hasError: true, errorType: "unknown" };
  }

  handleSignIn = () => {
    window.location.href = "/login";
  };

  handleRetry = () => {
    this.setState({ hasError: false, errorType: "unknown" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { errorType } = this.state;

    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="w-full max-w-sm text-center p-8 rounded-2xl"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="text-4xl mb-4">
            {errorType === "network" ? "\u{1F4E1}" : "\u{1F512}"}
          </div>
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: "var(--text)" }}
          >
            {errorType === "expired"
              ? "Session Expired"
              : errorType === "network"
                ? "Connection Lost"
                : "Something went wrong"}
          </h2>
          <p
            className="text-sm mb-6 leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            {errorType === "expired"
              ? "Your session has expired. Please sign in again to continue."
              : errorType === "network"
                ? "We couldn't reach the server. Check your internet connection and try again."
                : "An unexpected error occurred. Please try again or sign in."}
          </p>
          <div className="flex flex-col gap-3">
            {errorType === "network" ? (
              <button
                onClick={this.handleRetry}
                className="w-full font-bold cursor-pointer transition-opacity hover:opacity-90"
                style={{
                  padding: "14px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--teal)",
                  color: "#fff",
                  fontSize: 15,
                }}
              >
                Try Again
              </button>
            ) : (
              <button
                onClick={this.handleSignIn}
                className="w-full font-bold cursor-pointer transition-opacity hover:opacity-90"
                style={{
                  padding: "14px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--teal)",
                  color: "#fff",
                  fontSize: 15,
                }}
              >
                Sign In
              </button>
            )}
            {errorType !== "network" && (
              <button
                onClick={this.handleRetry}
                className="w-full font-semibold cursor-pointer"
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "1.5px solid var(--border)",
                  background: "var(--card)",
                  color: "var(--text-sec)",
                  fontSize: 15,
                }}
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
