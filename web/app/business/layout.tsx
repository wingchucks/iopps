import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
          template: '%s | IOPPS Marketplace',
      default: 'Indigenous Marketplace',
    },
    description: 'Discover and support Indigenous-owned businesses. Shop authentic Indigenous products, hire Indigenous services, and connect with Indigenous-owned businesses across North America.',
    openGraph: {
          title: 'Indigenous Marketplace',
          description: 'Discover and support Indigenous-owned businesses. Shop authentic Indigenous products, hire Indigenous services, and connect with Indigenous-owned businesses across North America.',
          type: 'website',
          images: [
            {
                      url: '/api/og?title=Indigenous%20Marketplace&type=business&subtitle=Shop%20Products%20%E2%80%A2%20Hire%20Services%20%E2%80%A2%20Support%20Indigenous%20Business',
                      width: 1200,
                      height: 630,
                      alt: 'IOPPS Indigenous Marketplace',
            },
                ],
    },
    twitter: {
          card: 'summary_large_image',
          title: 'Indigenous Marketplace',
          description: 'Discover and support Indigenous-owned businesses across North America.',
          images: ['/api/og?title=Indigenous%20Marketplace&type=business&subtitle=Shop%20Products%20%E2%80%A2%20Hire%20Services%20%E2%80%A2%20Support%20Indigenous%20Business'],
    },
};

export default function MarketplaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
