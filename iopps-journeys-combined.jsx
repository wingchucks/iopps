import { useState, useEffect, useRef } from "react";

// ── DESIGN TOKENS ──────────────────────────────────────────
const C = {
  bg: "#F8F9FA", surface: "#FFFFFF", navy: "#0F1B2D", navyLt: "#1A2A40",
  accent: "#0D9488", accentDk: "#0B7C72", accentDp: "#075E57", accentBg: "#F0FDFA", accentLt: "#CCFBF1",
  amber: "#D97706", amberBg: "#FFFBEB", amberLt: "#FEF3C7",
  red: "#DC2626", redBg: "#FEF2F2",
  green: "#059669", greenBg: "#ECFDF5", greenLt: "#D1FAE5",
  blue: "#2563EB", blueBg: "#EFF6FF",
  purple: "#7C3AED", purpleBg: "#F5F3FF",
  pink: "#DB2777", pinkBg: "#FDF2F8",
  orange: "#EA580C", orangeBg: "#FFF7ED",
  text: "#111827", textSoft: "#4B5563", textMd: "#6B7280", textMuted: "#9CA3AF",
  border: "#E5E7EB", borderLt: "#F3F4F6",
  gradient: "linear-gradient(135deg, #0F1B2D 0%, #0B7C72 50%, #0D9488 100%)",
  gradientSubtle: "linear-gradient(135deg, #F0FDFA 0%, #ECFDF5 50%, #F0FDFA 100%)",
};

// ── ANIMATIONS ─────────────────────────────────────────────
const fadeUp = { animation: "fadeUp 0.4s ease-out forwards", opacity: 0 };
const fadeIn = { animation: "fadeIn 0.3s ease-out forwards" };
const keyframes = `
@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
@keyframes pulse { 0%,100% { transform:scale(1) } 50% { transform:scale(1.05) } }
@keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
@keyframes checkmark { from { stroke-dashoffset:24 } to { stroke-dashoffset:0 } }
@keyframes confetti { 0% { transform:translateY(0) rotate(0) } 100% { transform:translateY(-200px) rotate(720deg); opacity:0 } }
@keyframes shimmer { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
@keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
.btn-hover { transition: all 0.2s ease }
.btn-hover:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(13,148,136,0.2) }
.card-hover { transition: all 0.2s ease }
.card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) }
input:focus, textarea:focus, select:focus { outline: none; border-color: ${C.accent} !important; box-shadow: 0 0 0 3px rgba(13,148,136,0.1) }
`;

// ── SVG ICONS ──────────────────────────────────────────────
const icons = {
  building: "M3 21V3h8v4h10v14H3zm2-2h4v-2H5v2zm0-4h4v-2H5v2zm0-4h4V9H5v2zm6 8h4v-6h-4v6zm6-2h2v-2h-2v2zm0-4h2v-2h-2v2z",
  users: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8m7 10v-2a4 4 0 013-3.87M16 3.13a4 4 0 010 7.75",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8",
  check: "M20 6L9 17l-5-5",
  arrow: "M5 12h14M12 5l7 7-7 7",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  briefcase: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  plus: "M12 5v14M5 12h14",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2l-8 5-8-5",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zm-2 0V7a5 5 0 00-10 0v4",
  verified: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  clock: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14v4l3 3",
  location: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z M12 7a3 3 0 100 6 3 3 0 000-6z",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  photo: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 13a4 4 0 100-8 4 4 0 000 8z",
  globe: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  heartFill: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  chart: "M18 20V10M12 20V4M6 20v-6",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  back: "M19 12H5M12 19l-7-7 7-7",
  menu: "M3 12h18M3 6h18M3 18h18",
  x: "M18 6L6 18M6 6l12 12",
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  bookmark: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z",
  share: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  file: "M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7zM13 2v7h7",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z",
  externalLink: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  feather: "M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5zM16 8L2 22M17.5 15H9",
  compass: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z",
};

const I = ({ n, s = 20, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={n === "heartFill" ? c : "none"} stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d={icons[n]} />
  </svg>
);

// ── SHARED COMPONENTS ──────────────────────────────────────
const Btn = ({ children, v = "primary", icon, onClick, disabled, full, small, style: sx }) => {
  const styles = {
    primary: { background: C.accent, color: "#fff", border: "none" },
    secondary: { background: C.accentBg, color: C.accent, border: `1px solid ${C.accentLt}` },
    ghost: { background: "transparent", color: C.textSoft, border: `1px solid ${C.border}` },
    amber: { background: C.amber, color: "#fff", border: "none" },
    danger: { background: C.red, color: "#fff", border: "none" },
    navy: { background: C.navy, color: "#fff", border: "none" },
  };
  return (
    <button className="btn-hover" disabled={disabled} onClick={onClick} style={{
      ...styles[v], padding: small ? "6px 12px" : "10px 18px", borderRadius: 10, fontSize: small ? 12 : 14,
      fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center",
      gap: 6, opacity: disabled ? 0.5 : 1, width: full ? "100%" : "auto", justifyContent: "center", ...sx,
    }}>
      {icon && <I n={icon} s={small ? 14 : 16} c={styles[v].color === "#fff" ? "#fff" : C.accent} />}
      {children}
    </button>
  );
};

const Input = ({ label, placeholder, type = "text", value, onChange, required, icon, textarea, select, options, hint }) => (
  <div style={{ marginBottom: 16 }}>
    {label && (
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
        {label}{required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
      </label>
    )}
    <div style={{ position: "relative" }}>
      {icon && <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><I n={icon} s={16} c={C.textMuted} /></div>}
      {select ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{
          width: "100%", padding: "10px 14px", paddingLeft: icon ? 36 : 14, borderRadius: 10,
          border: `1px solid ${C.border}`, fontSize: 14, color: value ? C.text : C.textMuted,
          background: C.surface, appearance: "none",
        }}>
          <option value="">{placeholder}</option>
          {options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : textarea ? (
        <textarea placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} rows={4} style={{
          width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
          fontSize: 14, color: C.text, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
        }} />
      ) : (
        <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={{
          width: "100%", padding: "10px 14px", paddingLeft: icon ? 36 : 14, borderRadius: 10,
          border: `1px solid ${C.border}`, fontSize: 14, color: C.text, boxSizing: "border-box",
        }} />
      )}
    </div>
    {hint && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{hint}</div>}
  </div>
);

const Tag = ({ children, warn, teal }) => (
  <span style={{
    padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500,
    background: warn ? C.amberBg : teal ? C.accentBg : C.bg,
    color: warn ? C.amber : teal ? C.accent : C.textSoft,
    border: `1px solid ${warn ? C.amberLt : teal ? C.accentLt : C.borderLt}`,
  }}>{children}</span>
);

const Bdg = ({ children, v = "default" }) => {
  const m = { default: { bg: C.bg, fg: C.textSoft, b: C.border }, teal: { bg: C.accentBg, fg: C.accent, b: C.accentLt }, live: { bg: C.redBg, fg: C.red, b: "#FECACA" } };
  const s = m[v] || m.default;
  return <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: s.bg, color: s.fg, border: `1px solid ${s.b}`, whiteSpace: "nowrap" }}>{children}</span>;
};

const Av = ({ name, sz = 40, ring }) => {
  const colors = ["#0D9488", "#2563EB", "#7C3AED", "#D97706", "#DB2777", "#059669", "#DC2626", "#EA580C"];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: sz, height: sz, borderRadius: sz > 60 ? 20 : 12, background: colors[idx],
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz * 0.36,
      fontWeight: 700, color: "#fff", flexShrink: 0,
      border: ring ? `3px solid #fff` : "none",
      boxShadow: ring ? `0 0 0 2px ${C.accent}` : "none",
    }}>{initials}</div>
  );
};

const StatBox = ({ value, label, icon, color = C.accent }) => (
  <div style={{ flex: 1, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 12px", textAlign: "center" }}>
    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
      <I n={icon} s={16} c={color} />
    </div>
    <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{value}</div>
    <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>{label}</div>
  </div>
);

const EBtn = ({ icon, label, active, onClick, color }) => (
  <button onClick={onClick} style={{
    background: "none", border: "none", display: "flex", alignItems: "center", gap: 4,
    padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: active ? (color || C.accent) : C.textMuted,
    fontWeight: active ? 600 : 400,
  }}>
    <I n={icon} s={16} c={active ? (color || C.accent) : C.textMuted} />
    {label && <span>{label}</span>}
  </button>
);

const Progress = ({ step, total, labels }) => (
  <div style={{ marginBottom: 24 }}>
    <div style={{ display: "flex", gap: 4, marginBottom: labels ? 8 : 0 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= step ? C.accent : C.borderLt, transition: "all 0.3s" }} />
      ))}
    </div>
    {labels && <div style={{ display: "flex", justifyContent: "space-between" }}>
      {labels.map((l, i) => (
        <span key={i} style={{ fontSize: 11, fontWeight: i === step ? 700 : 400, color: i <= step ? C.accent : C.textMuted }}>{l}</span>
      ))}
    </div>}
  </div>
);


// ── SCREEN 1: LANDING ──────────────────────────────────────

// ── EMPLOYER PROGRESS BAR (different from community Progress) ──
const ProgressBar = ({ steps, current }) => (
  <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
    {steps.map((s, i) => (
      <div key={i} style={{ flex: 1, textAlign: "center" }}>
        <div style={{
          height: 4, borderRadius: 2, marginBottom: 6,
          background: i < current ? C.accent : i === current ? `linear-gradient(90deg, ${C.accent} 60%, ${C.border} 60%)` : C.border,
          transition: "all 0.3s ease",
        }} />
        <span style={{ fontSize: 11, fontWeight: i <= current ? 600 : 400, color: i <= current ? C.accent : C.textMuted }}>{s}</span>
      </div>
    ))}
  </div>
);


// ╔════════════════════════════════════════════════════════════════╗
// ║  EMPLOYER JOURNEY — 10 SCREENS                               ║
// ╚════════════════════════════════════════════════════════════════╝

const EmpLandingScreen = ({ go }) => (
  <div style={fadeUp}>
    {/* Hero */}
    <div style={{
      background: C.gradient, borderRadius: 16, padding: "40px 24px", marginBottom: 20,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
      <div style={{ position: "absolute", bottom: -60, left: -20, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.02)" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 12px", marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
          <I n="zap" s={12} c="#FCD34D" /> Trusted by 50+ Indigenous organizations
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.2 }}>
          Hire Indigenous talent.<br />
          <span style={{ color: "#5EEAD4" }}>Build community.</span>
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", margin: "0 0 24px", lineHeight: 1.6 }}>
          IOPPS connects your organization with thousands of Indigenous professionals across Turtle Island. Post jobs, list services, and join the largest Indigenous opportunity platform in Canada.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={() => go("typeSelect")} icon="building" style={{ background: "#fff", color: C.navy, fontWeight: 700 }}>
            Register Your Organization
          </Btn>
          <Btn v="ghost" onClick={() => go("typeSelect")} style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
            Learn More
          </Btn>
        </div>
      </div>
    </div>

    {/* Social proof */}
    <div style={{ display: "flex", gap: 8, marginBottom: 20, overflow: "auto", paddingBottom: 4 }}>
      {[
        { name: "Saskatchewan Indian Gaming Authority", jobs: "93 jobs posted" },
        { name: "Saskatoon Tribal Council", jobs: "7 active listings" },
        { name: "Treaty Six Education Council", jobs: "11 open roles" },
      ].map((org, i) => (
        <div key={i} className="card-hover" style={{ flex: "0 0 auto", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 16px", minWidth: 200 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.accent}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.accent }}>
              {org.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{org.name}</div>
          </div>
          <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{org.jobs}</div>
        </div>
      ))}
    </div>

    {/* Value props */}
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: "0 0 16px" }}>Why organizations choose IOPPS</h2>
      {[
        { icon: "users", title: "Reach Indigenous talent directly", desc: "Access thousands of Indigenous professionals actively seeking opportunities across Canada." },
        { icon: "shield", title: "Cultural authenticity built in", desc: "Identity fields, territory-based discovery, and community endorsements — not just another job board." },
        { icon: "chart", title: "One profile, everything visible", desc: "Post jobs, list products, share events, and offer training — all from your unified Organization Dashboard." },
        { icon: "heart", title: "Relationship-first platform", desc: "Built on Indigenous values. Community endorsements matter more than algorithms here." },
      ].map((v, i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < 3 ? 16 : 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I n={v.icon} s={20} c={C.accent} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{v.title}</div>
            <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.5 }}>{v.desc}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Stats */}
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      <StatBox value="105+" label="Active Jobs" icon="briefcase" />
      <StatBox value="2,400+" label="Members" icon="users" />
      <StatBox value="50+" label="Organizations" icon="building" color={C.amber} />
    </div>

    {/* CTA */}
    <div style={{ background: C.gradientSubtle, borderRadius: 14, border: `1px solid ${C.accentLt}`, padding: 20, textAlign: "center" }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>Ready to connect with Indigenous talent?</p>
      <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 16px" }}>Free for non-profits and Indigenous communities</p>
      <Btn onClick={() => go("typeSelect")} full>Get Started — It Takes 5 Minutes</Btn>
    </div>
  </div>
);

// ── STEP 2: ACCOUNT TYPE SELECTION ─────────────────────────
const EmpTypeSelectScreen = ({ go }) => (
  <div style={fadeUp}>
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>Join IOPPS</h1>
      <p style={{ fontSize: 14, color: C.textSoft, margin: 0 }}>How do you want to participate?</p>
    </div>

    {[
      {
        key: "member", icon: "users", title: "Community Member",
        desc: "Find jobs, training, events, and scholarships. Build your professional profile and connect with Indigenous organizations.",
        tags: ["Search & apply to jobs", "Build professional profile", "Save opportunities", "Get endorsed by community"],
        free: true,
      },
      {
        key: "org", icon: "building", title: "Organization",
        desc: "Post jobs, list products & services, share events, and connect with Indigenous talent across Turtle Island.",
        tags: ["Post unlimited jobs", "Shop Indigenous marketplace", "Applicant management", "Organization analytics"],
        free: false,
      },
    ].map((t, i) => (
      <div key={t.key} className="card-hover" onClick={() => go(t.key === "org" ? "signup" : "landing")} style={{
        background: C.surface, borderRadius: 14, border: `2px solid ${t.key === "org" ? C.accent : C.border}`,
        padding: 20, marginBottom: 12, cursor: "pointer", position: "relative",
      }}>
        {t.key === "org" && (
          <div style={{ position: "absolute", top: -1, right: 16, background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: "0 0 8px 8px" }}>
            RECOMMENDED FOR EMPLOYERS
          </div>
        )}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: t.key === "org" ? C.accentBg : C.borderLt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I n={t.icon} s={24} c={t.key === "org" ? C.accent : C.textSoft} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>{t.title}</h2>
              {t.free && <span style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, padding: "2px 8px", borderRadius: 6 }}>FREE</span>}
            </div>
            <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 12px", lineHeight: 1.5 }}>{t.desc}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {t.tags.map(tag => (
                <span key={tag} style={{ fontSize: 11, color: C.textSoft, background: C.borderLt, padding: "3px 8px", borderRadius: 6 }}>
                  ✓ {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    ))}

    <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 16 }}>
      Already have an account? <span onClick={() => go("dashboard")} style={{ color: C.accent, fontWeight: 600, cursor: "pointer" }}>Sign in</span>
    </p>
  </div>
);

