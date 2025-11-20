import Link, { LinkProps } from "next/link";
import { ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost";

const baseClasses =
  "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 disabled:opacity-60";

const variantClasses: Record<Variant, string> = {
  primary: "bg-teal-500 text-slate-900 hover:bg-teal-400",
  secondary:
    "bg-white/10 text-white hover:bg-white/20 border border-white/20 shadow-inner shadow-white/10",
  outline:
    "border border-slate-700 text-slate-100 hover:border-teal-400 hover:text-teal-200",
  ghost: "text-teal-300 hover:text-teal-200",
};

export function buttonClasses(
  variant: Variant = "primary",
  extra = ""
): string {
  return [baseClasses, variantClasses[variant], extra]
    .filter(Boolean)
    .join(" ");
}

type ButtonLinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  variant?: Variant;
};

export function ButtonLink({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link {...props} className={buttonClasses(variant, className)}>
      {children}
    </Link>
  );
}
