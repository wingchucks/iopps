import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "navy" | "amber";
type Size = "sm" | "md" | "lg";

type BaseProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps & {
  href: string;
  external?: boolean;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-accent text-white font-semibold hover:bg-accent-hover shadow-sm",
  secondary:
    "bg-card border border-card-border text-text-secondary hover:border-accent hover:text-accent",
  outline:
    "border border-accent text-accent hover:bg-accent-bg",
  ghost:
    "text-text-secondary hover:bg-border-lt hover:text-text-primary",
  danger:
    "bg-error/10 border border-error/50 text-error hover:bg-error/20",
  navy:
    "bg-navy text-white font-semibold hover:bg-navy-lt shadow-sm",
  amber:
    "bg-amber text-white font-semibold hover:opacity-90 shadow-sm",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-xl",
};

function LoadingSpinner() {
  return (
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
}

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      children,
      className,
      ...rest
    } = props;

    const classes = cn(
      "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && "w-full",
      loading && "cursor-wait",
      className,
    );

    // Link variant
    if ("href" in rest && rest.href) {
      const { href, external, ...linkRest } = rest as ButtonAsLink;

      if (external) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={classes}
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
          className={classes}
          {...linkRest}
        >
          {loading && <LoadingSpinner />}
          {children}
        </Link>
      );
    }

    // Button variant
    const buttonRest = rest as ButtonAsButton;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        disabled={loading || buttonRest.disabled}
        {...buttonRest}
      >
        {loading && <LoadingSpinner />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
