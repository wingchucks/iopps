import { Metadata } from 'next';
import Link from 'next/link';
import ReloadButton from './ReloadButton';

export const metadata: Metadata = {
  title: 'Offline',
  description: 'You are currently offline',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Offline Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-[var(--card-bg)] rounded-full flex items-center justify-center border-2 border-[var(--border)] shadow-sm">
              <svg
                className="w-12 h-12 text-[var(--text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
                />
              </svg>
            </div>
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 w-24 h-24 bg-accent/10 rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Main Content */}
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
          You&apos;re Offline
        </h1>

        <p className="text-foreground0 mb-8 leading-relaxed">
          It looks like you&apos;ve lost your internet connection. Don&apos;t worry, you can still access previously viewed pages.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <ReloadButton />

          <Link
            href="/"
            className="block w-full bg-surface hover:bg-surface text-[var(--text-primary)] font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Go to Home
          </Link>
        </div>

        {/* Tips Section */}
        <div className="mt-12 p-4 bg-[var(--card-bg)] rounded-lg border border-[var(--border)] shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">
            Offline Tips
          </h2>
          <ul className="text-xs text-foreground0 space-y-1 text-left">
            <li>• Check your internet connection</li>
            <li>• Try switching between WiFi and mobile data</li>
            <li>• Disable airplane mode if it's on</li>
            <li>• Previously visited pages may still be available</li>
          </ul>
        </div>

        {/* IOPPS Branding */}
        <div className="mt-8">
          <p className="text-xs text-[var(--text-secondary)]">
            IOPPS - Indigenous Opportunities & Partnerships Platform
          </p>
        </div>
      </div>
    </div>
  );
}
