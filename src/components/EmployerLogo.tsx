"use client";
import { useState } from "react";
export default function EmployerLogo({ name, src }: { name: string; src?: string }) {
  const [failed, setFailed] = useState<string>();
  const usable = src && src !== failed && /^(https?:\/\/|\/)/.test(src);
  return <div className={`job-employer-logo${usable ? "" : " job-employer-logo-fallback"}`}>
    {usable ? <img src={src} alt={`${name} logo`} loading="lazy" onError={() => setFailed(src)} ref={image => { if (image?.complete && !image.naturalWidth) setFailed(src); }} /> : <>
      <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="15" width="32" height="25" rx="5"/><path d="M17 15V9h14v6M8 25c10 5 22 5 32 0M21 24h6v7h-6z"/></svg>
      <span>{name}</span>
    </>}
  </div>;
}