// ── STEP 3: SIGNUP FORM ────────────────────────────────────
const EmpSignupScreen = ({ go }) => {
  const [form, setForm] = useState({ orgName: "", email: "", password: "", confirm: "", agree: false });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.orgName && form.email && form.password && form.password === form.confirm && form.agree;

  return (
    <div style={fadeUp}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <I n="building" s={28} c={C.accent} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>Create Organization Account</h1>
        <p style={{ fontSize: 14, color: C.textSoft, margin: 0 }}>Step 1 of 4 — takes about 5 minutes</p>
      </div>

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
        <Input label="Organization Name" placeholder="e.g. Northern Lights Indigenous Consulting" value={form.orgName} onChange={v => set("orgName", v)} required icon="building" />
        <Input label="Work Email" placeholder="hello@yourorg.ca" type="email" value={form.email} onChange={v => set("email", v)} required icon="mail" />
        <Input label="Password" placeholder="Minimum 8 characters" type="password" value={form.password} onChange={v => set("password", v)} required icon="lock" />
        <Input label="Confirm Password" placeholder="Re-enter password" type="password" value={form.confirm} onChange={v => set("confirm", v)} required icon="lock" />

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20, cursor: "pointer" }} onClick={() => set("agree", !form.agree)}>
          <div style={{
            width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.agree ? C.accent : C.border}`,
            background: form.agree ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 1, transition: "all 0.2s",
          }}>
            {form.agree && <I n="check" s={14} c="#fff" />}
          </div>
          <span style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.5 }}>
            I agree to the <span style={{ color: C.accent, fontWeight: 600 }}>Terms of Service</span> and{" "}
            <span style={{ color: C.accent, fontWeight: 600 }}>Privacy Policy</span>, including IOPPS data sovereignty principles (OCAP/CARE).
          </span>
        </label>

        <Btn v="primary" full disabled={!valid} onClick={() => go("onboarding")}>
          Create Account & Continue
        </Btn>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12, color: C.textMuted }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        <Btn v="ghost" full style={{ marginBottom: 8 }}>
          <svg width={18} height={18} viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </Btn>
      </div>

      <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 16 }}>
        <span onClick={() => go("typeSelect")} style={{ color: C.accent, cursor: "pointer" }}>← Back to account type</span>
      </p>
    </div>
  );
};

// ── STEP 4: ONBOARDING WIZARD ──────────────────────────────
const EmpOnboardingScreen = ({ go }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    nation: "", territory: "", ownership: "", city: "", province: "", about: "",
    hiring: true, products: false, services: false, events: false, training: false,
    logo: false, website: "", phone: "", contactName: "", contactTitle: "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const steps = ["Identity", "Details", "Capabilities", "Contact"];

  return (
    <div style={fadeUp}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>Set Up Your Organization</h1>
        <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 20px" }}>Tell the community about your organization</p>
      </div>

      <ProgressBar steps={steps} current={step} />

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, minHeight: 300 }}>
        {/* Step 0: Indigenous Identity */}
        {step === 0 && (
          <div style={fadeIn}>
            <div style={{ background: C.accentBg, borderRadius: 10, padding: "12px 14px", marginBottom: 20, display: "flex", gap: 10 }}>
              <I n="shield" s={18} c={C.accent} />
              <div style={{ fontSize: 13, color: C.accentDp, lineHeight: 1.5 }}>
                This information helps community members identify your organization. All fields are optional but increase trust and visibility.
              </div>
            </div>
            <Input label="Indigenous Nation / Affiliation" placeholder="e.g. Cree, Métis, Ojibwe, Dene..." value={form.nation} onChange={v => set("nation", v)}
              hint="The primary Indigenous nation your organization represents or is affiliated with" />
            <Input label="Traditional Territory" placeholder="e.g. Treaty 6 Territory, Métis Homeland..." value={form.territory} onChange={v => set("territory", v)}
              hint="The traditional territory where your organization operates" />
            <Input label="Indigenous Ownership" value={form.ownership} onChange={v => set("ownership", v)} select
              placeholder="Select ownership level"
              options={["100% Indigenous-owned", "51%+ Indigenous-owned", "Indigenous partnership", "Indigenous-serving (non-Indigenous owned)", "Government / Band Council", "Non-profit / Charity"]} />
          </div>
        )}

        {/* Step 1: Organization Details */}
        {step === 1 && (
          <div style={fadeIn}>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div onClick={() => set("logo", !form.logo)} style={{
                width: 80, height: 80, borderRadius: 14, border: `2px dashed ${form.logo ? C.accent : C.border}`,
                background: form.logo ? C.accentBg : C.borderLt, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
              }}>
                {form.logo ? (
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.accent }}>NL</div>
                ) : (
                  <>
                    <I n="photo" s={20} c={C.textMuted} />
                    <span style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>Add Logo</span>
                  </>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <Input label="City" placeholder="e.g. Saskatoon" value={form.city} onChange={v => set("city", v)} required icon="location" />
              </div>
            </div>
            <Input label="Province / State" value={form.province} onChange={v => set("province", v)} select
              placeholder="Select province" required
              options={["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Northwest Territories", "Nunavut", "Yukon"]} />
            <Input label="About Your Organization" placeholder="Describe what your organization does, your mission, and the communities you serve..." value={form.about} onChange={v => set("about", v)} textarea />
            <Input label="Website" placeholder="https://yourorg.ca" value={form.website} onChange={v => set("website", v)} icon="globe" />
          </div>
        )}

        {/* Step 2: Capabilities */}
        {step === 2 && (
          <div style={fadeIn}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>What will you do on IOPPS?</p>
            <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 16px" }}>Select all that apply — you can change these anytime</p>
            {[
              { key: "hiring", icon: "briefcase", title: "Post Jobs", desc: "List job openings for Indigenous professionals across Turtle Island", popular: true },
              { key: "products", icon: "star", title: "Sell Products", desc: "List products in the Shop Indigenous marketplace" },
              { key: "services", icon: "building", title: "Offer Services", desc: "Showcase your professional services to the community" },
              { key: "events", icon: "globe", title: "Share Events", desc: "Post conferences, workshops, powwows, and community gatherings" },
              { key: "training", icon: "users", title: "Offer Training Programs", desc: "List educational and skills development programs" },
            ].map(cap => (
              <div key={cap.key} onClick={() => set(cap.key, !form[cap.key])} className="card-hover" style={{
                display: "flex", gap: 12, padding: 14, borderRadius: 12, marginBottom: 8, cursor: "pointer",
                border: `2px solid ${form[cap.key] ? C.accent : C.border}`, background: form[cap.key] ? C.accentBg : C.surface,
                alignItems: "center", position: "relative",
              }}>
                {cap.popular && (
                  <div style={{ position: "absolute", top: -1, right: 12, background: C.amber, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: "0 0 6px 6px" }}>MOST POPULAR</div>
                )}
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form[cap.key] ? C.accent : C.border}`, background: form[cap.key] ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {form[cap.key] && <I n="check" s={14} c="#fff" />}
                </div>
                <I n={cap.icon} s={20} c={form[cap.key] ? C.accent : C.textMuted} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{cap.title}</div>
                  <div style={{ fontSize: 12, color: C.textSoft }}>{cap.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Primary Contact */}
        {step === 3 && (
          <div style={fadeIn}>
            <div style={{ background: C.amberBg, borderRadius: 10, padding: "12px 14px", marginBottom: 20, display: "flex", gap: 10 }}>
              <I n="lock" s={18} c={C.amber} />
              <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.5 }}>
                Contact info is only visible to IOPPS admins for verification. It won't appear on your public profile.
              </div>
            </div>
            <Input label="Contact Name" placeholder="e.g. David Couture" value={form.contactName} onChange={v => set("contactName", v)} required icon="users" />
            <Input label="Title / Role" placeholder="e.g. HR Manager, CEO, Band Administrator" value={form.contactTitle} onChange={v => set("contactTitle", v)} />
            <Input label="Phone Number" placeholder="+1 (306) 555-0199" value={form.phone} onChange={v => set("phone", v)} icon="location" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "space-between" }}>
        <Btn v="ghost" onClick={() => step > 0 ? setStep(step - 1) : go("signup")} icon="back">
          {step > 0 ? "Back" : "Account"}
        </Btn>
        <Btn onClick={() => step < 3 ? setStep(step + 1) : go("plans")} icon={step === 3 ? "arrow" : undefined}>
          {step === 3 ? "Choose Your Plan" : "Continue"}
        </Btn>
      </div>
    </div>
  );
};

// ── STEP 5: PLAN SELECTION ─────────────────────────────────
const PlansScreen = ({ go }) => {
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("subscriptions");

  const getPriceLabel = () => {
    if (!selected) return null;
    const map = {
      single: "$125", featured: "$300",
      tier1: "$1,250/yr", tier2: "$2,500/yr",
      confStd: "$250", confFeat: "$400",
      shopMonthly: "$50/mo", shopAnnual: "$400/yr",
      spotlight: "Custom",
    };
    return map[selected];
  };

  const tabs = [
    { key: "subscriptions", label: "Subscriptions" },
    { key: "perPost", label: "Pay Per Post" },
    { key: "conferences", label: "Conferences" },
    { key: "shop", label: "Shop Indigenous" },
  ];

  return (
    <div style={fadeUp}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>Choose How You Want to Start</h1>
        <p style={{ fontSize: 14, color: C.textSoft, margin: 0 }}>Subscribe for ongoing value, or pay per post — your choice</p>
      </div>

      {/* Non-profit callout */}
      <div style={{ background: C.greenBg, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <I n="heart" s={18} c={C.green} />
        <span style={{ fontSize: 13, color: "#065F46", lineHeight: 1.5 }}>
          <strong>Non-profits & Indigenous communities:</strong> Contact us for free access — <span style={{ fontWeight: 600 }}>nathan.arias@iopps.ca</span>
        </span>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.borderLt, borderRadius: 10, padding: 3 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelected(null); }} style={{
            flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: tab === t.key ? C.surface : "transparent", color: tab === t.key ? C.text : C.textMuted,
            boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none", whiteSpace: "nowrap",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SUBSCRIPTIONS TAB ── */}
      {tab === "subscriptions" && (
        <div style={fadeIn}>
          <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 12px" }}>Annual plans for ongoing hiring and visibility. Best value for active organizations.</p>
          {[
            {
              key: "tier1", name: "Tier 1", price: "1,250", period: "/year", perMonth: "~$104",
              features: ["15 job credits", "Organization profile page", "Applicant management", "Basic analytics", "Featured employer badge", "Priority support"],
            },
            {
              key: "tier2", name: "Tier 2", price: "2,500", period: "/year", perMonth: "~$208", popular: true,
              features: ["Unlimited job posts", "Everything in Tier 1, plus:", "Shop Indigenous listing included ✨", "Featured placement in search", "Advanced analytics & reports", "Dedicated account support"],
            },
          ].map(plan => (
            <div key={plan.key} onClick={() => setSelected(plan.key)} className="card-hover" style={{
              background: C.surface, borderRadius: 14, border: `2px solid ${selected === plan.key ? C.accent : C.border}`,
              padding: 20, marginBottom: 12, cursor: "pointer", position: "relative",
            }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: -1, right: 16, background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: "0 0 8px 8px" }}>BEST VALUE</div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selected === plan.key ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected === plan.key && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.accent }} />}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>{plan.name}</h3>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: C.text }}>${plan.price}</span>
                  <span style={{ fontSize: 13, color: C.textMuted }}>{plan.period}</span>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{plan.perMonth}/month</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: f.includes("Everything") || f.includes("✨") ? C.accent : C.textSoft, fontWeight: f.includes("Everything") || f.includes("✨") ? 600 : 400 }}>
                    <I n="check" s={14} c={f.includes("Everything") || f.includes("✨") ? C.accent : C.green} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PAY PER POST TAB ── */}
      {tab === "perPost" && (
        <div style={fadeIn}>
          <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 12px" }}>Post individual jobs with flexible visibility options. No commitment required.</p>
          {[
            {
              key: "single", name: "Single Job Post", price: "125", badge: null,
              features: ["Live for 30 days", "Standard placement on the IOPPS job board", "Basic employer profile"],
            },
            {
              key: "featured", name: "Featured Job Ad", price: "300", badge: "FEATURED",
              features: ["Posted for 45 days", "\"Featured\" spotlight placement", "Employer logo + branding on listing", "Analytics (views & clicks)"],
            },
          ].map(plan => (
            <div key={plan.key} onClick={() => setSelected(plan.key)} className="card-hover" style={{
              background: C.surface, borderRadius: 14, border: `2px solid ${selected === plan.key ? C.accent : C.border}`,
              padding: 20, marginBottom: 12, cursor: "pointer", position: "relative",
            }}>
              {plan.badge && (
                <div style={{ position: "absolute", top: -1, right: 16, background: C.amber, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: "0 0 8px 8px" }}>{plan.badge}</div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selected === plan.key ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected === plan.key && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.accent }} />}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{plan.name}</h3>
                </div>
                <div>
                  <span style={{ fontSize: 24, fontWeight: 800, color: C.text }}>${plan.price}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.textSoft }}>
                    <I n="check" s={14} c={C.green} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ background: C.accentBg, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: C.accentDp, display: "flex", gap: 8, alignItems: "center" }}>
            <I n="zap" s={14} c={C.accent} />
            <span><strong>Tip:</strong> Posting 3+ jobs? A Tier 1 subscription ($1,250/yr for 15 credits) saves you money.</span>
          </div>
        </div>
      )}

      {/* ── CONFERENCES TAB ── */}
      {tab === "conferences" && (
        <div style={fadeIn}>
          <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 12px" }}>Promote your conference or event to the IOPPS community.</p>
          {[
            {
              key: "confStd", name: "Standard Conference Listing", price: "250", badge: null,
              features: ["Listed on Events & Conferences page", "90-day listing duration", "Basic event details & registration link"],
            },
            {
              key: "confFeat", name: "Featured Conference", price: "400", badge: "FEATURED",
              features: ["Everything in Standard, plus:", "Featured spotlight on Events page", "Promoted in IOPPS feed & newsletters", "Full branding with logo and banner"],
            },
          ].map(plan => (
            <div key={plan.key} onClick={() => setSelected(plan.key)} className="card-hover" style={{
              background: C.surface, borderRadius: 14, border: `2px solid ${selected === plan.key ? C.accent : C.border}`,
              padding: 20, marginBottom: 12, cursor: "pointer", position: "relative",
            }}>
              {plan.badge && (
                <div style={{ position: "absolute", top: -1, right: 16, background: C.amber, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: "0 0 8px 8px" }}>{plan.badge}</div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selected === plan.key ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected === plan.key && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.accent }} />}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{plan.name}</h3>
                </div>
                <span style={{ fontSize: 24, fontWeight: 800, color: C.text }}>${plan.price}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: f.includes("Everything") ? C.accent : C.textSoft, fontWeight: f.includes("Everything") ? 600 : 400 }}>
                    <I n="check" s={14} c={f.includes("Everything") ? C.accent : C.green} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SHOP INDIGENOUS TAB ── */}
      {tab === "shop" && (
        <div style={fadeIn}>
          <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 12px" }}>List your products and services in the Shop Indigenous marketplace.</p>

          <div style={{ background: C.amberBg, borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#92400E", display: "flex", gap: 8, alignItems: "center" }}>
            <I n="star" s={14} c={C.amber} />
            <span><strong>Included free with Tier 2 subscription</strong> ($2,500/yr) — no separate vendor fee!</span>
          </div>

          {[
            {
              key: "shopMonthly", name: "Shop Indigenous — Monthly", price: "50", period: "/month",
              features: ["Product & service listings in marketplace", "Vendor profile with branding", "Inquiry notifications", "Cancel anytime"],
            },
            {
              key: "shopAnnual", name: "Shop Indigenous — Annual", price: "400", period: "/year", badge: "SAVE $200",
              features: ["Everything in Monthly plan", "12 months for the price of 8", "Priority placement during signup period", "Annual analytics report"],
            },
          ].map(plan => (
            <div key={plan.key} onClick={() => setSelected(plan.key)} className="card-hover" style={{
              background: C.surface, borderRadius: 14, border: `2px solid ${selected === plan.key ? C.accent : C.border}`,
              padding: 20, marginBottom: 12, cursor: "pointer", position: "relative",
            }}>
              {plan.badge && (
                <div style={{ position: "absolute", top: -1, right: 16, background: C.green, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: "0 0 8px 8px" }}>{plan.badge}</div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selected === plan.key ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected === plan.key && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.accent }} />}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{plan.name}</h3>
                </div>
                <div>
                  <span style={{ fontSize: 24, fontWeight: 800, color: C.text }}>${plan.price}</span>
                  <span style={{ fontSize: 13, color: C.textMuted }}>{plan.period}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: f.includes("Everything") ? C.accent : C.textSoft, fontWeight: f.includes("Everything") ? 600 : 400 }}>
                    <I n="check" s={14} c={f.includes("Everything") ? C.accent : C.green} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* IOPPS Spotlight */}
          <div onClick={() => setSelected("spotlight")} className="card-hover" style={{
            background: C.surface, borderRadius: 14, border: `2px solid ${selected === "spotlight" ? C.accent : C.border}`,
            padding: 20, marginBottom: 12, cursor: "pointer", position: "relative",
            backgroundImage: `linear-gradient(135deg, ${C.surface} 0%, ${C.accentBg} 100%)`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selected === "spotlight" ? C.accent : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selected === "spotlight" && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.accent }} />}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>IOPPS Spotlight ✨</h3>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>Custom Quote</span>
            </div>
            <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 10px", lineHeight: 1.5 }}>
              Authentic on-site video content showcasing your organization. Professional multi-camera coverage shared across IOPPS channels.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {["Professional video production at your location", "Shared on IOPPS Live & social channels", "Permanent feature on your organization profile"].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.textSoft }}>
                  <I n="check" s={14} c={C.green} />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ marginTop: 8 }}>
        {selected === "spotlight" ? (
          <Btn full v="navy" onClick={() => go("payment")} icon="mail">Contact Us for a Quote</Btn>
        ) : selected ? (
          <Btn full onClick={() => go("payment")}>
            Continue with {getPriceLabel()} →
          </Btn>
        ) : (
          <Btn full disabled>Select an option to continue</Btn>
        )}
      </div>

      <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 12 }}>
        14-day money-back guarantee · Cancel anytime
      </p>
    </div>
  );
};

// ── STEP 6: PAYMENT ────────────────────────────────────────
const PaymentScreen = ({ go }) => {
  const [processing, setProcessing] = useState(false);

  return (
    <div style={fadeUp}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>Complete Payment</h1>
        <p style={{ fontSize: 14, color: C.textSoft, margin: 0 }}>Secure checkout powered by Stripe</p>
      </div>

      {/* Order summary */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, marginBottom: 12 }}>ORDER SUMMARY</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: C.text }}>Professional Plan (Annual)</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>$2,500.00</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: C.textSoft }}>GST (5%)</span>
          <span style={{ fontSize: 14, color: C.textSoft }}>$125.00</span>
        </div>
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Total</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>$2,625.00 CAD</span>
        </div>
      </div>

      {/* Stripe-style payment form */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, marginBottom: 12 }}>PAYMENT DETAILS</div>
        <Input label="Name on Card" placeholder="David Couture" value="David Couture" onChange={() => {}} />
        <Input label="Card Number" placeholder="4242 4242 4242 4242" value="•••• •••• •••• 4242" onChange={() => {}} icon="lock" />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><Input label="Expiry" placeholder="MM/YY" value="03/28" onChange={() => {}} /></div>
          <div style={{ flex: 1 }}><Input label="CVC" placeholder="123" value="•••" onChange={() => {}} /></div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, fontSize: 12, color: C.textMuted }}>
          <I n="lock" s={14} c={C.textMuted} />
          <span>256-bit SSL encryption · Your data is secure</span>
        </div>

        <Btn full disabled={processing} onClick={() => { setProcessing(true); setTimeout(() => go("welcome"), 1500); }}>
          {processing ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              Processing...
            </span>
          ) : "Pay $2,625.00 CAD"}
        </Btn>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 16, opacity: 0.5 }}>
        {["Visa", "Mastercard", "Amex"].map(c => (
          <span key={c} style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{c}</span>
        ))}
      </div>
    </div>
  );
};

