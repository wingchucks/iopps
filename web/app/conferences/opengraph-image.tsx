import { ImageResponse } from "next/og";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export const alt = "IOPPS Conferences & Events";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <OgImageTemplate
                title="Conferences & Events"
                subtitle="Connect, learn, and grow at Indigenous events across Canada."
                type="Events"
            />
        ),
        {
            ...size,
        }
    );
}
