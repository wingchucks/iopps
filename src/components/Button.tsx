import { cn } from "@/lib/utils";

export type ButtonVariant = "primary-teal" | "secondary-navy" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  primary?: boolean;
  small?: boolean;
  full?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 text-sm rounded-xl",
  md: "min-h-11 px-5 text-sm rounded-[14px]",
  lg: "min-h-12 px-6 text-base rounded-[16px]",
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  "primary-teal": {
    background: "var(--button-gradient)",
    border: "1px solid transparent",
    color: "#FFFFFF",
    boxShadow: "var(--button-gradient-shadow)",
  },
  "secondary-navy": {
    background: "var(--button-gradient)",
    border: "1px solid transparent",
    color: "#FFFFFF",
    boxShadow: "var(--button-gradient-shadow)",
  },
  outline: {
    background: "var(--button-gradient-soft)",
    border: "1px solid var(--button-gradient-border)",
    color: "var(--button-gradient-soft-text)",
  },
  ghost: {
    background: "transparent",
    border: "1px solid transparent",
    color: "var(--text-sec)",
  },
};

export default function Button({
  children,
  primary,
  small,
  full,
  variant,
  size,
  className = "",
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const resolvedVariant = variant ?? (primary ? "secondary-navy" : "outline");
  const resolvedSize = size ?? (small ? "sm" : "md");

  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        "brand-button inline-flex items-center justify-center gap-2 border font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-55",
        full ? "w-full" : "w-auto",
        !disabled && "cursor-pointer",
        sizeClasses[resolvedSize],
        className,
      )}
      style={{
        ...variantStyles[resolvedVariant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
