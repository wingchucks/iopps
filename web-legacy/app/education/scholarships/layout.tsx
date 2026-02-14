import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
          template: '%s | IOPPS Scholarships',
      default: 'Indigenous Scholarships & Bursaries',
    },
    description: 'Find scholarships, bursaries, and funding opportunities for Indigenous students across Canada. Support your educational journey with financial aid.',
    openGraph: {
          title: 'Indigenous Scholarships & Bursaries',
          description: 'Find scholarships, bursaries, and funding opportunities for Indigenous students across Canada.',
          type: 'website',
          images: [
            {
                      url: '/api/og?title=Indigenous%20Scholarships&type=scholarship&subtitle=Funding%20Opportunities%20for%20Indigenous%20Students',
                      width: 1200,
                      height: 630,
                      alt: 'IOPPS Indigenous Scholarships',
            },
                ],
    },
    twitter: {
          card: 'summary_large_image',
          title: 'Indigenous Scholarships & Bursaries',
          description: 'Find scholarships, bursaries, and funding opportunities for Indigenous students across Canada.',
          images: ['/api/og?title=Indigenous%20Scholarships&type=scholarship&subtitle=Funding%20Opportunities%20for%20Indigenous%20Students'],
    },
};

export default function ScholarshipsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
