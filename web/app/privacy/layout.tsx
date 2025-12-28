import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'IOPPS Privacy Policy - Learn how we protect your personal information and handle your data with care and respect.',
    openGraph: {
          title: 'Privacy Policy',
          description: 'IOPPS Privacy Policy - Learn how we protect your personal information.',
          type: 'website',
    },
};

export default function PrivacyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
