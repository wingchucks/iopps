interface ButtonProps {
  children: React.ReactNode;
  primary?: boolean;
  small?: boolean;
  full?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function Button({
  children,
  primary,
  small,
  full,
  onClick,
  className = "",
  style,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 ${
        full ? "w-full" : "w-auto"
      } ${className}`}
      style={{
        padding: small ? "8px 16px" : "12px 24px",
        borderRadius: 12,
        border: primary ? "none" : "1.5px solid var(--border)",
        background: primary ? "var(--navy)" : "var(--card)",
        color: primary ? "#fff" : "var(--text)",
        fontSize: small ? 13 : 15,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
