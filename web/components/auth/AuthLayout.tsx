"use client";

import Link from "next/link";
import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-r border-slate-800/50">
        <div className="max-w-md">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.png"
              alt="IOPPS"
              width={180}
              height={60}
              className="h-12 w-auto"
              priority
            />
          </Link>

          <h2 className="mt-10 text-3xl font-bold text-slate-50 tracking-tight">
            Empowering Indigenous Success
          </h2>
          <p className="mt-4 text-lg text-slate-400 leading-relaxed">
            Connect with opportunities, build your career, and join a community dedicated to Indigenous prosperity.
          </p>

          <div className="mt-10 space-y-4">
            <FeatureItem text="Access thousands of job opportunities" />
            <FeatureItem text="Connect with Indigenous-focused employers" />
            <FeatureItem text="Discover scholarships and events" />
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-12 xl:px-20 py-10 sm:py-16">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="IOPPS"
                width={140}
                height={46}
                className="h-10 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Header */}
          <div className="animate-fade-in">
            <p className="text-xs uppercase tracking-[0.4em] text-[#14B8A6]">
              {title}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl text-slate-50">
              {subtitle}
            </h1>
          </div>

          {/* Form Content */}
          <div className="mt-8 animate-fade-in-delay">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#14B8A6]/20 flex items-center justify-center">
        <svg className="w-3 h-3 text-[#14B8A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-slate-300">{text}</span>
    </div>
  );
}
