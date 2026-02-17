import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "IOPPS.ca";
  const subtitle = searchParams.get("subtitle") || "Indigenous Opportunities, Pathways & Partnerships";
  const type = searchParams.get("type") || "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          width: "100%",
          height: "100%",
          padding: "60px",
          background: "linear-gradient(135deg, #0F2B4C 0%, #1a3d66 50%, #0F2B4C 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {type && (
          <div
            style={{
              display: "flex",
              padding: "6px 16px",
              borderRadius: "9999px",
              background: "rgba(13, 148, 136, 0.3)",
              border: "1px solid rgba(13, 148, 136, 0.5)",
              color: "#14b8a6",
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "20px",
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            {type}
          </div>
        )}
        <div style={{ fontSize: "56px", fontWeight: 700, lineHeight: 1.2, maxWidth: "900px", display: "flex" }}>
          {title}
        </div>
        <div style={{ fontSize: "24px", color: "rgba(255,255,255,0.7)", marginTop: "16px", display: "flex" }}>
          {subtitle}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "40px",
            fontSize: "20px",
            fontWeight: 600,
            color: "#0D9488",
          }}
        >
          IOPPS.ca
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
