import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pow Wows & Events',
    description: 'Discover pow wows, sporting events, and cultural gatherings across Turtle Island. Find community celebrations and cultural events.',
    openGraph: {
          title: 'Pow Wows & Events',
          description: 'Discover pow wows, sporting events, and cultural gatherings across Turtle Island.',
          type: 'website',
    },
};

export default function PowwowsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