// ── STEP 7: WELCOME / SUCCESS ──────────────────────────────
const EmpWelcomeScreen = ({ go }) => (
  <div style={{ ...fadeUp, textAlign: "center" }}>
    <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: "pulse 1s ease-in-out" }}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth={3} strokeLinecap="round">
        <path d="M20 6L9 17l-5-5" style={{ strokeDasharray: 24, animation: "checkmark 0.6s ease-out 0.3s forwards", strokeDashoffset: 24 }} />
      </svg>
    </div>
    <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>Welcome to IOPPS! 🎉</h1>
    <p style={{ fontSize: 15, color: C.textSoft, margin: "0 0 24px", lineHeight: 1.6 }}>
      Your organization account is live. Let's post your first job and start connecting with Indigenous talent.
    </p>

    {/* Quick wins */}
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, textAlign: "left", marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Get started in 3 steps:</div>
      {[
        { n: "1", title: "Post your first job", desc: "It takes 2 minutes", icon: "briefcase", done: false, action: true },
        { n: "2", title: "Complete your profile", desc: "Add logo, about, and verification", icon: "edit", done: false },
        { n: "3", title: "Share your page", desc: "Let your network know you're on IOPPS", icon: "send", done: false },
      ].map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${C.borderLt}` : "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.action ? C.accent : C.borderLt, color: s.action ? "#fff" : C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
            {s.n}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.title}</div>
            <div style={{ fontSize: 12, color: C.textSoft }}>{s.desc}</div>
          </div>
          {s.action && <I n="arrow" s={16} c={C.accent} />}
        </div>
      ))}
    </div>

    <Btn full onClick={() => go("postJob")} icon="plus">Post Your First Job</Btn>
    <div style={{ marginTop: 12 }}>
      <Btn v="ghost" full onClick={() => go("dashboard")}>Go to Dashboard</Btn>
    </div>
  </div>
);

// ── STEP 8: POST A JOB ────────────────────────────────────
const PostJobScreen = ({ go }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: "", category: "", type: "", location: "", locType: "", salaryMin: "", salaryMax: "",
    description: "", requirements: "", benefits: "", deadline: "", indigenous: "", contact: "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const steps = ["Basic Info", "Details", "Review"];

  return (
    <div style={fadeUp}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => step > 0 ? setStep(step - 1) : go("dashboard")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <I n="back" s={20} c={C.textSoft} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>Post a New Job</h1>
      </div>

      <ProgressBar steps={steps} current={step} />

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div style={fadeIn}>
            <Input label="Job Title" placeholder="e.g. Education Coordinator — Indigenous Curriculum" value={form.title} onChange={v => set("title", v)} required />
            <Input label="Category" value={form.category} onChange={v => set("category", v)} select required
              placeholder="Select job category"
              options={["Education", "Health & Social Services", "Management & Administration", "Information Technology", "Trades & Construction", "Finance & Accounting", "Legal & Governance", "Communications & Marketing", "Natural Resources & Environment", "Hospitality & Tourism", "Arts & Culture", "Law Enforcement & Security"]} />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Input label="Employment Type" value={form.type} onChange={v => set("type", v)} select required
                  placeholder="Type" options={["Full-time", "Part-time", "Contract", "Temporary", "Casual", "Internship"]} />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Work Location" value={form.locType} onChange={v => set("locType", v)} select required
                  placeholder="Arrangement" options={["On-site", "Remote", "Hybrid"]} />
              </div>
            </div>
            <Input label="Location" placeholder="e.g. Saskatoon, SK" value={form.location} onChange={v => set("location", v)} required icon="location" />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Input label="Salary Min" placeholder="$55,000" value={form.salaryMin} onChange={v => set("salaryMin", v)} icon="dollar" />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Salary Max" placeholder="$75,000" value={form.salaryMax} onChange={v => set("salaryMax", v)} icon="dollar" />
              </div>
            </div>
            <Input label="Application Deadline" placeholder="YYYY-MM-DD" type="date" value={form.deadline} onChange={v => set("deadline", v)} />
          </div>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <div style={fadeIn}>
            <Input label="Job Description" placeholder="Describe the role, responsibilities, and what makes this opportunity unique..." value={form.description} onChange={v => set("description", v)} textarea required />
            <Input label="Requirements & Qualifications" placeholder="Education, experience, certifications, languages..." value={form.requirements} onChange={v => set("requirements", v)} textarea />
            <Input label="Benefits & Perks" placeholder="Health benefits, cultural leave, flexible hours, training budget..." value={form.benefits} onChange={v => set("benefits", v)} textarea
              hint="Tip: Indigenous professionals value cultural leave, flexible hours, and community investment" />
            <Input label="Indigenous Preference" value={form.indigenous} onChange={v => set("indigenous", v)} select
              placeholder="Select preference"
              options={["Indigenous candidates preferred", "Indigenous candidates strongly preferred", "Open to all candidates", "Preference per PSEA Section 22"]} />
            <Input label="Application Contact" placeholder="careers@yourorg.ca or application URL" value={form.contact} onChange={v => set("contact", v)} icon="mail" />
          </div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <div style={fadeIn}>
            <div style={{ background: C.accentBg, borderRadius: 10, padding: "12px 14px", marginBottom: 20, display: "flex", gap: 10 }}>
              <I n="eye" s={18} c={C.accent} />
              <span style={{ fontSize: 13, color: C.accentDp }}>Preview how your job will appear to candidates</span>
            </div>

            {/* Preview card */}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: C.accent }}>NL</div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{form.title || "Education Coordinator — Indigenous Curriculum"}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>Northern Lights Indigenous Consulting</span>
                    <I n="verified" s={14} c={C.accent} />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {[
                  form.salaryMin && form.salaryMax ? `💰 ${form.salaryMin} – ${form.salaryMax}` : "💰 Competitive salary",
                  `📍 ${form.locType || "Hybrid"} · ${form.location || "Saskatoon, SK"}`,
                  `⏰ ${form.type || "Full-time"}`,
                  form.deadline ? `⏳ Due ${form.deadline}` : null,
                ].filter(Boolean).map((t, i) => (
                  <span key={i} style={{ fontSize: 12, color: C.textSoft, background: C.borderLt, padding: "4px 10px", borderRadius: 6 }}>{t}</span>
                ))}
              </div>
              <p style={{ fontSize: 13, color: C.textSoft, margin: 0, lineHeight: 1.5 }}>
                {form.description ? form.description.substring(0, 150) + "..." : "The role description will appear here. Candidates will see the first 150 characters before needing to click to read more."}
              </p>
            </div>

            {/* Checklist */}
            <div style={{ fontSize: 13, color: C.textSoft }}>
              {[
                { label: "Job title", done: !!form.title },
                { label: "Category", done: !!form.category },
                { label: "Location & type", done: !!form.location && !!form.type },
                { label: "Description", done: !!form.description },
                { label: "Salary range (recommended)", done: !!form.salaryMin },
              ].map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: c.done ? C.greenBg : C.borderLt, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {c.done ? <I n="check" s={12} c={C.green} /> : <span style={{ fontSize: 10, color: C.textMuted }}>—</span>}
                  </div>
                  <span style={{ color: c.done ? C.text : C.textMuted }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "space-between" }}>
        <Btn v="ghost" onClick={() => step > 0 ? setStep(step - 1) : go("dashboard")}>
          {step > 0 ? "← Back" : "Cancel"}
        </Btn>
        {step < 2 ? (
          <Btn onClick={() => setStep(step + 1)}>Continue</Btn>
        ) : (
          <Btn onClick={() => go("jobSuccess")} icon="send">Publish Job</Btn>
        )}
      </div>
    </div>
  );
};

// ── STEP 9: JOB POSTED SUCCESS ─────────────────────────────
const JobSuccessScreen = ({ go }) => (
  <div style={{ ...fadeUp, textAlign: "center" }}>
    <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth={3} strokeLinecap="round">
        <path d="M20 6L9 17l-5-5" style={{ strokeDasharray: 24, animation: "checkmark 0.6s ease-out 0.3s forwards", strokeDashoffset: 24 }} />
      </svg>
    </div>
    <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>Job Posted! 🎉</h1>
    <p style={{ fontSize: 15, color: C.textSoft, margin: "0 0 8px", lineHeight: 1.6 }}>
      Your listing is now live and visible to 2,400+ Indigenous professionals.
    </p>
    <p style={{ fontSize: 13, color: C.accent, fontWeight: 600, margin: "0 0 24px" }}>
      Average time to first application: 4.2 hours
    </p>

    {/* What happens next */}
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, textAlign: "left", marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>What happens next</div>
      {[
        { icon: "mail", text: "You'll receive email notifications when candidates apply" },
        { icon: "eye", text: "Your job appears in search results and the IOPPS feed" },
        { icon: "users", text: "Manage all applicants from your Organization Dashboard" },
        { icon: "chart", text: "Track views, saves, and applications in real-time" },
      ].map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: i < 3 ? 10 : 0 }}>
          <I n={s.icon} s={16} c={C.accent} />
          <span style={{ fontSize: 13, color: C.textSoft }}>{s.text}</span>
        </div>
      ))}
    </div>

    <div style={{ display: "flex", gap: 8 }}>
      <Btn v="ghost" full onClick={() => go("postJob")} icon="plus">Post Another</Btn>
      <Btn full onClick={() => go("dashboard")} icon="chart">View Dashboard</Btn>
    </div>
  </div>
);

// ── STEP 10: ORGANIZATION DASHBOARD ────────────────────────
const DashboardScreen = ({ go }) => {
  const [tab, setTab] = useState("overview");

  return (
    <div style={fadeUp}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: C.accent }}>NL</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Northern Lights</h1>
            <div style={{ fontSize: 12, color: C.textSoft }}>Professional Plan · Active</div>
          </div>
        </div>
        <Btn small onClick={() => go("postJob")} icon="plus">Post Job</Btn>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <StatBox value="3" label="Active Jobs" icon="briefcase" />
        <StatBox value="47" label="Applications" icon="users" color={C.blue} />
        <StatBox value="2.8K" label="Profile Views" icon="eye" color={C.amber} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.borderLt, borderRadius: 10, padding: 3 }}>
        {["overview", "jobs", "applicants"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: tab === t ? C.surface : "transparent", color: tab === t ? C.text : C.textMuted,
            boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div style={fadeIn}>
          {/* Recent activity */}
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.borderLt}`, fontSize: 14, fontWeight: 700, color: C.text }}>Recent Activity</div>
            {[
              { text: "Sarah Whitebear applied to Education Coordinator", time: "2 hours ago", type: "apply" },
              { text: "James Thunderchild applied to Policy Analyst", time: "5 hours ago", type: "apply" },
              { text: "Your job 'Education Coordinator' reached 100 views", time: "1 day ago", type: "milestone" },
              { text: "Michelle Ahenakew saved Cultural Advisor position", time: "2 days ago", type: "save" },
            ].map((a, i) => (
              <div key={i} style={{ padding: "10px 16px", display: "flex", gap: 10, alignItems: "center", borderBottom: i < 3 ? `1px solid ${C.borderLt}` : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.type === "apply" ? C.accent : a.type === "milestone" ? C.amber : C.textMuted, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, color: C.text }}>{a.text}</span>
                  <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>{a.time}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Profile completeness */}
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Profile Completeness</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>75%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: C.borderLt, marginBottom: 12 }}>
              <div style={{ height: "100%", width: "75%", borderRadius: 3, background: C.accent, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ fontSize: 12, color: C.textSoft }}>
              Add a logo and verification docs to reach 100% and unlock Featured placement.
            </div>
          </div>
        </div>
      )}

      {/* Jobs Tab */}
      {tab === "jobs" && (
        <div style={fadeIn}>
          {[
            { title: "Education Coordinator — Indigenous Curriculum", status: "active", apps: 12, views: 245, posted: "Jan 15, 2026" },
            { title: "Policy Analyst — Treaty Rights", status: "active", apps: 8, views: 189, posted: "Jan 22, 2026" },
            { title: "Cultural Advisor (Part-time)", status: "active", apps: 27, views: 412, posted: "Feb 1, 2026" },
          ].map((job, i) => (
            <div key={i} className="card-hover" style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 8, cursor: "pointer" }} onClick={() => setTab("applicants")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, flex: 1 }}>{job.title}</h3>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, padding: "2px 8px", borderRadius: 6 }}>Active</span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.textSoft }}>
                <span>{job.apps} applications</span>
                <span>{job.views} views</span>
                <span>Posted {job.posted}</span>
              </div>
            </div>
          ))}
          <Btn full onClick={() => go("postJob")} icon="plus" style={{ marginTop: 8 }}>Post New Job</Btn>
        </div>
      )}

      {/* Applicants Tab */}
      {tab === "applicants" && (
        <div style={fadeIn}>
          {/* Filter */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, overflow: "auto" }}>
            {["All (47)", "New (5)", "Reviewed (28)", "Shortlisted (9)", "Hired (5)"].map((f, i) => (
              <button key={f} style={{
                padding: "6px 12px", borderRadius: 8, border: `1px solid ${i === 0 ? C.accent : C.border}`, fontSize: 12,
                fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                background: i === 0 ? C.accentBg : C.surface, color: i === 0 ? C.accent : C.textSoft,
              }}>{f}</button>
            ))}
          </div>

          {/* Applicant cards */}
          {[
            { name: "Sarah Whitebear", nation: "Cree (Nehiyaw)", territory: "Treaty 6", role: "Education Coordinator", status: "new", time: "2h ago", match: 95 },
            { name: "James Thunderchild", nation: "Cree", territory: "Treaty 6", role: "Policy Analyst", status: "new", time: "5h ago", match: 88 },
            { name: "Michelle Ahenakew", nation: "Cree", territory: "Treaty 6", role: "Cultural Advisor", status: "reviewed", time: "1d ago", match: 92 },
            { name: "Tyler Favel", nation: "Métis", territory: "Métis Homeland", role: "Education Coordinator", status: "shortlisted", time: "3d ago", match: 85 },
            { name: "Jessica Bear", nation: "Cree", territory: "Treaty 4", role: "Cultural Advisor", status: "shortlisted", time: "4d ago", match: 90 },
          ].map((a, i) => (
            <div key={i} className="card-hover" style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 14, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `linear-gradient(135deg, ${C.accent}30, ${C.navy}30)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: C.accent, flexShrink: 0,
                }}>
                  {a.name.split(" ").map(w => w[0]).join("")}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: C.textSoft }}>{a.nation} · {a.territory}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                        background: a.status === "new" ? C.accentBg : a.status === "shortlisted" ? C.amberBg : C.borderLt,
                        color: a.status === "new" ? C.accent : a.status === "shortlisted" ? C.amber : C.textSoft,
                      }}>
                        {a.status === "new" ? "🆕 New" : a.status === "shortlisted" ? "⭐ Shortlisted" : "Reviewed"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 12, color: C.textSoft }}>
                    <span>Applied for: <strong style={{ color: C.text }}>{a.role}</strong></span>
                    <span>· {a.time}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <Btn small v="primary">View Profile</Btn>
                    <Btn small v="secondary">Message</Btn>
                    <Btn small v="ghost">⭐</Btn>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── MAIN APP ───────────────────────────────────────────────

// ╔════════════════════════════════════════════════════════════════╗
// ║  COMMUNITY MEMBER JOURNEY — 10 SCREENS                       ║
// ╚════════════════════════════════════════════════════════════════╝

const MemLandingScreen = ({ go }) => (
  <div style={fadeUp}>
    {/* Hero */}
    <div style={{
      background: C.gradient, borderRadius: 16, padding: "40px 24px", marginBottom: 20,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
      <div style={{ position: "absolute", bottom: -60, left: -20, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.02)" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 12px", marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
          <I n="zap" s={12} c="#FCD34D" /> 100% free for community members
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.2 }}>
          Your career.<br />
          <span style={{ color: "#5EEAD4" }}>Your community.</span>
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", margin: "0 0 24px", lineHeight: 1.6 }}>
          IOPPS is the gathering place for Indigenous professionals across Turtle Island. Find jobs, training, scholarships, events — and a network that understands who you are.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={() => go("typeSelect")} icon="user" style={{ background: "#fff", color: C.navy, fontWeight: 700 }}>
            Create Free Profile
          </Btn>
          <Btn v="ghost" onClick={() => go("discover")} style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
            Browse Opportunities
          </Btn>
        </div>
      </div>
    </div>

    {/* What's here for you */}
    <div style={{ display: "flex", gap: 8, marginBottom: 20, overflow: "auto", paddingBottom: 4 }}>
      {[
        { emoji: "💼", label: "105+ Jobs", desc: "From Indigenous organizations" },
        { emoji: "🎓", label: "Scholarships", desc: "Full tuition & stipends" },
        { emoji: "🛍️", label: "Shop Indigenous", desc: "Support Indigenous makers" },
      ].map((item, i) => (
        <div key={i} className="card-hover" style={{ flex: "0 0 auto", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "12px 16px", minWidth: 160 }}>
          <span style={{ fontSize: 24 }}>{item.emoji}</span>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 6 }}>{item.label}</div>
          <div style={{ fontSize: 12, color: C.textSoft }}>{item.desc}</div>
        </div>
      ))}
    </div>

    {/* Value props */}
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: "0 0 16px" }}>Built for Indigenous professionals</h2>
      {[
        { icon: "shield", title: "Identity respected, not extracted", desc: "Nation, territory, and treaty fields — your identity is honoured, not forced into a dropdown." },
        { icon: "users", title: "Community endorsements", desc: "Endorsements from Elders and organizations carry weight here. Your community vouches for you." },
        { icon: "compass", title: "Territory-based discovery", desc: "Find opportunities near your home community, not just by postal code." },
        { icon: "heart", title: "Relationships before transactions", desc: "This isn't LinkedIn. It's a gathering place built on Indigenous values." },
      ].map((v, i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < 3 ? 16 : 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I n={v.icon} s={20} c={C.accent} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>{v.title}</div>
            <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.5 }}>{v.desc}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Stats */}
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      <StatBox value="105+" label="Active Jobs" icon="briefcase" />
      <StatBox value="2,400+" label="Members" icon="users" />
      <StatBox value="50+" label="Organizations" icon="building" color={C.amber} />
    </div>

    {/* CTA */}
    <div style={{ background: C.gradientSubtle, borderRadius: 14, border: `1px solid ${C.accentLt}`, padding: 20, textAlign: "center" }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>Ready to find your next opportunity?</p>
      <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 16px" }}>Always free. Always Indigenous-first.</p>
      <Btn onClick={() => go("typeSelect")} full>Join IOPPS — It's Free</Btn>
    </div>
  </div>
);

// ── SCREEN 2: ACCOUNT TYPE SELECT ──────────────────────────
const MemTypeSelectScreen = ({ go }) => (
  <div style={fadeUp}>
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>Join IOPPS</h1>
      <p style={{ fontSize: 14, color: C.textSoft, margin: 0 }}>How do you want to participate?</p>
    </div>

    {[
      {
        key: "member", icon: "user", title: "Community Member",
        desc: "Find jobs, training, events, and scholarships. Build your professional profile and connect with Indigenous organizations.",
        tags: ["Search & apply to jobs", "Build professional profile", "Save opportunities", "Get endorsed by community"],
        free: true,
      },
      {
        key: "org", icon: "building", title: "Organization",
        desc: "Post jobs, list products & services, share events, and connect with Indigenous talent across Turtle Island.",
        tags: ["Post unlimited jobs", "Shop Indigenous marketplace", "Applicant management", "Organization analytics"],
        free: false,
      },
    ].map((t) => (
      <div key={t.key} className="card-hover" onClick={() => go(t.key === "member" ? "signup" : "landing")} style={{
        background: C.surface, borderRadius: 14, border: `2px solid ${t.key === "member" ? C.accent : C.border}`,
        padding: 20, marginBottom: 12, cursor: "pointer", position: "relative",
      }}>
        {t.key === "member" && (
          <div style={{ position: "absolute", top: -1, right: 16, background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: "0 0 8px 8px" }}>
            ALWAYS FREE
          </div>
        )}
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: t.key === "member" ? C.accentBg : C.borderLt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I n={t.icon} s={24} c={t.key === "member" ? C.accent : C.textSoft} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0 }}>{t.title}</h2>
              {t.free && <span style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, padding: "2px 8px", borderRadius: 6 }}>FREE</span>}
            </div>
            <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 12px", lineHeight: 1.5 }}>{t.desc}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {t.tags.map(tag => (
                <span key={tag} style={{ fontSize: 11, color: C.textSoft, background: C.borderLt, padding: "3px 8px", borderRadius: 6 }}>
                  ✓ {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    ))}

    <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 16 }}>
      Already have an account? <span onClick={() => go("profile")} style={{ color: C.accent, fontWeight: 600, cursor: "pointer" }}>Sign in</span>
    </p>
  </div>
);

// ── SCREEN 3: MEMBER SIGNUP ────────────────────────────────
const MemSignupScreen = ({ go }) => {
  const [form, setForm] = useState({ first: "", last: "", email: "", password: "", confirm: "", agree: false });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.first && form.last && form.email && form.password && form.password === form.confirm && form.agree;

  return (
    <div style={fadeUp}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <I n="user" s={28} c={C.accent} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>Create Your Profile</h1>
        <p style={{ fontSize: 14, color: C.textSoft, margin: 0 }}>Step 1 of 4 — takes about 3 minutes</p>
      </div>

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><Input label="First Name" placeholder="Sarah" value={form.first} onChange={v => set("first", v)} required /></div>
          <div style={{ flex: 1 }}><Input label="Last Name" placeholder="Whitebear" value={form.last} onChange={v => set("last", v)} required /></div>
        </div>
        <Input label="Email" placeholder="sarah@email.com" type="email" value={form.email} onChange={v => set("email", v)} required icon="mail" />
        <Input label="Password" placeholder="Minimum 8 characters" type="password" value={form.password} onChange={v => set("password", v)} required icon="lock" />
        <Input label="Confirm Password" placeholder="Re-enter password" type="password" value={form.confirm} onChange={v => set("confirm", v)} required icon="lock" />

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20, cursor: "pointer" }} onClick={() => set("agree", !form.agree)}>
          <div style={{
            width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.agree ? C.accent : C.border}`,
            background: form.agree ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 1, transition: "all 0.2s",
          }}>
            {form.agree && <I n="check" s={14} c="#fff" />}
          </div>
          <span style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.5 }}>
            I agree to the <span style={{ color: C.accent, fontWeight: 600 }}>Terms of Service</span> and{" "}
            <span style={{ color: C.accent, fontWeight: 600 }}>Privacy Policy</span>, including IOPPS data sovereignty principles (OCAP/CARE).
          </span>
        </label>

        <Btn v="primary" full disabled={!valid} onClick={() => go("onboarding")}>
          Create Account & Continue
        </Btn>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 12, color: C.textMuted }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        <Btn v="ghost" full style={{ marginBottom: 8 }}>
          <svg width={18} height={18} viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </Btn>
      </div>

      <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginTop: 16 }}>
        <span onClick={() => go("typeSelect")} style={{ color: C.accent, cursor: "pointer" }}>← Back to account type</span>
      </p>
    </div>
  );
};

