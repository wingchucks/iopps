import { ImageResponse } from "next/og";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export const alt = "IOPPS Business - Indigenous Directory & Services";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <OgImageTemplate
                title="Indigenous Business Directory"
                subtitle="Support Indigenous-owned businesses and find professional services."
                type="Business"
            />
        ),
        {
            ...size,
        }
    );
}
