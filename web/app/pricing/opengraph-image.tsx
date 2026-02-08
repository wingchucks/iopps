import { ImageResponse } from "next/og";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export const alt = "IOPPS Pricing & Plans";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgImageTemplate
        title="Pricing & Plans"
        subtitle="Flexible pricing for job postings, conferences, and Indigenous business listings."
        type="Pricing"
      />
    ),
    {
      ...size,
    }
  );
}
