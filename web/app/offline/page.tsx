import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Offline',
  description: 'You are currently offline',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Offline Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-800">
              <svg
                className="w-12 h-12 text-slate-600"
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
            <div className="absolute inset-0 w-24 h-24 bg-teal-500/10 rounded-full animate-ping"></div>
          </div>
        </div>

        {/* Main Content */}
        <h1 className="text-3xl font-bold text-slate-100 mb-4">
          You're Offline
        </h1>

        <p className="text-slate-400 mb-8 leading-relaxed">
          It looks like you've lost your internet connection. Don't worry, you can still access previously viewed pages.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>

          <Link
            href="/"
            className="block w-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Go to Home
          </Link>
        </div>

        {/* Tips Section */}
        <div className="mt-12 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300 mb-2">
            Offline Tips
          </h2>
          <ul className="text-xs text-slate-500 space-y-1 text-left">
            <li>• Check your internet connection</li>
            <li>• Try switching between WiFi and mobile data</li>
            <li>• Disable airplane mode if it's on</li>
            <li>• Previously visited pages may still be available</li>
          </ul>
        </div>

        {/* IOPPS Branding */}
        <div className="mt-8">
          <p className="text-xs text-slate-600">
            IOPPS - Indigenous Opportunities & Partnerships Platform
          </p>
        </div>
      </div>
    </div>
  );
}
