import Image from "next/image";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "navy" | "amber" | "default";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href?: string;
    external?: boolean;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    };

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "bg-surface-raised text-text-primary hover:bg-border-lt",
  outline: "border border-card-border text-text-primary hover:bg-border-lt",
  ghost: "text-text-secondary hover:bg-border-lt hover:text-text-primary",
  danger: "bg-red-600 text-white hover:bg-red-700",
  navy: "bg-slate-900 text-white hover:bg-slate-800",
  amber: "bg-amber-600 text-white hover:bg-amber-700",
  default: "bg-accent text-white hover:bg-accent-hover",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  href,
  external = false,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
    buttonVariants[variant],
    buttonSizes[size],
    fullWidth && "w-full",
    className,
  );

  if (href) {
    if (external) {
      return (
        <a className={classes} href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    }
    return (
      <Link className={classes} href={href} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

type AvatarProps = {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const avatarSizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
};

export function Avatar({ src, alt = "", fallback = "", size = "md", className }: AvatarProps) {
  const initials = fallback
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "IO";

  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full bg-surface-raised text-text-muted", avatarSizes[size], className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes="64px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-bold">{initials}</span>
      )}
    </span>
  );
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      className="rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-border-lt hover:text-text-primary"
    >
      Theme
    </button>
  );
}

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-xl border border-card-border bg-card shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-4", className)} {...props}>
      {children}
    </div>
  );
}

export function Badge({
  variant = "default",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "info" | "success" | "warning" }) {
  const variants = {
    default: "bg-surface-raised text-text-secondary",
    info: "bg-accent-bg text-accent",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", variants[variant], className)} {...props}>
      {children}
    </span>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-surface-raised", className)} {...props} />;
}

export type { ReactNode };
