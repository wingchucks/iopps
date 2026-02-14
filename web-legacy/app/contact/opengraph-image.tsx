import { ImageResponse } from "next/og";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export const alt = "Contact IOPPS - Get in Touch";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <OgImageTemplate
        title="Contact IOPPS"
        subtitle="Reach out for partnerships, job postings, or general inquiries."
        type="Contact"
      />
    ),
    {
      ...size,
    }
  );
}
