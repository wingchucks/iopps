interface CardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  gold?: boolean;
}

export default function Card({
  children,
  onClick,
  className = "",
  style,
  gold,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-2xl overflow-hidden transition-all duration-200 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      style={{
        border: gold
          ? "2px solid var(--gold)"
          : "1px solid var(--border)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
