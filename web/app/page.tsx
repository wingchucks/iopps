"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Briefcase, GraduationCap, Users, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface Stats {
  jobs: number;
  members: number;
  organizations: number;
  events: number;
}

const features = [
  {
    title: "Careers",
    description:
      "Browse Indigenous-focused job opportunities from organizations committed to Indigenous employment and reconciliation.",
    href: "/careers",
    icon: Briefcase,
  },
  {
    title: "Education",
    description:
      "Discover scholarships, conferences, and learning opportunities designed to support Indigenous students and professionals.",
    href: "/education",
    icon: GraduationCap,
  },
  {
    title: "Community",
    description:
      "Connect with pow wows, cultural events, and community gatherings happening across Canada.",
    href: "/community",
    icon: Users,
  },
  {
    title: "Business Directory",
    description:
      "Find and support Indigenous-owned businesses, or list your own to reach a wider audience.",
    href: "/business",
    icon: Building2,
  },
];

export default function HomePage() {
  const [stats, setStats] = useState<Stats>({ jobs: 0, members: 0, organizations: 0, events: 0 });

  useEffect(() => {
    fetch("/api/stats/public")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const statItems = [
    { label: "Active Jobs", value: stats.jobs },
    { label: "Organizations", value: stats.organizations },
    { label: "Members", value: stats.members },
    { label: "Events", value: stats.events },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background px-4 py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
            <span className="text-accent">IOPPS.CA</span>
            <br />
            Empowering Indigenous Success
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-text-secondary">
            Canada&apos;s hub for Indigenous jobs, conferences, scholarships, pow
            wows, business directories, and live streams.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="primary" size="lg" href="/careers">
              Browse Jobs
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="lg" href="/pricing">
              For Employers
            </Button>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--accent)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "var(--info)" }}
          aria-hidden="true"
        />
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-surface px-4 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
          {statItems.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-accent">
                {stat.value > 0 ? stat.value.toLocaleString() : "0"}
              </p>
              <p className="mt-1 text-sm text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-text-primary">
              Everything You Need
            </h2>
            <p className="mt-3 text-text-secondary">
              A comprehensive platform built for Indigenous communities and their
              allies.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link key={feature.href} href={feature.href} className="group">
                  <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:border-card-border-hover hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className="mb-4 inline-flex rounded-lg bg-accent-bg p-3">
                        <Icon className="h-6 w-6 text-accent" />
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm text-text-muted">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-accent px-4 py-16 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mt-3 text-white/80">
            {stats.members > 0
              ? `Join ${stats.members.toLocaleString()} Indigenous professionals and organizations already using IOPPS to connect and grow.`
              : "Join Indigenous professionals and organizations already using IOPPS to connect and grow."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              variant="navy"
              size="lg"
              href="/signup"
            >
              Create Free Account
            </Button>
            <Button
              variant="ghost"
              size="lg"
              href="/about"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
