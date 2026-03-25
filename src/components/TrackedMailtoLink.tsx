"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { trackContactIntent } from "@/lib/analytics/client";
import type { ContactIntentCategory } from "@/lib/analytics/events";

interface TrackedMailtoLinkProps
  extends AnchorHTMLAttributes<HTMLAnchorElement> {
  category: ContactIntentCategory;
  children: ReactNode;
  href: string;
}

export default function TrackedMailtoLink({
  category,
  children,
  onClick,
  ...props
}: TrackedMailtoLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      trackContactIntent(category);
    }
  };

  return (
    <a {...props} onClick={handleClick}>
      {children}
    </a>
  );
}
