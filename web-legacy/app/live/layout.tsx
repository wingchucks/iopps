import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'IOPPS Livestream',
    description: 'Watch live streams, pow wows, and events from the Indigenous community. Tune into live broadcasts and past recordings.',
    openGraph: {
          title: 'IOPPS Livestream',
          description: 'Watch live streams, pow wows, and events from the Indigenous community.',
          type: 'website',
    },
};

export default function LiveLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
