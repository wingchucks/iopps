"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

const typeStyles: Record<ToastProps["type"], { bg: string; border: string; color: string; icon: string }> = {
  success: {
    bg: "var(--green-soft)",
    border: "var(--green)",
    color: "var(--green)",
    icon: "\u2713",
  },
  error: {
    bg: "var(--red-soft)",
    border: "var(--red)",
    color: "var(--red)",
    icon: "\u2717",
  },
  info: {
    bg: "var(--blue-soft)",
    border: "var(--blue)",
    color: "var(--blue)",
    icon: "\u2139",
  },
};

export default function Toast({ message, type, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const style = typeStyles[type];

  useEffect(() => {
    // Trigger slide-in
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="pointer-events-auto flex items-center gap-2.5 rounded-xl shadow-lg transition-all duration-300"
      style={{
        padding: "12px 18px",
        background: style.bg,
        border: `1.5px solid ${style.border}`,
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
        minWidth: 260,
        maxWidth: 400,
      }}
    >
      <span
        className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0"
        style={{ background: style.color }}
      >
        {style.icon}
      </span>
      <p className="text-sm font-semibold m-0 flex-1" style={{ color: style.color }}>
        {message}
      </p>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
        className="text-sm border-none bg-transparent cursor-pointer shrink-0"
        style={{ color: style.color, opacity: 0.6, lineHeight: 1 }}
      >
        &#215;
      </button>
    </div>
  );
}
