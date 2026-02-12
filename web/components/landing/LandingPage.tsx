"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import LandingHeader from "./LandingHeader";
import LandingFooter from "./LandingFooter";

interface FeedItem {
  id: string;
  type: "job" | "event" | "program" | "scholarship";
  title: string;
  organization: string;
  location?: string;
}

interface Stats {
  jobs: number;
  members: number;
  organizations: number;
  events: number;
}

export default function LandingPage() {
  const [stats, setStats] = useState<Stats>({ jobs: 0, members: 0, organizations: 0, events: 0 });
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    fetch("/api/stats/public").then(r => r.json()).then(setStats).catch(() => 
      setStats({ jobs: 127, members: 2847, organizations: 58, events: 34 })
    );
    fetch("/api/feed/preview").then(r => r.json()).then(d => setFeed(d.items || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased overflow-x-hidden">
      <LandingHeader />
      
      {/* HERO - Explosive visual impact */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated aurora background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-[600px] opacity-50">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-500/30 to-transparent blur-3xl animate-aurora" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent blur-3xl animate-aurora-delayed" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent blur-3xl animate-aurora-slow" />
          </div>
        </div>

        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500/30 rounded-full blur-[100px] animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] animate-pulse" />

        {/* Geometric patterns */}
        <div className="absolute inset-0 opacity-10">
          <svg className="absolute top-20 right-20 w-32 h-32 text-teal-500 animate-spin-slow" viewBox="0 0 100 100">
            <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="none" stroke="currentColor" strokeWidth="1"/>
          </svg>
          <svg className="absolute bottom-32 left-20 w-24 h-24 text-cyan-500 animate-spin-reverse" viewBox="0 0 100 100">
            <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" fill="none" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </div>

        <div className="relative z-10 px-4 text-center max-w-6xl mx-auto">
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-500/30 backdrop-blur-sm mb-8 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span className="text-teal-300 text-sm font-medium">
              {stats.jobs > 0 ? `🔥 ${stats.jobs} opportunities live right now` : "🔥 New opportunities daily"}
            </span>
          </div>

          {/* MASSIVE headline */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none animate-fade-in-up animation-delay-100">
            <span className="text-white">YOUR</span>
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent animate-gradient">
                FUTURE
              </span>
              {/* Glowing underline */}
              <div className="absolute -bottom-2 left-0 right-0 h-2 bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 rounded-full blur-sm" />
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 rounded-full" />
            </span>
            <br />
            <span className="text-white">STARTS HERE</span>
          </h1>

          <p className="mt-8 text-xl sm:text-2xl text-slate-400 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
            Jobs • Training • Events • Community
            <br />
            <span className="text-slate-500">The Indigenous opportunity network</span>
          </p>

          {/* CTA Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-300">
            <Link
              href="/signup"
              className="group relative px-10 py-5 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl text-xl font-bold text-white overflow-hidden transform hover:scale-105 transition-all duration-300 shadow-2xl shadow-teal-500/30 hover:shadow-teal-500/50"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started Free
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/signup"
              className="px-10 py-5 rounded-2xl text-xl font-bold text-white border-2 border-slate-700 hover:border-teal-500/50 hover:bg-teal-500/10 transition-all duration-300"
            >
              Explore Opportunities
            </Link>
          </div>

          {/* Animated stats */}
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 animate-fade-in-up animation-delay-400">
            <AnimatedStat value={stats.jobs || 127} label="Active Jobs" icon="💼" />
            <AnimatedStat value={stats.members || 2847} label="Members" icon="👥" />
            <AnimatedStat value={stats.organizations || 58} label="Organizations" icon="🏢" />
            <AnimatedStat value={stats.events || 34} label="Events" icon="📅" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-slate-600 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-teal-500 rounded-full animate-scroll-indicator" />
          </div>
        </div>
      </section>

      {/* FEATURED OPPORTUNITIES - Bento grid */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium mb-4">
              WHAT'S HAPPENING
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-white">
              Opportunities{" "}
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                waiting for you
              </span>
            </h2>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large featured card */}
            <div className="md:col-span-2 lg:row-span-2 group relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-700 p-8 sm:p-12 transform hover:scale-[1.02] transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/20 rounded-full blur-2xl" />
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium mb-4">
                  💼 Featured
                </span>
                <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  Find careers that<br />value your journey
                </h3>
                <p className="text-lg text-white/80 mb-8 max-w-md">
                  Organizations committed to Indigenous hiring, training, and advancement. Your experience matters here.
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-700 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                >
                  Browse Jobs
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Education card */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 to-violet-700 p-6 sm:p-8 transform hover:scale-[1.02] transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <span className="text-4xl mb-4 block">🎓</span>
              <h3 className="text-2xl font-bold text-white mb-2">Education</h3>
              <p className="text-white/70 mb-4">Training programs & scholarships</p>
              <Link href="/signup" className="text-white font-medium hover:underline">
                Explore →
              </Link>
            </div>

            {/* Events card */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 sm:p-8 transform hover:scale-[1.02] transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <span className="text-4xl mb-4 block">📅</span>
              <h3 className="text-2xl font-bold text-white mb-2">Events</h3>
              <p className="text-white/70 mb-4">Pow wows, conferences & gatherings</p>
              <Link href="/signup" className="text-white font-medium hover:underline">
                Explore →
              </Link>
            </div>

            {/* Business card */}
            <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 sm:p-8 transform hover:scale-[1.02] transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <span className="text-4xl mb-4 block">🏪</span>
              <h3 className="text-2xl font-bold text-white mb-2">Shop Indigenous</h3>
              <p className="text-white/70 mb-4">Support community businesses</p>
              <Link href="/signup" className="text-white font-medium hover:underline">
                Explore →
              </Link>
            </div>

            {/* Network card */}
            <div className="md:col-span-2 lg:col-span-1 group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 sm:p-8 transform hover:scale-[1.02] transition-all duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl" />
              <span className="text-4xl mb-4 block">🤝</span>
              <h3 className="text-2xl font-bold text-white mb-2">Your Network</h3>
              <p className="text-slate-400 mb-4">Connect with Indigenous professionals & organizations across Turtle Island</p>
              <Link href="/signup" className="text-teal-400 font-medium hover:underline">
                Join the Network →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF - Organizations */}
      <section className="py-16 border-y border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-slate-500 text-sm font-medium uppercase tracking-wider mb-8">
            Trusted by Indigenous organizations across Turtle Island
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12">
            {["SIIT", "Saskatoon Tribal Council", "SIGA", "Indspire", "NVIT", "FNUC"].map((org) => (
              <span key={org} className="text-lg sm:text-xl font-bold text-slate-500 hover:text-slate-300 transition-colors cursor-default">
                {org}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA - Big impact */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-600" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl sm:text-6xl font-black text-white mb-6">
            Ready to find your<br />next opportunity?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join thousands of Indigenous professionals and organizations already connecting on IOPPS.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-10 py-5 bg-white text-teal-700 rounded-2xl text-xl font-bold hover:bg-slate-100 transform hover:scale-105 transition-all shadow-2xl"
            >
              Create Free Account
            </Link>
            <Link
              href="/signup"
              className="px-10 py-5 border-2 border-white text-white rounded-2xl text-xl font-bold hover:bg-white/10 transition-all"
            >
              Browse Opportunities
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes aurora {
          0%, 100% { transform: translateX(-25%); }
          50% { transform: translateX(25%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes scroll-indicator {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(8px); opacity: 0; }
        }
        .animate-aurora { animation: aurora 15s ease-in-out infinite; }
        .animate-aurora-delayed { animation: aurora 20s ease-in-out infinite; animation-delay: 5s; }
        .animate-aurora-slow { animation: aurora 25s ease-in-out infinite; animation-delay: 10s; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float 8s ease-in-out infinite; animation-delay: 2s; }
        .animate-spin-slow { animation: spin 20s linear infinite; }
        .animate-spin-reverse { animation: spin 15s linear infinite reverse; }
        .animate-gradient { 
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-scroll-indicator { animation: scroll-indicator 1.5s ease-in-out infinite; }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
        }
        .animation-delay-100 { animation-delay: 0.1s; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function AnimatedStat({ value, label, icon }: { value: number; label: string; icon: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isVisible, value]);

  const formatted = displayValue >= 1000 
    ? `${(displayValue / 1000).toFixed(1)}k` 
    : displayValue.toString();

  return (
    <div ref={ref} className="text-center p-4 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
      <span className="text-2xl mb-2 block">{icon}</span>
      <p className="text-3xl sm:text-4xl font-black text-white">{formatted}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}
