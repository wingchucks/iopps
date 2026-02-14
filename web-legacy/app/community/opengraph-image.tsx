import { ImageResponse } from "next/og";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export const alt = "IOPPS Community - Pow Wows & Celebrations";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <OgImageTemplate
                title="Community & Culture"
                subtitle="Discover Pow Wows, community gatherings, and cultural events."
                type="Community"
            />
        ),
        {
            ...size,
        }
    );
}
