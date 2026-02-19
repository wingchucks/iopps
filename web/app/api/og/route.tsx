import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "IOPPS.ca";
  const subtitle = searchParams.get("subtitle") || "";
  const type = searchParams.get("type") || "default";
  const imageUrl = searchParams.get("image") || "";

  return new ImageResponse(
    <OgImageTemplate title={title} subtitle={subtitle} type={type} imageUrl={imageUrl} />,
    { width: 1200, height: 630 }
  );
}