// ── SCREEN 4: ONBOARDING WIZARD ────────────────────────────
const MemOnboardingScreen = ({ go }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    nation: "", territory: "", treaty: "", band: "", identityPrivate: false,
    currentRole: "", employer: "", experience: "", education: "",
    interests: [], jobTypes: [], locations: [], salaryMin: "", salaryMax: "",
    bio: "",
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleArr = (k, v) => setForm(p => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }));

  const steps = ["Identity", "Background", "Preferences", "About You"];

  const ChipSelect = ({ items, selected, onToggle }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map(item => {
        const active = selected.includes(item);
        return (
          <button key={item} onClick={() => onToggle(item)} style={{
            padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500,
            background: active ? C.accentBg : C.surface, color: active ? C.accent : C.textSoft,
            border: `1.5px solid ${active ? C.accent : C.border}`, cursor: "pointer",
            transition: "all 0.15s",
          }}>
            {active && "✓ "}{item}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={fadeUp}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>Build Your Profile</h1>
        <p style={{ fontSize: 13, color: C.textSoft, margin: 0 }}>Step {step + 1} of 4 — {steps[step]}</p>
      </div>

      <Progress step={step} total={4} labels={steps} />

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
        {/* Step 1: Identity */}
        {step === 0 && (
          <div style={fadeIn}>
            <div style={{ padding: 14, borderRadius: 10, background: C.accentBg, border: `1px solid ${C.accentLt}`, marginBottom: 20, display: "flex", gap: 10 }}>
              <I n="shield" s={18} c={C.accent} />
              <div style={{ fontSize: 13, color: C.accentDp, lineHeight: 1.5 }}>
                <strong>Your identity is respected here.</strong> All fields are optional — share only what feels right. This information helps connect you with relevant opportunities near your community.
              </div>
            </div>
            <Input label="Nation / People" placeholder="e.g. Cree (Nehiyaw), Métis, Anishinaabe" value={form.nation} onChange={v => set("nation", v)} hint="How you identify your Nation or People" />
            <Input label="Territory" placeholder="e.g. Treaty 6 Territory" value={form.territory} onChange={v => set("territory", v)} select options={["Treaty 1 Territory", "Treaty 2 Territory", "Treaty 3 Territory", "Treaty 4 Territory", "Treaty 5 Territory", "Treaty 6 Territory", "Treaty 7 Territory", "Treaty 8 Territory", "Treaty 9 Territory", "Treaty 10 Territory", "Treaty 11 Territory", "Robinson-Superior Treaty", "Robinson-Huron Treaty", "Douglas Treaties", "Numbered Treaties (Other)", "Unceded Territory", "Métis Homeland", "Inuit Nunangat", "Other", "Prefer not to say"]} />
            <Input label="Band / First Nation / Settlement" placeholder="e.g. Muskeg Lake Cree Nation" value={form.band} onChange={v => set("band", v)} hint="Optional — your specific community" />
            <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", marginTop: 4 }} onClick={() => set("identityPrivate", !form.identityPrivate)}>
              <div style={{
                width: 18, height: 18, borderRadius: 5, border: `2px solid ${form.identityPrivate ? C.accent : C.border}`,
                background: form.identityPrivate ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.2s",
              }}>
                {form.identityPrivate && <I n="check" s={12} c="#fff" />}
              </div>
              <span style={{ fontSize: 13, color: C.textSoft }}>Keep my identity details private (visible only to me)</span>
            </label>
          </div>
        )}

        {/* Step 2: Professional Background */}
        {step === 1 && (
          <div style={fadeIn}>
            <Input label="Current Role / Title" placeholder="e.g. Indigenous Education Consultant" value={form.currentRole} onChange={v => set("currentRole", v)} icon="briefcase" />
            <Input label="Current Employer / Organization" placeholder="e.g. Saskatchewan Indigenous Cultural Centre" value={form.employer} onChange={v => set("employer", v)} icon="building" hint="Leave blank if between roles" />
            <Input label="Years of Experience" value={form.experience} onChange={v => set("experience", v)} select options={["Less than 1 year", "1-3 years", "3-5 years", "5-10 years", "10-15 years", "15+ years"]} placeholder="Select experience level" />
            <Input label="Highest Education" value={form.education} onChange={v => set("education", v)} select options={["High school / GED", "Certificate / Diploma", "Associate degree", "Bachelor's degree", "Master's degree", "Doctoral degree", "Traditional knowledge / Elder mentorship", "Other"]} placeholder="Select education level" />

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Key Skills</label>
              <ChipSelect
                items={["Curriculum Development", "Indigenous Education", "Community Engagement", "Grant Writing", "Project Management", "Social Work", "Healthcare", "Finance", "Technology", "Administration", "Trades / Labour", "Cultural Knowledge", "Language Revitalization", "Public Speaking"]}
                selected={form.interests}
                onToggle={v => toggleArr("interests", v)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Preferences */}
        {step === 2 && (
          <div style={fadeIn}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>I'm looking for...</label>
              <ChipSelect
                items={["Full-time work", "Part-time work", "Contract / Term", "Remote opportunities", "Training & education", "Scholarships & grants", "Networking", "Mentorship", "Events & conferences"]}
                selected={form.jobTypes}
                onToggle={v => toggleArr("jobTypes", v)}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Preferred Locations</label>
              <ChipSelect
                items={["Saskatoon, SK", "Regina, SK", "Prince Albert, SK", "Winnipeg, MB", "Edmonton, AB", "Calgary, AB", "Vancouver, BC", "Toronto, ON", "Ottawa, ON", "Remote / Anywhere"]}
                selected={form.locations}
                onToggle={v => toggleArr("locations", v)}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><Input label="Min Salary" placeholder="$65,000" value={form.salaryMin} onChange={v => set("salaryMin", v)} icon="dollar" /></div>
              <div style={{ flex: 1 }}><Input label="Max Salary" placeholder="$110,000" value={form.salaryMax} onChange={v => set("salaryMax", v)} icon="dollar" /></div>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: -8 }}>Salary preferences are private — only used for matching.</div>
          </div>
        )}

        {/* Step 4: About You */}
        {step === 3 && (
          <div style={fadeIn}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 20, background: C.borderLt, display: "flex",
                alignItems: "center", justifyContent: "center", margin: "0 auto 12px", cursor: "pointer",
                border: `2px dashed ${C.border}`,
              }}>
                <I n="photo" s={28} c={C.textMuted} />
              </div>
              <span style={{ fontSize: 13, color: C.accent, fontWeight: 600, cursor: "pointer" }}>Upload Profile Photo</span>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Optional — helps community members recognize you</div>
            </div>

            <Input
              label="Bio / About"
              placeholder="Tell your story — your background, what drives you, what you're looking for. This is your space to share as much or as little as you'd like."
              value={form.bio}
              onChange={v => set("bio", v)}
              textarea
              hint="Tip: Mention your community connections, cultural expertise, and career goals."
            />

            <Input
              label="Headline"
              placeholder="e.g. Indigenous Education Consultant · Curriculum Developer · Community Advocate"
              value={form.currentRole}
              onChange={v => set("currentRole", v)}
              hint="A short summary that appears under your name"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        {step > 0 && (
          <Btn v="ghost" onClick={() => setStep(step - 1)} icon="back">Back</Btn>
        )}
        <div style={{ flex: 1 }} />
        {step < 3 ? (
          <Btn onClick={() => setStep(step + 1)}>Continue →</Btn>
        ) : (
          <Btn onClick={() => go("welcome")}>Complete Profile →</Btn>
        )}
      </div>

      {step < 3 && (
        <p style={{ textAlign: "center", marginTop: 12 }}>
          <span onClick={() => setStep(step + 1)} style={{ fontSize: 12, color: C.textMuted, cursor: "pointer" }}>Skip this step</span>
        </p>
      )}
    </div>
  );
};

// ── SCREEN 5: WELCOME ──────────────────────────────────────
const MemWelcomeScreen = ({ go }) => (
  <div style={{ ...fadeUp, textAlign: "center" }}>
    <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: "pulse 1s ease-in-out" }}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth={3} strokeLinecap="round">
        <path d="M20 6L9 17l-5-5" style={{ strokeDasharray: 24, animation: "checkmark 0.6s ease-out 0.3s forwards", strokeDashoffset: 24 }} />
      </svg>
    </div>
    <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>Welcome to IOPPS, Sarah! 🎉</h1>
    <p style={{ fontSize: 15, color: C.textSoft, margin: "0 0 24px", lineHeight: 1.6 }}>
      Your profile is live. Let's find your next opportunity — jobs, training, events, and a community that's got your back.
    </p>

    {/* Quick wins */}
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, textAlign: "left", marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Here's what to do next:</div>
      {[
        { n: "1", title: "Browse opportunities", desc: "Jobs, scholarships, and events curated for you", icon: "search", action: true },
        { n: "2", title: "Request endorsements", desc: "Ask Elders, colleagues, or organizations to vouch for you", icon: "users" },
        { n: "3", title: "Share your profile", desc: "Let your network know you're on IOPPS", icon: "send" },
      ].map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${C.borderLt}` : "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: s.action ? C.accent : C.borderLt, color: s.action ? "#fff" : C.textMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
            {s.n}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.title}</div>
            <div style={{ fontSize: 12, color: C.textSoft }}>{s.desc}</div>
          </div>
          {s.action && <I n="arrow" s={16} c={C.accent} />}
        </div>
      ))}
    </div>

    <Btn full onClick={() => go("discover")} icon="compass">Discover Opportunities</Btn>
    <div style={{ marginTop: 12 }}>
      <Btn v="ghost" full onClick={() => go("profile")}>View My Profile</Btn>
    </div>
  </div>
);

// ── SCREEN 6: DISCOVER FEED ────────────────────────────────
const DiscoverScreen = ({ go }) => {
  const [tab, setTab] = useState("forYou");
  const tabs = [
    { id: "forYou", label: "For You" },
    { id: "jobs", label: "Jobs" },
    { id: "training", label: "Training" },
    { id: "events", label: "Events" },
    { id: "shop", label: "Shop" },
  ];

  const feed = [
    {
      type: "job", emoji: "💼", color: C.accent, label: "Job",
      org: "Saskatoon Tribal Council", nation: "Cree", verified: true,
      title: "Education Coordinator — Indigenous Curriculum",
      desc: "Lead the development of culturally grounded curriculum for Treaty 6 schools. Work directly with Elders and Knowledge Keepers.",
      tags: ["💰 $75K – $95K", "📍 Hybrid · Saskatoon", "⏰ Full-time"],
      warn: "⏳ Due Feb 28, 2026",
      social: "12 people from your network saved this",
      saves: 34, comments: 12,
    },
    {
      type: "scholarship", emoji: "🏆", color: C.amber, label: "Scholarship",
      org: "SIIT", nation: "Multiple Nations", verified: true,
      title: "Tech Futures Scholarship — Full Tuition",
      desc: "Full tuition scholarship for Indigenous students entering technology programs. Covers tuition, books, and a living stipend.",
      tags: ["💰 Full Tuition + $12K stipend", "🏛 SIIT"],
      warn: "⏳ Due Mar 15",
      social: "Popular with students in Saskatchewan",
      saves: 67, comments: 12,
    },
    {
      type: "event", emoji: "🎤", color: C.pink, label: "Conference",
      org: "IOPPS", nation: "Intertribal", verified: true,
      title: "Indigenous Professionals Summit 2026",
      desc: "Two days of panels, workshops, and networking with 200+ Indigenous professionals.",
      tags: ["📅 Apr 15–16, 2026", "📍 TCU Place, Saskatoon", "🎟 Early bird: $199"],
      social: "3 organizations you follow are presenting",
      saves: 156, comments: 32,
    },
    {
      type: "job", emoji: "💼", color: C.accent, label: "Job",
      org: "SIGA", nation: "Multiple Nations", verified: true,
      title: "Director of Community Engagement",
      desc: "Lead SIGA's community engagement strategy across Saskatchewan. Build and maintain relationships with First Nations communities.",
      tags: ["💰 $95K – $120K", "📍 On-site · Saskatoon", "⏰ Full-time"],
      warn: "⏳ Due Mar 5",
      social: "Popular in Treaty 6 Territory",
      saves: 56, comments: 11,
    },
    {
      type: "product", emoji: "🛍", color: C.orange, label: "Shop",
      org: "Prairie Fire Designs", nation: "Métis", verified: true,
      title: "Handbeaded Floral Earrings — Spring Collection",
      desc: "Traditional Métis floral beadwork meets contemporary design. Each pair hand-beaded on smoked moose hide.",
      tags: ["💰 $85 – $120", "🧵 Glass beads, moose hide", "✨ Made to Order"],
      social: "Featured Artisan this week",
      saves: 89, comments: 15,
    },
  ];

  return (
    <div style={fadeUp}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>Discover</h2>
          <p style={{ fontSize: 13, color: C.textSoft, margin: 0 }}>Opportunities curated for you</p>
        </div>
        <Av name="Sarah Whitebear" sz={36} ring />
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <I n="search" s={18} c={C.textMuted} />
          <span style={{ fontSize: 14, color: C.textMuted }}>Search jobs, training, events...</span>
        </div>
        <div style={{ padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", alignItems: "center", cursor: "pointer" }}>
          <I n="filter" s={16} c={C.textSoft} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflow: "auto", paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
            background: tab === t.id ? C.accent : C.surface, color: tab === t.id ? "#fff" : C.textSoft,
            border: `1px solid ${tab === t.id ? C.accent : C.border}`, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Feed cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {feed.map((item, i) => (
          <div key={i} className="card-hover" style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", cursor: "pointer" }}
            onClick={() => item.type === "job" && i === 0 ? go("jobDetail") : null}>
            <div style={{ padding: "16px 20px" }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Av name={item.org} sz={36} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.org}</span>
                      {item.verified && <I n="verified" s={14} c={C.accent} />}
                    </div>
                    <span style={{ fontSize: 12, color: C.textSoft }}>{item.nation}</span>
                  </div>
                </div>
                <Bdg>{item.emoji} {item.label}</Bdg>
              </div>

              {/* Content */}
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: "0 0 6px", lineHeight: 1.35 }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: C.textSoft, margin: "0 0 12px", lineHeight: 1.55 }}>{item.desc}</p>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: item.social ? 12 : 0 }}>
                {item.tags.map((t, j) => <Tag key={j}>{t}</Tag>)}
                {item.warn && <Tag warn>{item.warn}</Tag>}
              </div>

              {/* Social proof */}
              {item.social && (
                <div style={{ padding: "8px 12px", borderRadius: 8, background: C.accentBg, fontSize: 13, color: C.accentDp, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <I n="users" s={14} c={C.accent} />
                  {item.social}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: `1px solid ${C.borderLt}` }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <EBtn icon="heart" label={item.saves} />
                  <EBtn icon="chat" label={item.comments} />
                  <EBtn icon="share" />
                  <EBtn icon="bookmark" />
                </div>
                {item.type === "job" && <Btn small onClick={(e) => { e.stopPropagation(); go("jobDetail"); }}>Apply Now →</Btn>}
                {item.type === "scholarship" && <Btn small v="amber">Learn More →</Btn>}
                {item.type === "event" && <Btn small v="secondary">Register →</Btn>}
                {item.type === "product" && <Btn small v="ghost">Visit Shop →</Btn>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── SCREEN 7: JOB DETAIL ───────────────────────────────────
const JobDetailScreen = ({ go }) => {
  const [saved, setSaved] = useState(false);

  return (
    <div style={fadeUp}>
      {/* Back */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={() => go("discover")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}><I n="back" s={20} c={C.textSoft} /></button>
        <span style={{ fontSize: 13, color: C.textSoft }}>Back to Discover</span>
      </div>

      {/* Job header card */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: 6, background: `linear-gradient(90deg, ${C.accent}, ${C.blue})` }} />
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: `${C.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: C.accent, flexShrink: 0 }}>ST</div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>Education Coordinator — Indigenous Curriculum</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: C.accent, fontWeight: 600 }}>Saskatoon Tribal Council</span>
                <I n="verified" s={14} c={C.accent} />
                <Bdg v="teal">Cree Nation</Bdg>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            <Tag>💰 $75K – $95K</Tag>
            <Tag>📍 Hybrid · Saskatoon, SK</Tag>
            <Tag>⏰ Full-time</Tag>
            <Tag warn>⏳ Due Feb 28, 2026</Tag>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn icon="arrow" onClick={() => go("apply")}>Apply Now</Btn>
            <Btn v={saved ? "secondary" : "ghost"} icon={saved ? "heartFill" : "heart"} onClick={() => setSaved(!saved)}>
              {saved ? "Saved" : "Save"}
            </Btn>
            <Btn v="ghost" icon="share">Share</Btn>
          </div>

          <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: C.accentBg, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.accentDp }}>
            <I n="users" s={16} c={C.accent} />
            <span><strong>12 people</strong> from your network saved this · 34 total saves · 12 applications</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: C.text }}>About This Role</h3>
        <div style={{ fontSize: 14, color: C.textMd, lineHeight: 1.7 }}>
          <p style={{ margin: "0 0 12px" }}>The Saskatoon Tribal Council is seeking an experienced Education Coordinator to lead the development of culturally grounded curriculum for Treaty 6 schools.</p>
          <p style={{ margin: "0 0 12px" }}>You will work directly with Elders, Knowledge Keepers, and community members to ensure curriculum reflects authentic Cree worldviews, language, and traditions while meeting provincial education standards.</p>

          <h4 style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 10px", color: C.text }}>Key Responsibilities</h4>
          {[
            "Collaborate with Elders and Knowledge Keepers to develop culturally authentic curriculum materials",
            "Lead curriculum review committees across 7 Treaty 6 schools",
            "Design professional development workshops for teachers on Indigenous pedagogy",
            "Manage a team of 3 curriculum writers and 2 language specialists",
            "Coordinate annual cultural camps and land-based education programs",
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 14, color: C.textMd }}>
              <span style={{ color: C.accent, flexShrink: 0 }}>•</span>
              <span>{r}</span>
            </div>
          ))}

          <h4 style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 10px", color: C.text }}>What We're Looking For</h4>
          {[
            "Master's degree in Education, Indigenous Studies, or related field",
            "5+ years experience in curriculum development or Indigenous education",
            "Deep understanding of Cree language, culture, and Treaty relationships",
            "Experience working with First Nations communities and governance structures",
            "Ability to facilitate respectful engagement with Elders and Knowledge Keepers",
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 14, color: C.textMd }}>
              <span style={{ color: C.accent, flexShrink: 0 }}>•</span>
              <span>{r}</span>
            </div>
          ))}

          <h4 style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 10px", color: C.text }}>What We Offer</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Competitive salary ($75K–$95K)", "Benefits package", "Flexible hybrid work", "Professional development funding", "Cultural leave days", "Elder mentorship program"].map(b => (
              <span key={b} style={{ padding: "6px 12px", borderRadius: 8, background: C.greenBg, color: C.green, fontSize: 13, fontWeight: 500 }}>✓ {b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Community endorsements */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: C.text }}>What the Community Says</h3>
        <p style={{ fontSize: 13, color: C.textSoft, margin: "0 0 16px" }}>Endorsed by people who've worked here</p>
        {[
          { name: "David Morin", role: "Former Education Lead", nation: "Cree", text: "STC genuinely values cultural protocols. My Elders were always treated with deep respect in curriculum meetings.", stars: 5 },
          { name: "Lisa Flett", role: "Teacher, Treaty 6 School", nation: "Métis", text: "The curriculum team gave us materials I was proud to teach. Students actually see themselves in the content now.", stars: 5 },
        ].map((r, i) => (
          <div key={i} style={{ padding: 14, background: C.bg, borderRadius: 10, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <Av name={r.name} sz={36} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name}</div>
                <div style={{ fontSize: 12, color: C.textSoft }}>{r.role} · {r.nation}</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 14, letterSpacing: 1 }}>{"⭐".repeat(r.stars)}</div>
            </div>
            <p style={{ fontSize: 13, color: C.textMd, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>"{r.text}"</p>
          </div>
        ))}
      </div>

      {/* Sticky apply bar */}
      <div style={{ marginTop: 16, padding: 16, background: C.surface, borderRadius: 12, border: `1px solid ${C.accentLt}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Education Coordinator</div>
          <div style={{ fontSize: 12, color: C.textSoft }}>Saskatoon Tribal Council · $75K–$95K</div>
        </div>
        <Btn onClick={() => go("apply")}>Apply Now →</Btn>
      </div>
    </div>
  );
};

// ── SCREEN 8: APPLY ────────────────────────────────────────
const ApplyScreen = ({ go }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ resume: false, coverLetter: "", whyInterested: "", availability: "", references: false });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const steps = ["Resume & Documents", "Cover Letter", "Review & Submit"];

  return (
    <div style={fadeUp}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={() => step > 0 ? setStep(step - 1) : go("jobDetail")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
          <I n="back" s={20} c={C.textSoft} />
        </button>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>Apply to STC</h2>
          <p style={{ fontSize: 13, color: C.textSoft, margin: 0 }}>Education Coordinator — Indigenous Curriculum</p>
        </div>
      </div>

      <Progress step={step} total={3} labels={steps} />

      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
        {/* Step 1: Resume */}
        {step === 0 && (
          <div style={fadeIn}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: C.text }}>Resume & Documents</h3>

            {/* Resume upload */}
            <div onClick={() => set("resume", !form.resume)} style={{
              padding: 20, borderRadius: 12, border: `2px dashed ${form.resume ? C.accent : C.border}`,
              background: form.resume ? C.accentBg : C.bg, textAlign: "center", cursor: "pointer", marginBottom: 16,
              transition: "all 0.2s",
            }}>
              {form.resume ? (
                <div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                    <I n="file" s={24} c="#fff" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>Sarah_Whitebear_Resume.pdf</div>
                  <div style={{ fontSize: 12, color: C.accentDp, marginTop: 2 }}>Uploaded · 242 KB</div>
                </div>
              ) : (
                <div>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: C.borderLt, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                    <I n="upload" s={24} c={C.textMuted} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Upload your resume</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>PDF, DOC, or DOCX · Max 10MB</div>
                </div>
              )}
            </div>

            {/* Profile auto-fill notice */}
            <div style={{ padding: 14, borderRadius: 10, background: C.greenBg, border: `1px solid ${C.greenLt}`, display: "flex", gap: 10, marginBottom: 16 }}>
              <I n="check" s={18} c={C.green} />
              <div style={{ fontSize: 13, color: "#065F46", lineHeight: 1.5 }}>
                <strong>Your IOPPS profile is attached automatically.</strong> Employers will see your skills, experience, education, and community endorsements.
              </div>
            </div>

            {/* Additional documents */}
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>Additional Documents (optional)</div>
            {["Cover Letter", "Certificates / Credentials", "Portfolio / Work Samples", "Letters of Support"].map((doc, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.borderLt}`, marginBottom: 6, cursor: "pointer" }}>
                <I n="plus" s={16} c={C.textMuted} />
                <span style={{ fontSize: 13, color: C.textSoft }}>{doc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Cover Letter */}
        {step === 1 && (
          <div style={fadeIn}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: C.text }}>Tell Them Why</h3>
            <Input
              label="Why are you interested in this role?"
              placeholder="What draws you to this role and the Saskatoon Tribal Council? How does your experience align with their mission?"
              value={form.whyInterested}
              onChange={v => set("whyInterested", v)}
              textarea
              hint="This goes directly to the hiring team. Speak from the heart."
            />
            <Input
              label="When can you start?"
              value={form.availability}
              onChange={v => set("availability", v)}
              select
              options={["Immediately", "2 weeks notice", "1 month notice", "2+ months notice", "Flexible"]}
              placeholder="Select availability"
            />
            <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }} onClick={() => set("references", !form.references)}>
              <div style={{
                width: 18, height: 18, borderRadius: 5, border: `2px solid ${form.references ? C.accent : C.border}`,
                background: form.references ? C.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 0.2s",
              }}>
                {form.references && <I n="check" s={12} c="#fff" />}
              </div>
              <span style={{ fontSize: 13, color: C.textSoft }}>Include my community endorsements with this application</span>
            </label>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 2 && (
          <div style={fadeIn}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", color: C.text }}>Review Your Application</h3>

            <div style={{ padding: 16, borderRadius: 12, background: C.bg, border: `1px solid ${C.borderLt}`, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <Av name="Sarah Whitebear" sz={44} ring />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Sarah Whitebear</div>
                  <div style={{ fontSize: 13, color: C.textSoft }}>Indigenous Education Consultant</div>
                  <div style={{ fontSize: 12, color: C.accent }}>Cree (Nehiyaw) · Treaty 6 Territory</div>
                </div>
              </div>

              {[
                { icon: "file", label: "Resume", value: "Sarah_Whitebear_Resume.pdf", check: true },
                { icon: "user", label: "IOPPS Profile", value: "Auto-attached with endorsements", check: true },
                { icon: "feather", label: "Cover message", value: form.whyInterested ? "Included" : "Not provided", check: !!form.whyInterested },
                { icon: "clock", label: "Availability", value: form.availability || "Not specified", check: !!form.availability },
                { icon: "users", label: "Endorsements", value: form.references ? "4 community endorsements attached" : "Not included", check: form.references },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: i < 4 ? `1px solid ${C.borderLt}` : "none" }}>
                  <I n={item.icon} s={16} c={item.check ? C.accent : C.textMuted} />
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 500, flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: item.check ? C.green : C.textMuted }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: C.amberBg, border: `1px solid ${C.amberLt}`, display: "flex", gap: 10, marginBottom: 16 }}>
              <I n="eye" s={18} c={C.amber} />
              <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.5 }}>
                By submitting, Saskatoon Tribal Council will see your profile, resume, and any attached endorsements. Your salary preferences remain private.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Btn v="ghost" onClick={() => step > 0 ? setStep(step - 1) : go("jobDetail")} icon="back">
          {step > 0 ? "Back" : "Cancel"}
        </Btn>
        <div style={{ flex: 1 }} />
        {step < 2 ? (
          <Btn onClick={() => setStep(step + 1)}>Continue →</Btn>
        ) : (
          <Btn onClick={() => go("appSuccess")} icon="send">Submit Application</Btn>
        )}
      </div>
    </div>
  );
};

