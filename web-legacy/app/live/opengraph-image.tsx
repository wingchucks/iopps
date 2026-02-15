import { ImageResponse } from "next/og";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export const alt = "IOPPS Live - Indigenous Streaming";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <OgImageTemplate
                title="IOPPS Live"
                subtitle="Watch live streams of events, speakers, and community celebrations."
                type="Live"
            />
        ),
        {
            ...size,
        }
    );
}
