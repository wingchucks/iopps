"use client";
import React from "react";
import { CSS } from "./constants";

/* ── Background Mesh ── */
export function BackgroundMesh() {
  return (
    <>
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 100% 70% at 20% -20%,rgba(20,184,166,0.08),transparent 55%),
          radial-gradient(ellipse 70% 50% at 85% 15%,rgba(14,165,233,0.06),transparent 45%),
          radial-gradient(ellipse 50% 60% at 50% 110%,rgba(167,139,250,0.04),transparent 45%)`,
      }} />
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(20,184,166,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,0.02) 1px,transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse 70% 50% at 50% 30%,black 20%,transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 50% at 50% 30%,black 20%,transparent 70%)",
      }} />
    </>
  );
}

/* ── Top Bar ── */
export function TopBar({ stepLabel, showLogin = true }: { stepLabel: string; showLogin?: boolean }) {
  return (
    <>
      <div style={{
        background: "rgba(2,6,23,0.92)", backdropFilter: "blur(16px) saturate(1.3)",
        borderBottom: `1px solid ${CSS.border}`,
        padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{
          fontSize: 20, fontWeight: 800,
          background: `linear-gradient(135deg,${CSS.accent},${CSS.blue})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: -0.5,
        }}>IOPPS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: CSS.textMuted }}>{stepLabel}</span>
          {showLogin && (
            <a href="/login" style={{ fontSize: 13, color: CSS.accent, textDecoration: "none", fontWeight: 500 }}>
              Already have an account? <strong>Log in</strong>
            </a>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Progress Bar ── */
export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={{ height: 3, background: "#1e293b", position: "relative" }}>
      <div style={{
        height: "100%",
        background: `linear-gradient(90deg,${CSS.accent},${CSS.blue})`,
        width: `${percent}%`,
        transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        borderRadius: "0 2px 2px 0",
      }} />
    </div>
  );
}

/* ── Step Dots ── */
export function StepDots({ labels, current }: { labels: string[]; current: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40 }}>
      {labels.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: isActive ? CSS.accent : isDone ? CSS.accent : "#1e293b",
              opacity: isDone ? 0.5 : 1,
              boxShadow: isActive ? `0 0 12px ${CSS.accentGlow}` : "none",
              transition: "all 0.4s ease",
            }} />
            <span style={{
              fontSize: 10, color: CSS.textDim,
              opacity: isActive || isDone ? 1 : 0,
              transition: "opacity 0.3s",
              whiteSpace: "nowrap",
            }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Step Header ── */
export function StepHeader({ eyebrow, title, highlight, desc }: {
  eyebrow: string; title: string; highlight: string; desc: string;
}) {
  return (
    <>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.15em", color: CSS.accent, fontWeight: 600, marginBottom: 8 }}>{eyebrow}</div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>
        {title} <span style={{ background: `linear-gradient(135deg,${CSS.accent},${CSS.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{highlight}</span>
      </div>
      <div style={{ fontSize: 15, color: CSS.textMuted, lineHeight: 1.6, marginBottom: 32 }}>{desc}</div>
    </>
  );
}

/* ── Form Input ── */
export function FormInput({ label, required, ...props }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted }}>
        {label} {required && <span style={{ color: CSS.accent }}>*</span>}
      </label>
      <input
        {...props}
        style={{
          background: "rgba(15,23,42,0.8)", border: `1px solid ${CSS.border}`, borderRadius: 10,
          padding: "12px 16px", fontSize: 15, color: CSS.text, fontFamily: "inherit",
          outline: "none", transition: "all 0.25s", ...((props.style || {}) as React.CSSProperties),
        }}
      />
    </div>
  );
}

/* ── Form Select ── */
export function FormSelect({ label, required, options, ...props }: {
  label: string; required?: boolean; options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted }}>
        {label} {required && <span style={{ color: CSS.accent }}>*</span>}
      </label>
      <select
        {...props}
        style={{
          background: "rgba(15,23,42,0.8)", border: `1px solid ${CSS.border}`, borderRadius: 10,
          padding: "12px 16px", fontSize: 15, color: CSS.text, fontFamily: "inherit",
          outline: "none", appearance: "none",
          ...((props.style || {}) as React.CSSProperties),
        }}
      >
        {options.map(o => <option key={o.value} value={o.value} style={{ background: "#1e293b", color: CSS.text }}>{o.label}</option>)}
      </select>
    </div>
  );
}

/* ── Form Textarea ── */
export function FormTextarea({ label, required, ...props }: { label: string; required?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: CSS.textMuted }}>
        {label} {required && <span style={{ color: CSS.accent }}>*</span>}
      </label>
      <textarea
        {...props}
        style={{
          background: "rgba(15,23,42,0.8)", border: `1px solid ${CSS.border}`, borderRadius: 10,
          padding: "12px 16px", fontSize: 15, color: CSS.text, fontFamily: "inherit",
          outline: "none", resize: "vertical", minHeight: 80,
          ...((props.style || {}) as React.CSSProperties),
        }}
      />
    </div>
  );
}

/* ── Checkbox Item ── */
export function CheckboxItem({ icon, label, checked, onToggle }: {
  icon: string; label: string; checked: boolean; onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
        background: checked ? "rgba(20,184,166,0.05)" : CSS.card,
        border: `1px solid ${checked ? CSS.accent : CSS.border}`,
        borderRadius: 10, cursor: "pointer", transition: "all 0.25s", fontSize: 14,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: 4,
        border: `2px solid ${checked ? CSS.accent : CSS.border}`,
        background: checked ? CSS.accent : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s", flexShrink: 0,
      }}>
        {checked && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

/* ── Upload Zone ── */
export function UploadZone({ label, hint, hasFile, onFileChange }: {
  label: string; hint: string; hasFile: boolean;
  onFileChange: (f: File | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${hasFile ? CSS.success : CSS.border}`,
        borderStyle: hasFile ? "solid" : "dashed",
        borderRadius: 12, padding: 32, textAlign: "center", cursor: "pointer",
        transition: "all 0.25s", background: hasFile ? "rgba(34,197,94,0.05)" : "rgba(15,23,42,0.4)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: 120,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.6 }}>{hasFile ? "✅" : "🖼️"}</div>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{hasFile ? "File Selected" : label}</div>
      <div style={{ fontSize: 12, color: CSS.textDim }}>{hint}</div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => onFileChange(e.target.files?.[0] || null)} />
    </div>
  );
}

/* ── Role Card ── */
export function RoleCard({ icon, label, desc, selected, onClick }: {
  icon: string; label: string; desc: string; selected: boolean; onClick: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      background: CSS.card,
      border: `1px solid ${selected ? CSS.accent : CSS.border}`,
      borderRadius: 16, padding: 24, cursor: "pointer",
      transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
      position: "relative", overflow: "hidden",
      boxShadow: selected ? `0 0 0 1px ${CSS.accent}, 0 8px 32px rgba(20,184,166,0.15)` : "none",
    }}>
      <div style={{
        position: "absolute", top: 12, right: 12, width: 24, height: 24, borderRadius: "50%",
        border: `2px solid ${selected ? CSS.accent : CSS.border}`,
        background: selected ? CSS.accent : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.3s",
      }}>
        {selected && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
      </div>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: CSS.textMuted, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

/* ── Org Type Card ── */
export function OrgTypeCard({ icon, label, desc, selected, onClick }: {
  icon: string; label: string; desc: string; selected: boolean; onClick: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      background: selected ? "rgba(20,184,166,0.05)" : CSS.card,
      border: `1px solid ${selected ? CSS.accent : CSS.border}`,
      borderRadius: 12, padding: 20, cursor: "pointer",
      transition: "all 0.3s", display: "flex", alignItems: "flex-start", gap: 16,
    }}>
      <span style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13, color: CSS.textMuted, lineHeight: 1.45 }}>{desc}</div>
      </div>
      <div style={{
        width: 20, height: 20, borderRadius: "50%",
        border: `2px solid ${selected ? CSS.accent : CSS.border}`,
        flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.3s",
      }}>
        {selected && <div style={{ width: 10, height: 10, borderRadius: "50%", background: CSS.accent }} />}
      </div>
    </div>
  );
}

