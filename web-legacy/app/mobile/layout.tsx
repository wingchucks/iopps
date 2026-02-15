import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Mobile App - Coming Soon",
    description:
        "Access Indigenous opportunities on the go with the IOPPS mobile app. Get instant alerts for jobs, scholarships, and conferences. Coming soon to iOS and Android.",
    keywords: [
        "IOPPS mobile app",
        "Indigenous jobs app",
        "Indigenous opportunities mobile",
        "Indigenous employment app",
        "job alerts app",
    ],
    openGraph: {
        title: "IOPPS Mobile App - Coming Soon",
        description:
            "Access Indigenous opportunities on the go. Join the waitlist for the IOPPS mobile app.",
    },
};

export default function MobileAppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
