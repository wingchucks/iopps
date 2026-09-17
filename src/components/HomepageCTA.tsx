"use client";
import Link from "next/link";
import Button from "@/components/Button";
import { useAuth } from "@/lib/auth-context";
import { useAccountContext } from "@/lib/useAccountContext";

export function HeroCTA() {
  const { user } = useAuth();

  if (user) {
    return (
      <div className="relative flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
        <Link href="/feed">
          <Button className="brand-button"
            primary
            style={{
              background: "var(--button-gradient)",
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
        <Button className="brand-button"
          primary
          style={{
            background: "var(--button-gradient)",
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
        <Button className="brand-button"
          style={{
            color: "var(--button-gradient-soft-text)",
            background: "var(--button-gradient-soft)",
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

export function PartnerStripCTA() {
  const { user } = useAuth();
  const { hasOrg } = useAccountContext();

  const cta = user
    ? hasOrg
      ? { href: "/org/dashboard", label: "Go to Dashboard" }
      : { href: "/org/upgrade", label: "Set Up Organization" }
    : { href: "/signup?type=employer", label: "Become a Partner" };

  return (
    <div className="flex items-center gap-3">
      <Link href="/partners" className="text-sm font-semibold text-teal no-underline hover:underline">
        View all partners &rarr;
      </Link>
      <Link href={cta.href}>
        <Button className="brand-button"
          small
          primary
          style={{
            background: "var(--button-gradient)",
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          {cta.label}
        </Button>
      </Link>
    </div>
  );
}

export function BottomCTA() {
  const { user } = useAuth();

  return (
    <Link href={user ? "/feed" : "/signup"}>
      <Button className="brand-button"
        primary
        style={{
          background: "var(--button-gradient)",
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