/* ── Buttons ── */
export function BtnPrimary({ children, onClick, disabled, style: s }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "inherit",
      cursor: disabled ? "not-allowed" : "pointer", border: "none",
      background: `linear-gradient(135deg,${CSS.accent},${CSS.blue})`, color: "#fff",
      opacity: disabled ? 0.4 : 1,
      boxShadow: `0 4px 20px rgba(20,184,166,0.25),inset 0 1px 0 rgba(255,255,255,0.12)`,
      transition: "all 0.3s", display: "inline-flex", alignItems: "center", gap: 8,
      ...s,
    }}>{children}</button>
  );
}

export function BtnSecondary({ children, onClick, style: s }: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} style={{
      padding: "14px 28px", borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "inherit",
      cursor: "pointer", background: "rgba(30,41,59,0.8)", color: CSS.text,
      border: `1px solid ${CSS.border}`, transition: "all 0.3s",
      display: "inline-flex", alignItems: "center", gap: 8, ...s,
    }}>{children}</button>
  );
}

export function BtnGhost({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "14px 16px", borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "inherit",
      cursor: "pointer", background: "transparent", color: CSS.textMuted,
      border: "none", transition: "all 0.3s",
    }}>{children}</button>
  );
}

/* ── Info Banner ── */
export function InfoBanner({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)",
      borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ fontSize: 13, color: CSS.textMuted, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

/* ── Review Section ── */
export function ReviewSection({ icon, title, onEdit, children }: {
  icon: string; title: string; onEdit: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ background: CSS.card, border: `1px solid ${CSS.border}`, borderRadius: 16, padding: 24, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <span>{icon}</span> {title}
        </div>
        <span onClick={onEdit} style={{ fontSize: 12, color: CSS.accent, cursor: "pointer", fontWeight: 500 }}>Edit</span>
      </div>
      {children}
    </div>
  );
}

export function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${CSS.borderLight}` }}>
      <span style={{ fontSize: 13, color: CSS.textDim }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

/* ── Google Button ── */
export function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 500, fontFamily: "inherit",
      cursor: "pointer", border: `1px solid ${CSS.border}`, background: CSS.card, color: CSS.text,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12, transition: "all 0.25s",
    }}>
      <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Continue with Google
    </button>
  );
}

/* ── Password Strength ── */
export function PasswordStrength({ password }: { password: string }) {
  let strength = 0;
  let label = "";
  let color: string = CSS.error;
  if (password.length >= 6) { strength = 1; label = "Weak"; color = CSS.error; }
  if (password.length >= 8) { strength = 2; label = "Good"; color = CSS.amber; }
  if (password.length >= 10 && /[A-Z]/.test(password)) { strength = 3; label = "Good"; color = CSS.amber; }
  if (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password)) { strength = 4; label = "Strong"; color = CSS.success; }

  if (!password) return null;
  return (
    <>
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= strength ? color : "#1e293b", transition: "background 0.3s" }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: CSS.textDim, marginTop: 4 }}>{label}</div>
    </>
  );
}