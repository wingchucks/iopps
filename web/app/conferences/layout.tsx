import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
          template: '%s | IOPPS Conferences',
      default: 'Indigenous Conferences & Events',
    },
    description: 'Discover Indigenous conferences, summits, and professional networking events across Canada. Connect with leaders, learn from experts, and grow your network.',
    openGraph: {
          title: 'Indigenous Conferences & Events',
          description: 'Discover Indigenous conferences, summits, and professional networking events across Canada.',
          type: 'website',
          images: [
            {
                      url: '/api/og?title=Indigenous%20Conferences&type=conference&subtitle=Professional%20Events%20%26%20Networking',
                      width: 1200,
                      height: 630,
                      alt: 'IOPPS Indigenous Conferences',
            },
                ],
    },
    twitter: {
          card: 'summary_large_image',
          title: 'Indigenous Conferences & Events',
          description: 'Discover Indigenous conferences, summits, and professional networking events across Canada.',
          images: ['/api/og?title=Indigenous%20Conferences&type=conference&subtitle=Professional%20Events%20%26%20Networking'],
    },
};

export default function ConferencesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
