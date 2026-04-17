import { cn } from "@/lib/utils";

export type CardVariant = "default" | "spotlight" | "list";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  gold?: boolean;
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    background: "var(--card)",
    border: "1px solid var(--border)",
  },
  spotlight: {
    background:
      "linear-gradient(145deg, color-mix(in srgb, var(--teal-soft) 48%, var(--card)) 0%, var(--card) 54%, color-mix(in srgb, var(--bg) 76%, var(--card)) 100%)",
    border: "1px solid color-mix(in srgb, var(--teal) 22%, var(--border))",
    boxShadow: "0 18px 40px -28px color-mix(in srgb, var(--teal) 60%, transparent)",
  },
  list: {
    background: "var(--card)",
    border: "1px solid color-mix(in srgb, var(--text-muted) 18%, var(--border))",
    boxShadow: "0 12px 26px -26px color-mix(in srgb, var(--navy) 65%, transparent)",
  },
};

export default function Card({
  children,
  className = "",
  style,
  gold,
  variant = "default",
  onClick,
  ...rest
}: CardProps) {
  return (
    <div
      {...rest}
      onClick={onClick}
      className={cn(
        "overflow-hidden rounded-[24px] transition-all duration-200",
        onClick && "cursor-pointer",
        className,
      )}
      style={{
        ...variantStyles[variant],
        ...(gold ? { border: "2px solid var(--gold)" } : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
