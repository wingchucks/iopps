import type { ReactNode } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import Button, { type ButtonVariant } from "@/components/Button";
import Card from "@/components/Card";

interface SpotlightAction {
  label: string;
  href: string;
  variant?: ButtonVariant;
}

interface SpotlightCardProps {
  eyebrow?: string;
  title: string;
  description: string;
  overline?: string;
  meta?: string[];
  avatarName?: string;
  avatarSrc?: string;
  primaryAction: SpotlightAction;
  secondaryAction?: SpotlightAction;
  className?: string;
  footer?: ReactNode;
}

function ActionButton({ action }: { action: SpotlightAction }) {
  const isExternal = action.href.startsWith("http");

  if (isExternal) {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer">
        <Button variant={action.variant ?? "primary-teal"}>{action.label}</Button>
      </a>
    );
  }

  return (
    <Link href={action.href}>
      <Button variant={action.variant ?? "primary-teal"}>{action.label}</Button>
    </Link>
  );
}

export default function SpotlightCard({
  eyebrow,
  title,
  description,
  overline,
  meta,
  avatarName,
  avatarSrc,
  primaryAction,
  secondaryAction,
  className,
  footer,
}: SpotlightCardProps) {
  return (
    <Card variant="spotlight" className={className}>
      <div className="p-5 sm:p-6">
        {eyebrow ? (
          <p className="m-0 text-xs font-extrabold uppercase tracking-[0.24em] text-teal">
            {eyebrow}
          </p>
        ) : null}

        {(avatarName || overline) ? (
          <div className="mt-4 flex items-center gap-3">
            {avatarName ? <Avatar name={avatarName} src={avatarSrc} size={48} /> : null}
            {overline ? (
              <p className="m-0 min-w-0 text-sm font-semibold text-text-sec">{overline}</p>
            ) : null}
          </div>
        ) : null}

        <h3 className="mt-4 text-[24px] font-bold leading-tight text-text">{title}</h3>
        <p className="mt-3 max-w-[640px] text-sm leading-7 text-text-sec">{description}</p>

        {meta?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {meta.map((item) => (
              <span
                key={item}
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: "color-mix(in srgb, var(--card) 78%, var(--bg))",
                  border: "1px solid color-mix(in srgb, var(--text-muted) 16%, var(--border))",
                  color: "var(--text-sec)",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <ActionButton action={primaryAction} />
          {secondaryAction ? <ActionButton action={secondaryAction} /> : null}
        </div>

        {footer ? <div className="mt-5">{footer}</div> : null}
      </div>
    </Card>
  );
}
