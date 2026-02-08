import { ImageResponse } from "next/og";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export const alt = "About IOPPS - Empowering Indigenous Success";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgImageTemplate
        title="About IOPPS"
        subtitle="Empowering Indigenous success through jobs, education, and community."
        type="About"
      />
    ),
    {
      ...size,
    }
  );
}
