'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  SparklesIcon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';

const TOUR_STORAGE_KEY = 'iopps_org_tour_completed';

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  tip?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Your Dashboard',
    description: 'This is your central hub for managing your organization on IOPPS. From here you can post jobs, manage events, and connect with Indigenous professionals.',
    icon: SparklesIcon,
    tip: 'Tip: Press H to quickly return to this home screen anytime.',
  },
  {
    title: 'Post Jobs & Events',
    description: 'Use the sidebar modules to post job opportunities, create events, share scholarships, and more. Events and scholarships are FREE to post!',
    icon: BriefcaseIcon,
    tip: 'Tip: Press N to quickly create a new job posting.',
  },
  {
    title: 'Quick Search',
    description: 'Use the search bar in the sidebar to quickly find any page. Or press / to open search from anywhere.',
    icon: MagnifyingGlassIcon,
    tip: 'Tip: Press ? to see all keyboard shortcuts.',
  },
  {
    title: 'Get Help Anytime',
    description: 'Click "Need help?" at the bottom of the sidebar to access FAQs and contact support. We\'re here to help you succeed!',
    icon: QuestionMarkCircleIcon,
  },
];

interface WelcomeTourProps {
  userId: string;
}

export default function WelcomeTour({ userId }: WelcomeTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if tour has been completed
    const completed = localStorage.getItem(`${TOUR_STORAGE_KEY}_${userId}`);
    if (!completed) {
      // Small delay to let the page load first
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  const handleComplete = () => {
    localStorage.setItem(`${TOUR_STORAGE_KEY}_${userId}`, 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-xl transition-all">
                {/* Progress Dots */}
                <div className="flex justify-center gap-2 pt-6">
                  {TOUR_STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStep
                          ? 'w-6 bg-accent'
                          : index < currentStep
                          ? 'bg-accent/50'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Content */}
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent/20 to-teal-600/20 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-accent" />
                  </div>

                  <Dialog.Title className="text-2xl font-bold text-slate-50 mb-3">
                    {step.title}
                  </Dialog.Title>

                  <p className="text-slate-400 mb-4 leading-relaxed">
                    {step.description}
                  </p>

                  {step.tip && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 text-sm text-slate-300">
                      <SparklesIcon className="w-4 h-4 text-accent" />
                      {step.tip}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-8 pb-8 flex items-center justify-between">
                  <button
                    onClick={handleSkip}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Skip tour
                  </button>

                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-slate-950 font-semibold hover:bg-accent/90 transition-colors"
                  >
                    {isLastStep ? (
                      <>
                        <CheckCircleIcon className="w-5 h-5" />
                        Get Started
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRightIcon className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
