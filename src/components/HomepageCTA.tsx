"use client";
import Link from "next/link";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";

export function HeroCTA() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
        <Link href="/feed">
          <Button
            primary
            style={{
              background: "var(--teal)",
              fontSize: 17,
              padding: "16px 40px",
              borderRadius: 14,
              fontWeight: 700,
            }}
          >
            Go to Feed
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
      <Link href="/signup">
        <Button
          primary
          style={{
            background: "var(--teal)",
            fontSize: 17,
            padding: "16px 40px",
            borderRadius: 14,
            fontWeight: 700,
          }}
        >
          Join the Community
        </Button>
      </Link>
      <Link href="/login">
        <Button
          style={{
            color: "#fff",
            background: "rgba(255,255,255,.12)",
            borderColor: "rgba(255,255,255,.3)",
            fontSize: 17,
            padding: "16px 40px",
            borderRadius: 14,
          }}
        >
          Sign In
        </Button>
      </Link>
    </div>
  );
}

export function BottomCTA() {
  const { user } = useAuth();

  return (
    <Link href={user ? "/feed" : "/signup"}>
      <Button
        primary
        style={{
          background: "var(--teal)",
          fontSize: 16,
          padding: "14px 36px",
          borderRadius: 14,
          fontWeight: 700,
        }}
      >
        {user ? "Go to Feed" : "Get Started"}
      </Button>
    </Link>
  );
}
