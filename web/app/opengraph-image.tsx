import { ImageResponse } from "next/og";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export const alt = "IOPPS.ca - Empowering Indigenous Success";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <OgImageTemplate
                title="Indigenous Opportunities Hub"
                subtitle="Jobs, Education, Business, and Community Events across Canada."
                type="Platform"
            />
        ),
        {
            ...size,
        }
    );
}
