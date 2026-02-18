import { ImageResponse } from "next/og";

export const alt = "IOPPS - Indigenous Opportunities Portal & Partnership System";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(160deg, #0A1628 0%, #0F2645 50%, #0D9488 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "linear-gradient(135deg, #0D9488, #3B82F6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: 2,
            }}
          >
            IO
          </div>
          <span
            style={{
              color: "#fff",
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: 6,
            }}
          >
            IOPPS
          </span>
        </div>
        <p
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 26,
            fontWeight: 500,
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.5,
          }}
        >
          Indigenous Opportunities Portal &amp; Partnership System
        </p>
        <p
          style={{
            color: "#0D9488",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 4,
            marginTop: 24,
          }}
        >
          EMPOWERING INDIGENOUS SUCCESS
        </p>
      </div>
    ),
    { ...size }
  );
}
