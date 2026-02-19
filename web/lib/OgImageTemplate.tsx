export type OgImageProps = {
  title: string;
  subtitle?: string;
  type?: string;
  imageUrl?: string;
};

const colors = {
  default: { from: "#14B8A6", to: "#0F766E", bg: "#020617", text: "#F8FAFC", muted: "#94A3B8" },
  accent: "#14B8A6",
};

export default function OgImageTemplate({ title, subtitle, type = "IOPPS", imageUrl }: OgImageProps) {
  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", backgroundColor: colors.default.bg, backgroundImage: "radial-gradient(circle at 100% 0%, rgba(20, 184, 166, 0.2) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(99, 102, 241, 0.2) 0%, transparent 50%)", fontFamily: '"Inter", sans-serif' }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
      <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "60px", position: "relative", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg, #14B8A6 0%, #10B981 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "bold", color: "white", boxShadow: "0 0 20px rgba(20, 184, 166, 0.4)" }}>I</div>
            <span style={{ fontSize: 40, fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>IOPPS.ca</span>
          </div>
          <div style={{ padding: "10px 24px", background: "rgba(20, 184, 166, 0.1)", border: "1px solid rgba(20, 184, 166, 0.3)", borderRadius: "100px", display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 20, color: "#14B8A6", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{type}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "40px", marginTop: "auto", marginBottom: "auto" }}>
          {imageUrl && (
            <div style={{ display: "flex", width: "250px", height: "250px", borderRadius: "24px", overflow: "hidden", border: "4px solid rgba(255, 255, 255, 0.1)", boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
            <div style={{ fontSize: title.length > 50 ? 56 : 72, fontWeight: 800, color: "white", lineHeight: 1.1, letterSpacing: "-0.02em", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 32, color: "#94A3B8", maxWidth: "90%", lineHeight: 1.4 }}>{subtitle}</div>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "auto" }}>
          <div style={{ width: "60px", height: "4px", background: "#14B8A6", borderRadius: "2px" }} />
          <span style={{ fontSize: 24, color: "#94A3B8" }}>Indigenous Opportunities & Business Directory</span>
        </div>
      </div>
    </div>
  );
}
