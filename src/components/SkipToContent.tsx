"use client";

export default function SkipToContent() {
  return <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-navy" onClick={event => {
    const target = document.querySelector<HTMLElement>("[data-main-content]") || document.querySelector<HTMLElement>("#main-content h1") || document.getElementById("main-content");
    if (!target) return;
    event.preventDefault();
    target.tabIndex = -1;
    target.focus();
    target.scrollIntoView({ block: "start" });
  }}>Skip to content</a>;
}
