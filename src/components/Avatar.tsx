interface AvatarProps {
  name: string;
  size?: number;
  gradient?: string;
  src?: string;
}

export default function Avatar({ name, size = 40, gradient, src }: AvatarProps) {
  const initials = (name || "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const radius = size > 48 ? 16 : "50%";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="shrink-0 object-cover"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
        }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center shrink-0 text-white font-extrabold"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: gradient || "linear-gradient(135deg, var(--teal), var(--navy))",
        fontSize: size * 0.32,
      }}
    >
      {initials}
    </div>
  );
}
