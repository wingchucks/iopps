import { ImageResponse } from "next/og";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export const alt = "IOPPS Careers - Indigenous Jobs & Training";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <OgImageTemplate
                title="Indigenous Careers"
                subtitle="Find meaningful work and training opportunities with Indigenous-focused employers."
                type="Careers"
            />
        ),
        {
            ...size,
        }
    );
}
