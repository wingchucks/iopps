import { CSS } from "@/components/signup/constants";

/** Explicit text-node separator: styling must never be the only word boundary. */
export function StepHeader({ eyebrow, title, highlight, desc }: {
  eyebrow: string; title: string; highlight: string; desc: string;
}) {
  return <>
    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: CSS.accent, fontWeight: 600, marginBottom: 8 }}>{eyebrow}</div>
    <h1 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>
      {title}{" "}<span style={{ background: `linear-gradient(135deg,${CSS.accent},${CSS.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{highlight}</span>
    </h1>
    <div style={{ fontSize: 15, color: CSS.textMuted, lineHeight: 1.6, marginBottom: 32 }}>{desc}</div>
  </>;
}
