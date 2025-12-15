import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from "react";
import Link from "next/link";

type BaseProps = {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
    external?: boolean;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles = {
  primary:
    "bg-gradient-to-r from-accent to-accent-soft text-slate-900 font-semibold hover:from-accent-hover hover:to-accent shadow-lg shadow-accent/20",
  secondary:
    "bg-slate-800/40 border border-slate-700/50 text-slate-200 hover:border-accent/50 hover:text-accent",
  outline:
    "border border-accent/50 text-accent hover:bg-accent/10 hover:border-accent",
  ghost:
    "text-slate-300 hover:bg-slate-800/50 hover:text-accent",
  danger:
    "bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:border-red-500",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-xl",
};

/**
 * Unified Button component with consistent styling across the platform.
 *
 * @example
 * // Primary button
 * <Button variant="primary">Submit</Button>
 *
 * // Link button
 * <Button href="/jobs" variant="secondary">View Jobs</Button>
 *
 * // Loading state
 * <Button variant="primary" loading>Submitting...</Button>
 */
const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      children,
      className = "",
      ...rest
    } = props;

    const baseStyles =
      "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

    const combinedClassName = [
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && "w-full",
      loading && "cursor-wait",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    // Loading spinner
    const LoadingSpinner = () => (
      <svg
        className="h-4 w-4 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    // Render as Link if href is provided
    if ("href" in rest && rest.href) {
      const { href, external, ...linkRest } = rest as ButtonAsLink;

      if (external) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={combinedClassName}
            {...linkRest}
          >
            {loading && <LoadingSpinner />}
            {children}
          </a>
        );
      }

      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={combinedClassName}
          {...linkRest}
        >
          {loading && <LoadingSpinner />}
          {children}
        </Link>
      );
    }

    // Render as button
    const buttonRest = rest as ButtonAsButton;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={combinedClassName}
        disabled={loading || buttonRest.disabled}
        {...buttonRest}
      >
        {loading && <LoadingSpinner />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
