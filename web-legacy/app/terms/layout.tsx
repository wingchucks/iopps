import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'IOPPS Terms of Service - Rules and guidelines for using our platform to connect Indigenous talent with opportunities.',
    openGraph: {
          title: 'Terms of Service',
          description: 'IOPPS Terms of Service - Rules and guidelines for using our platform.',
          type: 'website',
    },
};

export default function TermsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
