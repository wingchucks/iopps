import { ImageResponse } from "next/og";
import OgImageTemplate from "@/lib/OgImageTemplate";

export const runtime = "edge";

export const alt = "IOPPS Education - Scholarships, Schools & Programs";
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <OgImageTemplate
                title="Indigenous Education"
                subtitle="Discover scholarships, verified schools, and training programs."
                type="Education"
            />
        ),
        {
            ...size,
        }
    );
}
