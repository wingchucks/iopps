'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

const BANNER_STORAGE_KEY = 'iopps_app_banner_dismissed';

interface MobileAppBannerProps {
  userId: string;
}

export default function MobileAppBanner({ userId }: MobileAppBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Check if banner was dismissed
    const dismissed = localStorage.getItem(`${BANNER_STORAGE_KEY}_${userId}`);
    if (!dismissed) {
      // Show after a delay
      const timer = setTimeout(() => setIsVisible(true), 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', checkMobile);
      };
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, [userId]);

  const handleDismiss = () => {
    localStorage.setItem(`${BANNER_STORAGE_KEY}_${userId}`, 'true');
    setIsVisible(false);
  };

  // Only show on mobile and when visible
  if (!isMobile || !isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 animate-slide-up">
      <div className="bg-gradient-to-r from-accent/20 to-teal-600/20 backdrop-blur-xl border border-accent/30 rounded-2xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-accent/20">
            <DevicePhoneMobileIcon className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-50 text-sm">Get the IOPPS App</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Coming soon! Get push notifications and manage on the go.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-slate-950 hover:bg-accent/90 transition-colors"
              >
                Notify Me
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