// ── SCREEN 9: APPLICATION SUCCESS ──────────────────────────
const AppSuccessScreen = ({ go }) => (
  <div style={{ ...fadeUp, textAlign: "center" }}>
    {/* Confetti */}
    <div style={{ position: "relative", height: 60, marginBottom: 20 }}>
      {["#0D9488", "#D97706", "#7C3AED", "#DB2777", "#059669", "#2563EB", "#EA580C", "#DC2626"].map((color, i) => (
        <div key={i} style={{
          position: "absolute", width: 8, height: 8, borderRadius: i % 2 ? "50%" : 2,
          background: color, left: `${12 + i * 11}%`, top: 40,
          animation: `confetti ${1.2 + i * 0.15}s ease-out ${i * 0.08}s forwards`,
        }} />
      ))}
    </div>

    <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", animation: "pulse 1s ease-in-out" }}>
      <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth={3} strokeLinecap="round">
        <path d="M20 6L9 17l-5-5" style={{ strokeDasharray: 24, animation: "checkmark 0.6s ease-out 0.3s forwards", strokeDashoffset: 24 }} />
      </svg>
    </div>

    <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>Application Sent! 🎉</h1>
    <p style={{ fontSize: 15, color: C.textSoft, margin: "0 0 6px", lineHeight: 1.6 }}>
      Your application for <strong>Education Coordinator</strong> at <strong>Saskatoon Tribal Council</strong> has been submitted.
    </p>
    <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 24px" }}>
      You'll receive email updates as your application progresses.
    </p>

    {/* Application summary */}
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, textAlign: "left", marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Application Summary</div>
      {[
        { icon: "briefcase", label: "Education Coordinator — Indigenous Curriculum", sub: "Saskatoon Tribal Council" },
        { icon: "clock", label: "Submitted just now", sub: "Application #IOPPS-2026-0847" },
        { icon: "mail", label: "Confirmation sent to sarah@email.com", sub: "Check your inbox" },
      ].map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${C.borderLt}` : "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I n={s.icon} s={18} c={C.accent} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.label}</div>
            <div style={{ fontSize: 12, color: C.textSoft }}>{s.sub}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Next steps */}
    <div style={{ background: C.accentBg, borderRadius: 14, border: `1px solid ${C.accentLt}`, padding: 16, textAlign: "left", marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.accentDp, marginBottom: 8 }}>What happens next?</div>
      {[
        "STC reviews your application and IOPPS profile",
        "You may receive a message through IOPPS or email",
        "Your community endorsements help your application stand out",
      ].map((step, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, fontSize: 13, color: C.accentDp }}>
          <span style={{ width: 20, height: 20, borderRadius: "50%", background: C.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
          {step}
        </div>
      ))}
    </div>

    <Btn full onClick={() => go("discover")} icon="compass">Explore More Opportunities</Btn>
    <div style={{ marginTop: 12 }}>
      <Btn v="ghost" full onClick={() => go("profile")}>View My Profile</Btn>
    </div>
  </div>
);

// ── SCREEN 10: PROFILE (SARAH WHITEBEAR) ───────────────────
const ProfileScreen = ({ go }) => (
  <div style={fadeUp}>
    {/* Cover */}
    <div style={{ height: 140, borderRadius: "12px 12px 0 0", background: "linear-gradient(135deg, #164E63, #0D9488)", position: "relative" }}>
      <button onClick={() => go("discover")} style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.3)", border: "none", borderRadius: 8, padding: "8px 12px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
        <I n="back" s={16} c="#fff" /> Back
      </button>
    </div>

    {/* Profile header */}
    <div style={{ padding: "0 20px 20px", background: C.surface, borderRadius: "0 0 12px 12px", border: `1px solid ${C.border}`, borderTop: "none", marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginTop: -30 }}>
        <Av name="Sarah Whitebear" sz={80} ring />
        <div style={{ flex: 1, paddingBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Sarah Whitebear</h1>
            <Bdg v="teal">🟢 Open to Work</Bdg>
          </div>
          <p style={{ fontSize: 14, color: C.textSoft, margin: "4px 0 0" }}>Indigenous Education Consultant · Curriculum Developer · Community Advocate</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6, fontSize: 12, color: C.textSoft }}>
            <span>🪶 Cree (Nehiyaw)</span>
            <span>📜 Treaty 6 · Muskeg Lake Cree Nation</span>
            <span>💼 Sask. Indigenous Cultural Centre</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Btn v="secondary" icon="edit" small>Edit Profile</Btn>
        <Btn v="ghost" icon="share" small>Share</Btn>
        <Btn v="ghost" icon="settings" small>Settings</Btn>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.borderLt}`, flexWrap: "wrap" }}>
        {[{ v: "147", l: "Connections" }, { v: "23", l: "Following" }, { v: "4", l: "Endorsements" }, { v: "4.9", l: "Trust Score" }].map(s => (
          <div key={s.l}><span style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{s.v}</span><span style={{ fontSize: 12, color: C.textSoft, marginLeft: 6 }}>{s.l}</span></div>
        ))}
      </div>
    </div>

    {/* Activity */}
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Recent Activity</h3>
      {[
        { icon: "📝", text: "Applied to Education Coordinator at Saskatoon Tribal Council", time: "Just now", bold: true },
        { icon: "🎉", text: "Joined IOPPS — Welcome to the community!", time: "Just now", bold: true },
        { icon: "💾", text: "Saved Tech Futures Scholarship at SIIT", time: "–" },
        { icon: "🎥", text: "Watched IOPPS Live: Northern Lights Hiring Q&A", time: "–" },
      ].map((a, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < 3 ? `1px solid ${C.bg}` : "none" }}>
          <span style={{ fontSize: 18 }}>{a.icon}</span>
          <div>
            <p style={{ fontSize: 14, margin: 0, color: C.text, fontWeight: a.bold ? 600 : 400 }}>{a.text}</p>
            <p style={{ fontSize: 12, color: C.textMuted, margin: "2px 0 0" }}>{a.time}</p>
          </div>
        </div>
      ))}
    </div>

    {/* Community Endorsements */}
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Community Endorsements</h3>
          <p style={{ fontSize: 13, color: C.textSoft, margin: 0 }}>Validated by Elders, leaders, and organizations</p>
        </div>
        <div style={{ textAlign: "center", padding: "6px 14px", borderRadius: 10, background: C.accentBg, border: `1px solid ${C.accentLt}` }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>4.9</div>
          <div style={{ fontSize: 10, color: C.accentDp, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Trust Score</div>
        </div>
      </div>

      {/* Collective endorsement */}
      <div style={{ padding: 16, borderRadius: 12, background: "linear-gradient(135deg, #F0FDFA, #CCFBF1)", border: `1px solid ${C.accentLt}`, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18 }}>🏛</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.accentDp }}>Treaty 6 Education Council</div>
            <div style={{ fontSize: 12, color: C.accent }}>Collective Endorsement · 2024</div>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#fff", background: C.accent, padding: "3px 10px", borderRadius: 999 }}>Verified</span>
        </div>
        <p style={{ fontSize: 13, color: C.accentDp, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>
          "Sarah has been instrumental in bridging traditional Cree knowledge with modern curriculum standards. Her work has impacted over 2,000 students across 7 Treaty 6 schools."
        </p>
      </div>

      {/* Individual endorsements */}
      {[
        { skill: "Cultural Knowledge Keeper", by: "Elder Mary Cardinal", nation: "Cree", role: "Elder · Muskeg Lake Cree Nation", rel: "Elder guidance over 8 years", quote: "Sarah approaches ceremonies and protocols with deep respect. She listens first, always. That's how you know someone truly understands our ways.", emoji: "🪶" },
        { skill: "Curriculum Development", by: "Dr. James Thunderchild", nation: "Cree", role: "Professor · FNUniv", rel: "Graduate thesis supervisor", quote: "Her thesis on land-based learning set a new standard. I've supervised 40+ graduate students — Sarah is among the most impactful.", emoji: "📚" },
        { skill: "Community Engagement", by: "Chief Robert Whitecap", nation: "Dakota", role: "Chief · Whitecap Dakota First Nation", rel: "Reconciliation initiative collaborator", quote: "Sarah built real relationships with our community, not just checkboxes. She understands that trust is earned through years, not meetings.", emoji: "🤝" },
      ].map((e, i) => (
        <div key={i} style={{ padding: 14, borderRadius: 10, background: C.bg, border: `1px solid ${C.borderLt}`, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Av name={e.by} sz={36} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{e.by}</span>
                  <p style={{ fontSize: 12, color: C.textSoft, margin: "2px 0 0" }}>{e.role}</p>
                </div>
                <span style={{ fontSize: 20 }}>{e.emoji}</span>
              </div>
              <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: C.surface, borderLeft: `3px solid ${C.accent}` }}>
                <p style={{ fontSize: 13, color: C.textMd, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>"{e.quote}"</p>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.accent, padding: "2px 8px", borderRadius: 6, background: C.accentBg }}>{e.skill}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{e.rel}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      <div style={{ textAlign: "center", padding: "10px 0 2px" }}>
        <span style={{ fontSize: 13, color: C.accent, fontWeight: 600, cursor: "pointer" }}>Request Endorsement →</span>
      </div>
    </div>

    {/* Skills & sidebar info */}
    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
      <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Skills & Expertise</h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["Curriculum Development", "Indigenous Education", "Cultural Integration", "Workshop Facilitation", "Community Engagement", "Grant Writing", "Program Evaluation", "Public Speaking", "Cree Language", "Cross-Cultural Communication"].map(s => (
          <span key={s} style={{ padding: "5px 10px", borderRadius: 999, background: C.bg, color: C.textMd, fontSize: 12, fontWeight: 500, border: `1px solid ${C.border}` }}>{s}</span>
        ))}
      </div>
    </div>

    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ flex: 1, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Education</h4>
        {[{ school: "First Nations University of Canada", deg: "M.Ed. Indigenous Education, 2015" }, { school: "University of Saskatchewan", deg: "B.Ed. Elementary Education, 2011" }].map((e, i) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: i === 0 ? `1px solid ${C.borderLt}` : "none" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{e.school}</div>
            <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>{e.deg}</div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Looking For</h4>
        {["Director of Indigenous Education", "Curriculum Development Lead", "Education Policy Advisor"].map(r => (
          <span key={r} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.textSoft, marginBottom: 4 }}>
            <I n="arrow" s={12} c={C.accent} />{r}
          </span>
        ))}
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>💰 $85K – $110K · Hybrid preferred</div>
      </div>
    </div>
  </div>
);


// ── MAIN APP ───────────────────────────────────────────────



// ╔════════════════════════════════════════════════════════════════╗
// ║  ADMIN PANEL — 8 SCREENS                                      ║
// ╚════════════════════════════════════════════════════════════════╝

// ── ADMIN SCREEN 1: DASHBOARD ─────────────────────────────────
const AdminDashScreen = ({ go }) => {
  const stats = [
    { label: "Total Users", value: "3,847", delta: "+124 this week", icon: "users", color: C.accent },
    { label: "Active Jobs", value: "312", delta: "+18 this week", icon: "briefcase", color: C.blue },
    { label: "Organizations", value: "189", delta: "12 pending verify", icon: "building", color: C.purple },
    { label: "Revenue (MRR)", value: "$24.8K", delta: "+8.3% MoM", icon: "dollar", color: C.green },
    { label: "Reports Queue", value: "7", delta: "2 high severity", icon: "shield", color: C.red },
    { label: "Shop Listings", value: "156", delta: "+9 this week", icon: "star", color: C.amber },
  ];

  const activity = [
    { time: "2m ago", action: "New organization registered", detail: "Métis Nation of Alberta", type: "org", color: C.purple },
    { time: "15m ago", action: "Report submitted", detail: "Cultural concern — fake Indigenous business", type: "report", color: C.red },
    { time: "34m ago", action: "Job posted", detail: "Indigenous Relations Manager — SaskPower", type: "job", color: C.blue },
    { time: "1h ago", action: "Org verified", detail: "Saskatoon Tribal Council — Approved by Admin", type: "verify", color: C.green },
    { time: "1h ago", action: "New member joined", detail: "Jessica Beardy — Cree Nation, Treaty 4", type: "user", color: C.accent },
    { time: "2h ago", action: "Subscription upgraded", detail: "Northern Lights Consulting → Professional", type: "payment", color: C.amber },
    { time: "3h ago", action: "Shop listing flagged", detail: "Potential non-Indigenous vendor — under review", type: "report", color: C.red },
    { time: "5h ago", action: "Member reported content", detail: "Harassment in comment thread", type: "report", color: C.red },
  ];

  const quickActions = [
    { label: "Moderation Queue", icon: "shield", count: 7, color: C.red, screen: "moderation" },
    { label: "Verify Orgs", icon: "verified", count: 12, color: C.purple, screen: "verification" },
    { label: "Manage Users", icon: "users", count: null, color: C.accent, screen: "users" },
    { label: "Platform Settings", icon: "settings", count: null, color: C.textSoft, screen: "settings" },
  ];

  return (
    <div style={fadeUp}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I n="shield" s={18} c={C.accent} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Admin Dashboard</h1>
            <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>IOPPS Platform Control Center</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {quickActions.map((a, i) => (
          <button key={i} onClick={() => go(a.screen)} className="card-hover" style={{
            background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 12px",
            display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <I n={a.icon} s={18} c={a.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.label}</div>
              {a.count && <div style={{ fontSize: 11, color: a.color, fontWeight: 700 }}>{a.count} pending</div>}
            </div>
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>Platform Metrics</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 10px",
              textAlign: "center",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}12`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                <I n={s.icon} s={14} c={s.color} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: s.color, fontWeight: 600 }}>{s.delta}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Health Indicators */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Platform Health</h3>
        {[
          { label: "Uptime (30d)", value: "99.97%", pct: 99.97, color: C.green },
          { label: "Avg Response Time", value: "142ms", pct: 85, color: C.accent },
          { label: "Active Sessions", value: "234", pct: 47, color: C.blue },
          { label: "Report Resolution Rate", value: "94%", pct: 94, color: C.green },
        ].map((h, i) => (
          <div key={i} style={{ marginBottom: i < 3 ? 12 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.textSoft }}>{h.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: h.color }}>{h.value}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: C.borderLt }}>
              <div style={{ height: 4, borderRadius: 2, background: h.color, width: `${h.pct}%`, transition: "width 0.5s" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Recent Activity</h3>
          <span style={{ fontSize: 11, color: C.accent, fontWeight: 600, cursor: "pointer" }}>View All →</span>
        </div>
        {activity.map((a, i) => (
          <div key={i} style={{
            display: "flex", gap: 10, padding: "10px 0",
            borderBottom: i < activity.length - 1 ? `1px solid ${C.borderLt}` : "none",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: a.color, marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{a.action}</div>
              <div style={{ fontSize: 12, color: C.textSoft }}>{a.detail}</div>
            </div>
            <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── ADMIN SCREEN 2: USER MANAGEMENT ───────────────────────────
const AdminUsersScreen = ({ go }) => {
  const [searchVal, setSearchVal] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);

  const users = [
    { id: 1, name: "Sarah Whitebear", email: "sarah.w@email.com", role: "member", nation: "Cree", territory: "Treaty 6", status: "active", joined: "Jan 12, 2025", lastActive: "2 hours ago", jobs_applied: 14, endorsements: 8 },
    { id: 2, name: "Jordan Morin", email: "jordan@northernlights.ca", role: "org_admin", nation: "Métis", territory: "Treaty 6", status: "active", joined: "Nov 3, 2024", lastActive: "5 min ago", org: "Northern Lights Consulting" },
    { id: 3, name: "Kwame Asante", email: "kwame.a@email.com", role: "member", nation: "Anishinaabe", territory: "Treaty 3", status: "active", joined: "Feb 1, 2025", lastActive: "1 day ago", jobs_applied: 6, endorsements: 3 },
    { id: 4, name: "Maria Thunderchild", email: "maria.t@stc.ca", role: "org_admin", nation: "Cree", territory: "Treaty 6", status: "active", joined: "Sep 15, 2024", lastActive: "30 min ago", org: "Saskatoon Tribal Council" },
    { id: 5, name: "Suspicious Account", email: "noname@tempmail.com", role: "member", nation: "Not specified", territory: "Not specified", status: "flagged", joined: "Feb 5, 2025", lastActive: "12 hours ago", jobs_applied: 0, endorsements: 0, flags: 3 },
    { id: 6, name: "David Raven", email: "david.r@siga.ca", role: "org_admin", nation: "Nakoda", territory: "Treaty 4", status: "active", joined: "Aug 22, 2024", lastActive: "1 hour ago", org: "SIGA" },
    { id: 7, name: "Emma Clearsky", email: "emma.c@email.com", role: "member", nation: "Lakota", territory: "Treaty 4", status: "suspended", joined: "Dec 1, 2024", lastActive: "3 weeks ago", jobs_applied: 2, endorsements: 0, suspendReason: "Community guideline violation" },
    { id: 8, name: "Admin User", email: "admin@iopps.ca", role: "super_admin", nation: "—", territory: "—", status: "active", joined: "Jun 1, 2024", lastActive: "Just now" },
  ];

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchVal.toLowerCase()) || u.email.toLowerCase().includes(searchVal.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const statusColor = { active: C.green, flagged: C.amber, suspended: C.red };
  const roleLabel = { member: "Member", org_admin: "Org Admin", super_admin: "Super Admin" };
  const roleBg = { member: C.accentBg, org_admin: C.purpleBg, super_admin: C.amberBg };
  const roleFg = { member: C.accent, org_admin: C.purple, super_admin: C.amber };

  if (selectedUser) {
    const u = selectedUser;
    return (
      <div style={fadeUp}>
        <button onClick={() => setSelectedUser(null)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16, padding: 0 }}>
          <I n="back" s={16} c={C.accent} /> Back to Users
        </button>

        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
            <Av name={u.name} sz={56} ring />
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>{u.name}</h2>
              <p style={{ fontSize: 13, color: C.textSoft, margin: "2px 0 6px" }}>{u.email}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: roleBg[u.role], color: roleFg[u.role] }}>{roleLabel[u.role]}</span>
                <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${statusColor[u.status]}16`, color: statusColor[u.status] }}>{u.status}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Nation", value: u.nation },
              { label: "Territory", value: u.territory },
              { label: "Joined", value: u.joined },
              { label: "Last Active", value: u.lastActive },
              ...(u.org ? [{ label: "Organization", value: u.org }] : []),
              ...(u.jobs_applied !== undefined ? [{ label: "Jobs Applied", value: u.jobs_applied }] : []),
              ...(u.endorsements !== undefined ? [{ label: "Endorsements", value: u.endorsements }] : []),
              ...(u.flags ? [{ label: "Flags", value: `${u.flags} reports` }] : []),
            ].map((f, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Actions */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Admin Actions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {u.role !== "super_admin" && (
              <>
                <Btn v="secondary" icon="mail" full>Send Message</Btn>
                {u.status === "active" && <Btn v="ghost" icon="lock" full>Suspend Account</Btn>}
                {u.status === "suspended" && <Btn v="secondary" icon="check" full>Reinstate Account</Btn>}
                {u.status === "flagged" && <Btn v="ghost" icon="eye" full>Review Flags</Btn>}
                {u.role === "member" && <Btn v="ghost" icon="shield" full>Promote to Org Admin</Btn>}
                <Btn v="danger" icon="x" full>Delete Account</Btn>
              </>
            )}
            {u.role === "super_admin" && (
              <p style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: 12 }}>
                ⚠️ Super admin accounts cannot be modified from this panel
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={fadeUp}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Users</h1>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>3,847 total · 234 active now</p>
        </div>
        <Btn v="secondary" icon="download" small>Export CSV</Btn>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <Input placeholder="Search by name or email..." icon="search" value={searchVal} onChange={setSearchVal} />
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflow: "auto" }}>
        {[
          { key: "all", label: "All" },
          { key: "member", label: "Members" },
          { key: "org_admin", label: "Org Admins" },
          { key: "super_admin", label: "Super Admins" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterRole(f.key)} style={{
            padding: "6px 14px", borderRadius: 8, border: `1px solid ${filterRole === f.key ? C.accent : C.border}`,
            background: filterRole === f.key ? C.accentBg : C.surface, color: filterRole === f.key ? C.accent : C.textSoft,
            fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>{f.label}</button>
        ))}
      </div>

      {/* User List */}
      {filtered.map((u, i) => (
        <button key={u.id} onClick={() => setSelectedUser(u)} className="card-hover" style={{
          width: "100%", background: C.surface, borderRadius: 12, border: `1px solid ${u.status === "flagged" ? C.amberLt : u.status === "suspended" ? "#FECACA" : C.border}`,
          padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12,
          cursor: "pointer", textAlign: "left",
        }}>
          <Av name={u.name} sz={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{u.name}</span>
              <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: roleBg[u.role], color: roleFg[u.role] }}>{roleLabel[u.role]}</span>
            </div>
            <div style={{ fontSize: 12, color: C.textSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {u.nation !== "—" ? `${u.nation} · ${u.territory}` : u.email}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: statusColor[u.status], marginLeft: "auto", marginBottom: 4 }} />
            <div style={{ fontSize: 10, color: C.textMuted }}>{u.lastActive}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

// ── ADMIN SCREEN 3: ORGANIZATION MANAGEMENT ───────────────────
const AdminOrgsScreen = ({ go }) => {
  const [filter, setFilter] = useState("all");

  const orgs = [
    { name: "Northern Lights Indigenous Consulting", territory: "Treaty 6, SK", category: "Professional Services", plan: "Professional", status: "verified", members: 4, jobs: 8, since: "Nov 2024" },
    { name: "Saskatoon Tribal Council", territory: "Treaty 6, SK", category: "Tribal Government", plan: "Professional", status: "verified", members: 12, jobs: 23, since: "Sep 2024" },
    { name: "Saskatchewan Indian Gaming Authority", territory: "Treaty 4, SK", category: "Gaming & Entertainment", plan: "Professional", status: "verified", members: 8, jobs: 31, since: "Aug 2024" },
    { name: "Métis Nation of Alberta", territory: "Region 3, AB", category: "Métis Government", plan: "Essentials", status: "pending", members: 2, jobs: 0, since: "Feb 2025" },
    { name: "Eagle Feather Designs", territory: "Treaty 7, AB", category: "Arts & Culture", plan: "Essentials", status: "pending", members: 1, jobs: 2, since: "Jan 2025" },
    { name: "Red River Wellness", territory: "Treaty 1, MB", category: "Health & Wellness", plan: "Professional", status: "verified", members: 3, jobs: 5, since: "Oct 2024" },
    { name: "Questionable Corp", territory: "Not specified", category: "Consulting", plan: "Essentials", status: "rejected", members: 1, jobs: 0, since: "Feb 2025", rejectReason: "Could not verify Indigenous ownership" },
    { name: "Pacific Coast Indigenous Tourism", territory: "Coast Salish, BC", category: "Tourism", plan: "Professional", status: "verified", members: 5, jobs: 7, since: "Jul 2024" },
  ];

  const statusIcon = { verified: "verified", pending: "clock", rejected: "x" };
  const statusColor2 = { verified: C.green, pending: C.amber, rejected: C.red };
  const statusLabel = { verified: "Verified", pending: "Pending", rejected: "Rejected" };

  const filtered = filter === "all" ? orgs : orgs.filter(o => o.status === filter);

  return (
    <div style={fadeUp}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Organizations</h1>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>189 total · 12 pending verification</p>
        </div>
        <Btn v="secondary" icon="download" small>Export</Btn>
      </div>

      {/* Status filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[
          { key: "all", label: "All (189)" },
          { key: "verified", label: "Verified (164)" },
          { key: "pending", label: "Pending (12)" },
          { key: "rejected", label: "Rejected (13)" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: "6px 12px", borderRadius: 8, border: `1px solid ${filter === f.key ? C.accent : C.border}`,
            background: filter === f.key ? C.accentBg : C.surface, color: filter === f.key ? C.accent : C.textSoft,
            fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>{f.label}</button>
        ))}
      </div>

      {/* Org List */}
      {filtered.map((o, i) => (
        <div key={i} className="card-hover" style={{
          background: C.surface, borderRadius: 12, border: `1px solid ${o.status === "rejected" ? "#FECACA" : o.status === "pending" ? C.amberLt : C.border}`,
          padding: 14, marginBottom: 8,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{o.name}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textSoft }}>{o.category} · {o.territory}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, background: `${statusColor2[o.status]}12`, }}>
              <I n={statusIcon[o.status]} s={12} c={statusColor2[o.status]} />
              <span style={{ fontSize: 11, fontWeight: 600, color: statusColor2[o.status] }}>{statusLabel[o.status]}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: C.textMuted }}><strong style={{ color: C.text }}>{o.members}</strong> members</span>
            <span style={{ fontSize: 12, color: C.textMuted }}><strong style={{ color: C.text }}>{o.jobs}</strong> jobs</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>Since {o.since}</span>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag teal>{o.plan}</Tag>
            {o.rejectReason && <Tag warn>{o.rejectReason}</Tag>}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {o.status === "pending" && <Btn v="primary" small onClick={() => go("verification")}>Review</Btn>}
            <Btn v="ghost" small icon="eye">View Profile</Btn>
            <Btn v="ghost" small icon="mail">Contact</Btn>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── ADMIN SCREEN 4: VERIFICATION QUEUE ────────────────────────
const AdminVerifyScreen = ({ go }) => {
  const [selected, setSelected] = useState(null);

  const queue = [
    {
      name: "Métis Nation of Alberta", contact: "Claire Dumont", email: "c.dumont@mna.ca",
      nation: "Métis", territory: "Region 3, AB", category: "Métis Government",
      submitted: "Feb 3, 2025", description: "Regional government organization representing Métis people in Region 3 of Alberta.",
      docs: [
        { name: "Band Council Resolution.pdf", size: "2.4 MB", status: "uploaded" },
        { name: "Certificate of Incorporation.pdf", size: "1.1 MB", status: "uploaded" },
        { name: "Indigenous Ownership Declaration.pdf", size: "340 KB", status: "uploaded" },
      ],
    },
    {
      name: "Eagle Feather Designs", contact: "Nina Eagle Feather", email: "nina@eaglefeather.art",
      nation: "Blackfoot", territory: "Treaty 7, AB", category: "Arts & Culture",
      submitted: "Jan 28, 2025", description: "Indigenous-owned art studio specializing in traditional and contemporary Blackfoot beadwork and regalia.",
      docs: [
        { name: "Business License.pdf", size: "890 KB", status: "uploaded" },
        { name: "Indigenous Identity Verification.pdf", size: "1.2 MB", status: "uploaded" },
      ],
    },
    {
      name: "Prairie Fire Construction", contact: "Mike Burns", email: "mike@prairiefirecon.ca",
      nation: "Saulteaux", territory: "Treaty 2, MB", category: "Construction",
      submitted: "Jan 22, 2025", description: "Indigenous-owned general contractor focused on housing projects in First Nations communities.",
      docs: [
        { name: "Business Registration.pdf", size: "1.5 MB", status: "uploaded" },
        { name: "Band Membership Card.jpg", size: "3.2 MB", status: "uploaded" },
        { name: "Letters of Reference.pdf", size: "780 KB", status: "uploaded" },
      ],
    },
    {
      name: "Turtle Island Tech Solutions", contact: "Alex Turtle", email: "alex@turtletech.io",
      nation: "Mohawk", territory: "Six Nations, ON", category: "Technology",
      submitted: "Jan 15, 2025", description: "IT consulting and software development firm serving Indigenous organizations.",
      docs: [
        { name: "Articles of Incorporation.pdf", size: "1.8 MB", status: "uploaded" },
        { name: "Status Card Copy.pdf", size: "440 KB", status: "needs_review" },
      ],
    },
  ];

  if (selected !== null) {
    const org = queue[selected];
    return (
      <div style={fadeUp}>
        <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: 6, color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16, padding: 0 }}>
          <I n="back" s={16} c={C.accent} /> Back to Queue
        </button>

        {/* Org Detail Card */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <Av name={org.name} sz={50} />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0 }}>{org.name}</h2>
              <p style={{ fontSize: 12, color: C.textSoft, margin: "2px 0" }}>{org.category}</p>
              <div style={{ display: "flex", gap: 6 }}>
                <Tag teal>{org.nation}</Tag>
                <Tag>{org.territory}</Tag>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div><div style={{ fontSize: 11, color: C.textMuted }}>Contact</div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{org.contact}</div></div>
            <div><div style={{ fontSize: 11, color: C.textMuted }}>Email</div><div style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{org.email}</div></div>
            <div><div style={{ fontSize: 11, color: C.textMuted }}>Submitted</div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{org.submitted}</div></div>
          </div>

          <div style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.6 }}>{org.description}</div>
        </div>

        {/* Documents */}
        <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Submitted Documents</h3>
          {org.docs.map((d, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
              borderBottom: i < org.docs.length - 1 ? `1px solid ${C.borderLt}` : "none",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: d.status === "needs_review" ? C.amberBg : C.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I n="file" s={16} c={d.status === "needs_review" ? C.amber : C.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{d.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{d.size}</div>
              </div>
              {d.status === "needs_review" && <Tag warn>Needs Review</Tag>}
              <Btn v="ghost" small icon="eye">View</Btn>
            </div>
          ))}
        </div>

        {/* Verification Criteria */}
        <div style={{ background: C.accentBg, borderRadius: 12, border: `1px solid ${C.accentLt}`, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 8 }}>Verification Criteria</div>
          {[
            "Confirmed Indigenous ownership (51%+)",
            "Valid business registration or incorporation",
            "Band council letter, status card, or Métis membership",
            "Active business operations (not shell company)",
            "Consistent community reputation",
          ].map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${C.accent}`, cursor: "pointer" }} />
              <span style={{ fontSize: 12, color: C.text }}>{c}</span>
            </div>
          ))}
        </div>

        {/* Admin Notes */}
        <div style={{ marginBottom: 16 }}>
          <Input label="Admin Notes" textarea placeholder="Add internal notes about this verification..." value="" onChange={() => {}} />
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn v="primary" icon="verified" full>✅ Approve — Mark as Verified</Btn>
          <Btn v="ghost" icon="mail" full>📋 Request More Information</Btn>
          <Btn v="danger" icon="x" full>❌ Reject Application</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={fadeUp}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Verification Queue</h1>
        <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>{queue.length} organizations awaiting review</p>
      </div>

      {/* Priority Banner */}
      <div style={{ background: C.amberBg, borderRadius: 10, border: `1px solid ${C.amberLt}`, padding: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <I n="clock" s={18} c={C.amber} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>Oldest request: 23 days</div>
          <div style={{ fontSize: 12, color: C.textSoft }}>Target: Review within 5 business days</div>
        </div>
      </div>

      {queue.map((org, i) => (
        <button key={i} onClick={() => setSelected(i)} className="card-hover" style={{
          width: "100%", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
          padding: 14, marginBottom: 8, textAlign: "left", cursor: "pointer",
        }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <Av name={org.name} sz={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{org.name}</div>
              <div style={{ fontSize: 12, color: C.textSoft }}>{org.category} · {org.nation}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6 }}>
              <Tag>{org.territory}</Tag>
              <Tag teal>{org.docs.length} docs</Tag>
            </div>
            <span style={{ fontSize: 11, color: C.textMuted }}>Submitted {org.submitted}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

// ── ADMIN SCREEN 5: JOB MANAGEMENT ───────────────────────────
const AdminJobsScreen = ({ go }) => {
  const [filter, setFilter] = useState("all");

  const jobs = [
    { title: "Senior Indigenous Policy Advisor", org: "Northern Lights Consulting", location: "Saskatoon, SK", salary: "$85K–$110K", type: "Full-time", status: "active", apps: 24, views: 312, posted: "Jan 28", featured: true },
    { title: "Indigenous Relations Manager", org: "SaskPower", location: "Regina, SK", salary: "$95K–$120K", type: "Full-time", status: "active", apps: 18, views: 256, posted: "Feb 1", featured: false },
    { title: "Community Health Worker", org: "Saskatoon Tribal Council", location: "Saskatoon, SK", salary: "$52K–$65K", type: "Full-time", status: "active", apps: 31, views: 445, posted: "Jan 15", featured: false },
    { title: "Casino Floor Supervisor", org: "SIGA", location: "White Bear, SK", salary: "$48K–$58K", type: "Full-time", status: "active", apps: 12, views: 189, posted: "Feb 3", featured: false },
    { title: "Beadwork Instructor", org: "Eagle Feather Designs", location: "Calgary, AB", salary: "$35/hr", type: "Contract", status: "pending_review", apps: 0, views: 0, posted: "Feb 5", featured: false },
    { title: "Software Developer (Remote)", org: "Turtle Island Tech", location: "Remote", salary: "$90K–$130K", type: "Full-time", status: "active", apps: 42, views: 678, posted: "Jan 10", featured: true },
    { title: "Suspicious Job Posting", org: "Unknown LLC", location: "Anywhere", salary: "$200K+", type: "Full-time", status: "flagged", apps: 0, views: 23, posted: "Feb 4", featured: false, flagReason: "Unrealistic salary, unverified org" },
    { title: "Elder Care Coordinator", org: "Red River Wellness", location: "Winnipeg, MB", salary: "$55K–$68K", type: "Full-time", status: "expired", apps: 15, views: 201, posted: "Dec 1", featured: false },
  ];

  const statusColor3 = { active: C.green, pending_review: C.amber, flagged: C.red, expired: C.textMuted };
  const statusLabel2 = { active: "Active", pending_review: "Pending Review", flagged: "Flagged", expired: "Expired" };

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);

  return (
    <div style={fadeUp}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Job Listings</h1>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>312 total · 1 flagged · 1 pending review</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflow: "auto" }}>
        {[
          { key: "all", label: "All" },
          { key: "active", label: "Active" },
          { key: "pending_review", label: "Pending" },
          { key: "flagged", label: "Flagged" },
          { key: "expired", label: "Expired" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: "6px 12px", borderRadius: 8, border: `1px solid ${filter === f.key ? C.accent : C.border}`,
            background: filter === f.key ? C.accentBg : C.surface, color: filter === f.key ? C.accent : C.textSoft,
            fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>{f.label}</button>
        ))}
      </div>

      {/* Job Cards */}
      {filtered.map((j, i) => (
        <div key={i} className="card-hover" style={{
          background: C.surface, borderRadius: 12,
          border: `1px solid ${j.status === "flagged" ? "#FECACA" : j.status === "pending_review" ? C.amberLt : C.border}`,
          padding: 14, marginBottom: 8,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{j.title}</span>
                {j.featured && <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: C.amberBg, color: C.amber }}>⭐ Featured</span>}
              </div>
              <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>{j.org} · {j.location}</div>
            </div>
            <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: `${statusColor3[j.status]}16`, color: statusColor3[j.status], whiteSpace: "nowrap" }}>
              {statusLabel2[j.status]}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <Tag teal>{j.salary}</Tag>
            <Tag>{j.type}</Tag>
            <Tag>{j.apps} applicants</Tag>
            <Tag>{j.views} views</Tag>
          </div>

          {j.flagReason && (
            <div style={{ background: C.redBg, borderRadius: 8, padding: "6px 10px", marginBottom: 8, fontSize: 12, color: C.red, fontWeight: 500 }}>
              ⚠️ {j.flagReason}
            </div>
          )}

          <div style={{ display: "flex", gap: 6 }}>
            {j.status === "active" && <Btn v={j.featured ? "ghost" : "secondary"} small>{j.featured ? "Remove Feature" : "⭐ Feature"}</Btn>}
            {j.status === "pending_review" && <Btn v="primary" small icon="check">Approve</Btn>}
            {j.status === "flagged" && <Btn v="danger" small icon="x">Remove</Btn>}
            {j.status === "flagged" && <Btn v="ghost" small icon="check">Dismiss Flag</Btn>}
            <Btn v="ghost" small icon="eye">View</Btn>
            {j.status === "active" && <Btn v="ghost" small icon="lock">Pause</Btn>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── ADMIN SCREEN 6: MODERATION QUEUE ─────────────────────────
const AdminModerationScreen = ({ go }) => {
  const [tab, setTab] = useState("pending");

  const reports = [
    {
      id: 1, severity: "high", category: "Cultural concern", status: "pending",
      itemType: "organization", itemName: "Questionable Corp",
      reporter: "Maria Thunderchild", reporterNation: "Cree",
      description: "This organization claims to be Indigenous-owned but has no verifiable connection to any Indigenous community. Their products use sacred imagery without authorization.",
      reported: "2 hours ago",
    },
    {
      id: 2, severity: "high", category: "Harassment", status: "pending",
      itemType: "comment", itemName: "Comment on job listing",
      reporter: "Sarah Whitebear", reporterNation: "Cree",
      description: "Racist comment targeting Indigenous applicants on a public job listing. Contains slurs and stereotypes.",
      reported: "3 hours ago",
    },
    {
      id: 3, severity: "medium", category: "Fake business", status: "pending",
      itemType: "shop_listing", itemName: "\"Authentic\" Dreamcatchers",
      reporter: "Nina Eagle Feather", reporterNation: "Blackfoot",
      description: "Mass-produced items being sold as authentic Indigenous crafts. Seller has no Indigenous community connections.",
      reported: "5 hours ago",
    },
    {
      id: 4, severity: "medium", category: "Spam", status: "pending",
      itemType: "job", itemName: "Work From Home $5000/week!!!",
      reporter: "Auto-detection", reporterNation: "System",
      description: "Suspected spam job listing. Unrealistic salary claims, no company information, suspicious external links.",
      reported: "6 hours ago",
    },
    {
      id: 5, severity: "low", category: "Inappropriate", status: "pending",
      itemType: "profile", itemName: "User: JohnDoe99",
      reporter: "Kwame Asante", reporterNation: "Anishinaabe",
      description: "Profile contains inappropriate content in the bio section. Not suitable for a professional networking platform.",
      reported: "1 day ago",
    },
    {
      id: 6, severity: "high", category: "Cultural concern", status: "under_review",
      itemType: "shop_listing", itemName: "Sacred Medicine Bundle Kit",
      reporter: "Elder Council Flag", reporterNation: "Community",
      description: "Selling sacred ceremonial items online violates cultural protocols. Multiple community members have raised concerns about commercialization of sacred practices.",
      reported: "2 days ago", assignedTo: "Admin",
    },
    {
      id: 7, severity: "low", category: "Other", status: "resolved",
      itemType: "job", itemName: "Outdated job listing",
      reporter: "System", reporterNation: "Auto",
      description: "Job listing has been active for 90+ days with no updates. May be outdated.",
      reported: "3 days ago", resolvedAction: "Listing archived",
    },
  ];

  const sevColor = { high: C.red, medium: C.amber, low: C.textMuted };
  const catIcons = { "Cultural concern": "feather", "Harassment": "shield", "Fake business": "building", "Spam": "mail", "Inappropriate": "eye", "Other": "file" };

  const filtered = tab === "all" ? reports : reports.filter(r => r.status === tab);

  return (
    <div style={fadeUp}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Moderation Queue</h1>
        <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>7 reports · 2 high severity · 1 cultural concern pending</p>
      </div>

      {/* Cultural Concern Banner */}
      <div style={{ background: "#FDF2F8", borderRadius: 10, border: "1px solid #FBCFE8", padding: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <I n="feather" s={20} c={C.pink} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.pink }}>Cultural Concerns Get Priority</div>
          <div style={{ fontSize: 12, color: C.textSoft }}>Reports flagged as cultural concerns are reviewed first and may require Elder consultation.</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[
          { key: "pending", label: "Pending (5)" },
          { key: "under_review", label: "Reviewing (1)" },
          { key: "resolved", label: "Resolved (1)" },
          { key: "all", label: "All" },
        ].map(f => (
          <button key={f.key} onClick={() => setTab(f.key)} style={{
            padding: "6px 12px", borderRadius: 8, border: `1px solid ${tab === f.key ? C.accent : C.border}`,
            background: tab === f.key ? C.accentBg : C.surface, color: tab === f.key ? C.accent : C.textSoft,
            fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>{f.label}</button>
        ))}
      </div>

      {/* Report Cards */}
      {filtered.map((r, i) => (
        <div key={r.id} style={{
          background: C.surface, borderRadius: 12,
          border: `1px solid ${r.severity === "high" ? "#FECACA" : r.severity === "medium" ? C.amberLt : C.border}`,
          padding: 14, marginBottom: 10,
          borderLeft: `4px solid ${sevColor[r.severity]}`,
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: r.category === "Cultural concern" ? C.pinkBg : `${sevColor[r.severity]}16`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I n={catIcons[r.category] || "shield"} s={16} c={r.category === "Cultural concern" ? C.pink : sevColor[r.severity]} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.category}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{r.itemType}: {r.itemName}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: `${sevColor[r.severity]}16`, color: sevColor[r.severity], textTransform: "uppercase" }}>{r.severity}</span>
              <span style={{ fontSize: 10, color: C.textMuted }}>{r.reported}</span>
            </div>
          </div>

          {/* Reporter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, padding: "6px 10px", background: C.bg, borderRadius: 8 }}>
            <I n="user" s={12} c={C.textMuted} />
            <span style={{ fontSize: 11, color: C.textSoft }}>Reported by <strong style={{ color: C.text }}>{r.reporter}</strong></span>
            {r.reporterNation !== "System" && r.reporterNation !== "Auto" && r.reporterNation !== "Community" && (
              <Tag teal>{r.reporterNation}</Tag>
            )}
          </div>

          {/* Description */}
          <p style={{ fontSize: 13, color: C.textSoft, lineHeight: 1.6, margin: "0 0 10px" }}>{r.description}</p>

          {/* Assigned / Resolved */}
          {r.assignedTo && (
            <div style={{ fontSize: 11, color: C.blue, fontWeight: 600, marginBottom: 8 }}>📋 Assigned to: {r.assignedTo}</div>
          )}
          {r.resolvedAction && (
            <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginBottom: 8 }}>✅ Resolved: {r.resolvedAction}</div>
          )}

          {/* Actions */}
          {r.status === "pending" && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Btn v="primary" small icon="check">Take Action</Btn>
              <Btn v="ghost" small icon="x">Dismiss</Btn>
              <Btn v="ghost" small icon="eye">View Item</Btn>
              {r.category === "Cultural concern" && <Btn v="secondary" small icon="feather">Request Elder Input</Btn>}
            </div>
          )}
          {r.status === "under_review" && (
            <div style={{ display: "flex", gap: 6 }}>
              <Btn v="primary" small icon="check">Resolve</Btn>
              <Btn v="danger" small icon="x">Remove Content</Btn>
              <Btn v="ghost" small icon="eye">View Item</Btn>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── ADMIN SCREEN 7: SHOP MANAGEMENT ──────────────────────────
const AdminShopScreen = ({ go }) => {
  const [tab, setTab] = useState("all");

  const listings = [
    { name: "Hand-beaded Medallion Earrings", vendor: "Eagle Feather Designs", nation: "Blackfoot", price: "$85", category: "Jewelry", status: "active", sales: 34, rating: 4.9, verified: true },
    { name: "Cedar & Sage Smudge Kit", vendor: "Prairie Medicines", nation: "Cree", price: "$28", category: "Wellness", status: "active", sales: 89, rating: 4.8, verified: true },
    { name: "Indigenous Graphic T-Shirt Collection", vendor: "Turtle Island Apparel", nation: "Mohawk", price: "$45", category: "Clothing", status: "active", sales: 156, rating: 4.7, verified: true },
    { name: "Traditional Ribbon Skirt (Custom)", vendor: "Muskeg Creations", nation: "Dene", price: "$220", category: "Regalia", status: "active", sales: 12, rating: 5.0, verified: true },
    { name: "\"Native\" Dream Catcher Set", vendor: "CheapCrafts LLC", nation: "Not specified", price: "$12", category: "Decor", status: "flagged", sales: 2, rating: 1.2, verified: false, flagReason: "Non-Indigenous vendor using Indigenous imagery" },
    { name: "Birch Bark Basket Workshop", vendor: "Woodland Skills Co", nation: "Anishinaabe", price: "$75", category: "Services", status: "active", sales: 8, rating: 4.6, verified: true },
    { name: "Suspicious Supplement", vendor: "NatureCure Inc", nation: "Not specified", price: "$49", category: "Wellness", status: "flagged", sales: 0, rating: 0, verified: false, flagReason: "Unverified health claims using Indigenous branding" },
    { name: "Decolonizing Data: Consulting Package", vendor: "Turtle Island Tech", nation: "Mohawk", price: "$2,500", category: "Services", status: "active", sales: 6, rating: 5.0, verified: true },
  ];

  const filtered = tab === "all" ? listings : tab === "flagged" ? listings.filter(l => l.status === "flagged") : listings.filter(l => l.verified === (tab === "verified"));

  return (
    <div style={fadeUp}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Shop Indigenous</h1>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>156 listings · 2 flagged · $47.2K total sales</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[
          { key: "all", label: "All" },
          { key: "verified", label: "Verified Vendors" },
          { key: "flagged", label: "Flagged (2)" },
        ].map(f => (
          <button key={f.key} onClick={() => setTab(f.key)} style={{
            padding: "6px 12px", borderRadius: 8, border: `1px solid ${tab === f.key ? C.accent : C.border}`,
            background: tab === f.key ? C.accentBg : C.surface, color: tab === f.key ? C.accent : C.textSoft,
            fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>{f.label}</button>
        ))}
      </div>

      {/* Listings */}
      {filtered.map((l, i) => (
        <div key={i} style={{
          background: C.surface, borderRadius: 12,
          border: `1px solid ${l.status === "flagged" ? "#FECACA" : C.border}`,
          padding: 14, marginBottom: 8,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
                {l.name}
                {l.verified && <span style={{ marginLeft: 6, fontSize: 12, color: C.green }}>✓</span>}
              </div>
              <div style={{ fontSize: 12, color: C.textSoft }}>{l.vendor} · {l.nation}</div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>{l.price}</span>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <Tag>{l.category}</Tag>
            <Tag teal>{l.sales} sales</Tag>
            {l.rating > 0 && <Tag>⭐ {l.rating}</Tag>}
          </div>

          {l.flagReason && (
            <div style={{ background: C.redBg, borderRadius: 8, padding: "6px 10px", marginBottom: 8, fontSize: 12, color: C.red, fontWeight: 500 }}>
              ⚠️ {l.flagReason}
            </div>
          )}

          <div style={{ display: "flex", gap: 6 }}>
            <Btn v="ghost" small icon="eye">View</Btn>
            {l.status === "flagged" && <Btn v="danger" small icon="x">Remove</Btn>}
            {l.status === "flagged" && <Btn v="ghost" small icon="check">Dismiss</Btn>}
            {!l.verified && l.status !== "flagged" && <Btn v="secondary" small icon="verified">Verify Vendor</Btn>}
            {l.status === "active" && <Btn v="ghost" small icon="star">Feature</Btn>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── ADMIN SCREEN 8: PLATFORM SETTINGS ────────────────────────
const AdminSettingsScreen = ({ go }) => {
  const [maintenance, setMaintenance] = useState(false);
  const [autoModeration, setAutoModeration] = useState(true);
  const [newRegistrations, setNewRegistrations] = useState(true);
  const [shopEnabled, setShopEnabled] = useState(true);
  const [jobAutoExpiry, setJobAutoExpiry] = useState(true);

  const Toggle = ({ label, desc, value, onChange }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${C.borderLt}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{label}</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: value ? C.accent : C.border, position: "relative", transition: "background 0.2s",
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute",
          top: 3, left: value ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </button>
    </div>
  );

  return (
    <div style={fadeUp}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Platform Settings</h1>
        <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Configure IOPPS platform behavior</p>
      </div>

      {/* Maintenance Mode Warning */}
      {maintenance && (
        <div style={{ background: C.redBg, borderRadius: 10, border: "1px solid #FECACA", padding: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <I n="shield" s={20} c={C.red} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>🚨 Maintenance Mode Active</div>
            <div style={{ fontSize: 12, color: C.textSoft }}>The platform is currently inaccessible to all non-admin users.</div>
          </div>
        </div>
      )}

      {/* Feature Flags */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: "4px 16px", marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, paddingTop: 12 }}>Feature Flags</h3>
        <Toggle label="Maintenance Mode" desc="Disable platform for all non-admin users" value={maintenance} onChange={setMaintenance} />
        <Toggle label="New Registrations" desc="Allow new users and organizations to sign up" value={newRegistrations} onChange={setNewRegistrations} />
        <Toggle label="Shop Indigenous" desc="Enable the Shop Indigenous marketplace" value={shopEnabled} onChange={setShopEnabled} />
        <Toggle label="Auto-Moderation" desc="Automatically flag suspicious content using AI detection" value={autoModeration} onChange={setAutoModeration} />
        <Toggle label="Job Auto-Expiry" desc="Auto-expire job listings after 90 days without updates" value={jobAutoExpiry} onChange={setJobAutoExpiry} />
      </div>

      {/* Announcement Banner */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Site Announcement</h3>
        <Input label="Banner Message" placeholder="e.g., We're upgrading our servers this weekend..." value="" onChange={() => {}} textarea />
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Input label="Banner Color" placeholder="#0D9488" value="#0D9488" onChange={() => {}} />
          <Input label="Expires" placeholder="Feb 14, 2025" value="" onChange={() => {}} />
        </div>
        <Btn v="primary" small icon="send">Publish Announcement</Btn>
      </div>

      {/* Platform Info */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>Platform Information</h3>
        {[
          { label: "Platform Version", value: "v2.4.1" },
          { label: "Environment", value: "Production" },
          { label: "Last Deployment", value: "Feb 6, 2025 · 3:42 PM CST" },
          { label: "Database", value: "Firestore (us-central1)" },
          { label: "Hosting", value: "Vercel (Pro)" },
          { label: "Auth Provider", value: "Firebase Authentication" },
          { label: "Payment Processor", value: "Stripe" },
          { label: "CDN", value: "Vercel Edge Network" },
        ].map((info, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 7 ? `1px solid ${C.borderLt}` : "none" }}>
            <span style={{ fontSize: 13, color: C.textSoft }}>{info.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{info.value}</span>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div style={{ background: C.surface, borderRadius: 14, border: `1px solid #FECACA`, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 12 }}>⚠️ Danger Zone</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Purge Expired Listings</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Remove all expired job listings older than 6 months</div>
            </div>
            <Btn v="danger" small>Purge</Btn>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Clear Report History</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Archive all resolved reports older than 1 year</div>
            </div>
            <Btn v="danger" small>Clear</Btn>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Reset Analytics</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>Clear all platform analytics data and start fresh</div>
            </div>
            <Btn v="danger" small>Reset</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};


// ╔════════════════════════════════════════════════════════════════╗
// ║  UNIFIED APP — ALL THREE JOURNEYS                              ║
// ╚════════════════════════════════════════════════════════════════╝

export default function IOPPSJourneys() {
  const [journey, setJourney] = useState("employer");
  const [empScreen, setEmpScreen] = useState("landing");
  const [memScreen, setMemScreen] = useState("landing");
  const [adminScreen, setAdminScreen] = useState("dashboard");
  const [isDesktop, setIsDesktop] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const checkWidth = () => setIsDesktop(window.innerWidth > 700);
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  const goEmp = (s) => { setEmpScreen(s); if (containerRef.current) containerRef.current.scrollTop = 0; };
  const goMem = (s) => { setMemScreen(s); if (containerRef.current) containerRef.current.scrollTop = 0; };
  const goAdmin = (s) => { setAdminScreen(s); if (containerRef.current) containerRef.current.scrollTop = 0; };

  const empScreens = {
    landing: EmpLandingScreen,
    typeSelect: EmpTypeSelectScreen,
    signup: EmpSignupScreen,
    onboarding: EmpOnboardingScreen,
    plans: PlansScreen,
    payment: PaymentScreen,
    welcome: EmpWelcomeScreen,
    postJob: PostJobScreen,
    jobSuccess: JobSuccessScreen,
    dashboard: DashboardScreen,
  };

  const memScreens = {
    landing: MemLandingScreen,
    typeSelect: MemTypeSelectScreen,
    signup: MemSignupScreen,
    onboarding: MemOnboardingScreen,
    welcome: MemWelcomeScreen,
    discover: DiscoverScreen,
    jobDetail: JobDetailScreen,
    apply: ApplyScreen,
    appSuccess: AppSuccessScreen,
    profile: ProfileScreen,
  };

  const adminScreens = {
    dashboard: AdminDashScreen,
    users: AdminUsersScreen,
    orgs: AdminOrgsScreen,
    verification: AdminVerifyScreen,
    jobs: AdminJobsScreen,
    moderation: AdminModerationScreen,
    shop: AdminShopScreen,
    settings: AdminSettingsScreen,
  };

  const empSteps = [
    { key: "landing", label: "Landing" },
    { key: "typeSelect", label: "Type" },
    { key: "signup", label: "Signup" },
    { key: "onboarding", label: "Onboard" },
    { key: "plans", label: "Plans" },
    { key: "payment", label: "Pay" },
    { key: "welcome", label: "Welcome" },
    { key: "postJob", label: "Post Job" },
    { key: "jobSuccess", label: "Success" },
    { key: "dashboard", label: "Dashboard" },
  ];

  const memSteps = [
    { key: "landing", label: "Landing" },
    { key: "typeSelect", label: "Type" },
    { key: "signup", label: "Signup" },
    { key: "onboarding", label: "Onboard" },
    { key: "welcome", label: "Welcome" },
    { key: "discover", label: "Discover" },
    { key: "jobDetail", label: "Job" },
    { key: "apply", label: "Apply" },
    { key: "appSuccess", label: "Success" },
    { key: "profile", label: "Profile" },
  ];

  const adminSteps = [
    { key: "dashboard", label: "Dashboard" },
    { key: "users", label: "Users" },
    { key: "orgs", label: "Orgs" },
    { key: "verification", label: "Verify" },
    { key: "jobs", label: "Jobs" },
    { key: "moderation", label: "Reports" },
    { key: "shop", label: "Shop" },
    { key: "settings", label: "Settings" },
  ];

  const isEmp = journey === "employer";
  const isMem = journey === "community";
  const isAdmin = journey === "admin";

  const screen = isEmp ? empScreen : isMem ? memScreen : adminScreen;
  const go = isEmp ? goEmp : isMem ? goMem : goAdmin;
  const screenMap = isEmp ? empScreens : isMem ? memScreens : adminScreens;
  const steps = isEmp ? empSteps : isMem ? memSteps : adminSteps;
  const Screen = screenMap[screen];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style>{keyframes}{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Journey toggle */}
      <div style={{
        background: C.navy, padding: "6px 12px 0", display: "flex", flexDirection: "column",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Top: IOPPS label + journey toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.accent, letterSpacing: 1 }}>IOPPS</span>
          <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 2 }}>
            {[
              { key: "employer", label: "🏢 Employer" },
              { key: "community", label: "👤 Community" },
              { key: "admin", label: "🔧 Admin" },
            ].map(j => (
              <button key={j.key} onClick={() => setJourney(j.key)} style={{
                padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 700,
                cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
                background: journey === j.key ? (j.key === "admin" ? C.amber : C.accent) : "transparent",
                color: journey === j.key ? "#fff" : "rgba(255,255,255,0.5)",
              }}>
                {j.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom: screen navigation pills */}
        <div style={{ display: "flex", gap: 3, overflow: "auto", paddingBottom: 6 }}>
          {steps.map((s) => (
            <button key={s.key} onClick={() => go(s.key)} style={{
              padding: "3px 8px", borderRadius: 5, border: "none", fontSize: 11, fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap",
              background: screen === s.key ? (isAdmin ? C.amber : C.accent) : "rgba(255,255,255,0.06)",
              color: screen === s.key ? "#fff" : "rgba(255,255,255,0.4)",
            }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div ref={containerRef} style={{
        maxWidth: isDesktop ? (isAdmin ? 640 : 560) : "100%", margin: "0 auto",
        padding: isDesktop ? "24px 0" : "16px 16px 80px",
      }}>
        <Screen go={go} isDesktop={isDesktop} />
      </div>
    </div>
  );
}
