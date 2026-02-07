"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";

interface DiscoveryCardWrapperProps {
  href?: string;
  featured?: boolean;
  imageUrl?: string;
  imageAlt?: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DiscoveryCardWrapper({
  href,
  featured = false,
  imageUrl,
  imageAlt = "",
  children,
  onClick,
  className = "",
}: DiscoveryCardWrapperProps) {
  const baseStyles = `group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1`;
  const featuredStyles = featured
    ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 hover:border-amber-500/50"
    : "border-[var(--card-border)] bg-surface hover:border-[#14B8A6]/50";

  const cardContent = (
    <>
      {imageUrl && (
        <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#14B8A6] to-cyan-700">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
        </div>
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseStyles} ${featuredStyles} ${className}`}
        onClick={onClick}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <div
      className={`${baseStyles} ${featuredStyles} ${className}`}
      onClick={onClick}
    >
      {cardContent}
    </div>
  );
}

// Card content section for organizing card internals
interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
}

export function CardHeader({
  children,
  className = "",
  gradient = true,
}: CardHeaderProps) {
  return (
    <div
      className={`relative px-5 py-5 ${
        gradient ? "bg-gradient-to-br from-[#14B8A6]/20 to-cyan-600/10" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = "" }: CardBodyProps) {
  return <div className={`flex flex-1 flex-col p-5 ${className}`}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div
      className={`mt-4 flex items-center justify-between border-t border-[var(--card-border)] pt-4 ${className}`}
    >
      {children}
    </div>
  );
}

// Card title with consistent styling
interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return (
    <h3
      className={`text-lg font-bold text-white line-clamp-2 group-hover:text-[#14B8A6] transition-colors ${className}`}
    >
      {children}
    </h3>
  );
}

// Card subtitle / provider name
interface CardSubtitleProps {
  children: ReactNode;
  className?: string;
}

export function CardSubtitle({ children, className = "" }: CardSubtitleProps) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-wider text-[#14B8A6] mb-1 ${className}`}
    >
      {children}
    </p>
  );
}

// Card description
interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
  lines?: 2 | 3;
}

export function CardDescription({
  children,
  className = "",
  lines = 2,
}: CardDescriptionProps) {
  return (
    <p
      className={`text-sm text-[var(--text-secondary)] ${
        lines === 2 ? "line-clamp-2" : "line-clamp-3"
      } ${className}`}
    >
      {children}
    </p>
  );
}

// View details link
interface ViewDetailsLinkProps {
  className?: string;
}

export function ViewDetailsLink({ className = "" }: ViewDetailsLinkProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold text-[#14B8A6] group-hover:gap-2 transition-all ${className}`}
    >
      View details
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </span>
  );
}
