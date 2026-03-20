interface BadgeProps {
  text: string;
  color?: string;
  bg?: string;
  small?: boolean;
  icon?: React.ReactNode;
}

export default function Badge({
  text,
  color = "var(--teal)",
  bg,
  small,
  icon,
}: BadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full whitespace-nowrap font-bold"
      style={{
        padding: small ? "2px 8px" : "4px 12px",
        fontSize: small ? 10 : 12,
        color,
        background: bg || color + "15",
      }}
    >
      {icon}
      {text}
    </span>
  );
}
