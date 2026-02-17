interface AvatarProps {
  name: string;
  size?: number;
  gradient?: string;
}

export default function Avatar({ name, size = 40, gradient }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div
      className="flex items-center justify-center shrink-0 text-white font-extrabold"
      style={{
        width: size,
        height: size,
        borderRadius: size > 48 ? 16 : "50%",
        background: gradient || "linear-gradient(135deg, var(--teal), var(--navy))",
        fontSize: size * 0.32,
      }}
    >
      {initials}
    </div>
  );
}
