import { ImageResponse } from "next/og";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export const alt = "School Details";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image() {
    // Fallback default image. Actual dynamic image is handled by page metadata pointing to /api/og
    return new ImageResponse(
        (
            <OgImageTemplate
                title="School Profile"
                subtitle="Explore programs and opportunities on IOPPS.ca"
                type="School"
            />
        ),
        {
            ...size,
        }
    );
}
