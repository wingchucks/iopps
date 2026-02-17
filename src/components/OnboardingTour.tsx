"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useOnboarding, useAutoStartTour } from "@/lib/onboarding-context";

interface TourStep {
  title: string;
  description: string;
  /** CSS selector or data-tour-step value; null for center modal */
  target: string | null;
  position: "top" | "bottom" | "left" | "right" | "center";
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to IOPPS!",
    description:
      "Your one-stop platform for Indigenous jobs, events, scholarships, and community connections across North America. Let us show you around.",
    target: null,
    position: "center",
  },
  {
    title: "Your Feed",
    description:
      "This is your personalized feed with jobs, events, scholarships, and community updates. Browse by category using the tabs above.",
    target: "[data-tour-step='feed']",
    position: "right",
  },
  {
    title: "Search & Discover",
    description:
      "Find jobs, events, scholarships, and more with powerful search and filters.",
    target: "nav a.w-60[href='/search']",
    position: "bottom",
  },
  {
    title: "Your Profile",
    description:
      "Complete your profile to get matched with relevant opportunities and connect with the community.",
    target: "nav .hidden.md\\:flex > a[href='/profile']",
    position: "bottom",
  },
  {
    title: "Messages",
    description:
      "Connect with other members and organizations directly through private messaging.",
    target: "nav a[href='/messages']",
    position: "bottom",
  },
  {
    title: "Saved Items",
    description:
      "Bookmark interesting jobs, events, and posts to review them later.",
    target: "nav a[title='Saved Items']",
    position: "bottom",
  },
  {
    title: "You're All Set!",
    description:
      "Start exploring IOPPS and discover opportunities made for you. You can replay this tour anytime from Settings.",
    target: null,
    position: "center",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function OnboardingTour() {
  useAutoStartTour();

  const { isActive, currentStep, nextStep, prevStep, skipTour, completeTour, totalSteps } =
    useOnboarding();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const [arrowDirection, setArrowDirection] = useState<"top" | "bottom" | "left" | "right">("top");
  const [animating, setAnimating] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = tourSteps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;
  const isCenterModal = step?.target === null;

  const measureTarget = useCallback(() => {
    if (!step || !step.target) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const padding = 6;
    setTargetRect({
      top: rect.top - padding + window.scrollY,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });
  }, [step]);

  // Position tooltip relative to target
  useEffect(() => {
    if (!isActive) return;

    if (isCenterModal) {
      setTooltipStyle({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      setArrowStyle({ display: "none" });
      return;
    }

    if (!targetRect) {
      setTooltipStyle({
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      setArrowStyle({ display: "none" });
      return;
    }

    const tooltipWidth = 340;
    const tooltipHeight = 200;
    const gap = 14;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    // Target center in viewport coords
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetTop = targetRect.top - window.scrollY;
    const targetBottom = targetTop + targetRect.height;

    // Decide best position
    let pos = step.position;
    const spaceBelow = viewH - targetBottom;
    const spaceAbove = targetTop;

    if (pos === "bottom" && spaceBelow < tooltipHeight + gap && spaceAbove > tooltipHeight + gap) {
      pos = "top";
    } else if (pos === "top" && spaceAbove < tooltipHeight + gap && spaceBelow > tooltipHeight + gap) {
      pos = "bottom";
    }

    let top = 0;
    let left = 0;

    if (pos === "bottom") {
      top = targetRect.top + targetRect.height + gap;
      left = targetCenterX - tooltipWidth / 2;
      setArrowDirection("top");
    } else if (pos === "top") {
      top = targetRect.top - tooltipHeight - gap;
      left = targetCenterX - tooltipWidth / 2;
      setArrowDirection("bottom");
    } else if (pos === "right") {
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left + targetRect.width + gap;
      setArrowDirection("left");
    } else if (pos === "left") {
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left - tooltipWidth - gap;
      setArrowDirection("right");
    }

    // Clamp to viewport
    left = Math.max(12, Math.min(left, viewW - tooltipWidth - 12));
    top = Math.max(12, Math.min(top, viewH + window.scrollY - tooltipHeight - 12));

    setTooltipStyle({
      top,
      left,
      position: "absolute",
    });

    // Arrow pointing toward target
    const arrowSize = 8;
    if (pos === "bottom") {
      setArrowStyle({
        position: "absolute",
        top: -arrowSize,
        left: Math.max(20, Math.min(targetCenterX - left, tooltipWidth - 20)),
        transform: "translateX(-50%)",
      });
    } else if (pos === "top") {
      setArrowStyle({
        position: "absolute",
        bottom: -arrowSize,
        left: Math.max(20, Math.min(targetCenterX - left, tooltipWidth - 20)),
        transform: "translateX(-50%)",
      });
    } else if (pos === "right") {
      setArrowStyle({
        position: "absolute",
        left: -arrowSize,
        top: "50%",
        transform: "translateY(-50%)",
      });
    } else if (pos === "left") {
      setArrowStyle({
        position: "absolute",
        right: -arrowSize,
        top: "50%",
        transform: "translateY(-50%)",
      });
    }
  }, [isActive, targetRect, isCenterModal, step, currentStep]);

  // Measure on step change and window resize/scroll
  useEffect(() => {
    if (!isActive) return;
    measureTarget();

    const handleResize = () => measureTarget();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isActive, currentStep, measureTarget]);

  // Animation on step change
  useEffect(() => {
    if (!isActive) return;
    setAnimating(true);
    const timer = setTimeout(() => setAnimating(false), 250);
    return () => clearTimeout(timer);
  }, [currentStep, isActive]);

  if (!isActive || !step) return null;

  const handleNext = () => {
    if (isLast) {
      completeTour();
    } else {
      nextStep();
    }
  };

  // Build spotlight clip path for non-center steps
  const getClipPath = () => {
    if (isCenterModal || !targetRect) return "none";

    const scrollY = window.scrollY;
    const t = targetRect.top - scrollY;
    const l = targetRect.left;
    const w = targetRect.width;
    const h = targetRect.height;
    const r = 12;

    // Outer rect (full screen) with inner rounded-rect cutout
    return `polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
      ${l + r}px ${t}px,
      ${l}px ${t + r}px,
      ${l}px ${t + h - r}px,
      ${l + r}px ${t + h}px,
      ${l + w - r}px ${t + h}px,
      ${l + w}px ${t + h - r}px,
      ${l + w}px ${t + r}px,
      ${l + w - r}px ${t}px,
      ${l + r}px ${t}px
    )`;
  };

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        pointerEvents: "auto",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          clipPath: getClipPath(),
          transition: "clip-path 0.3s ease",
        }}
        onClick={skipTour}
      />

      {/* Spotlight ring for non-center steps */}
      {!isCenterModal && targetRect && (
        <div
          style={{
            position: "absolute",
            top: targetRect.top - window.scrollY,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            borderRadius: 12,
            boxShadow: "0 0 0 4px rgba(13, 148, 136, 0.4), 0 0 20px rgba(13, 148, 136, 0.15)",
            transition: "all 0.3s ease",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={{
          ...tooltipStyle,
          position: isCenterModal ? "fixed" : "absolute",
          width: isCenterModal ? "min(420px, calc(100vw - 32px))" : 340,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
          padding: isCenterModal ? "32px 28px" : "20px 20px 16px",
          zIndex: 61,
          opacity: animating ? 0 : 1,
          transform: animating
            ? isCenterModal
              ? "translate(-50%, -50%) scale(0.95)"
              : "translateY(8px)"
            : isCenterModal
            ? "translate(-50%, -50%) scale(1)"
            : "translateY(0)",
          transition: "opacity 0.25s ease, transform 0.25s ease",
        }}
      >
        {/* Arrow */}
        {!isCenterModal && (
          <div
            style={{
              ...arrowStyle,
              width: 0,
              height: 0,
              ...(arrowDirection === "top"
                ? {
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderBottom: "8px solid var(--card)",
                  }
                : arrowDirection === "bottom"
                ? {
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderTop: "8px solid var(--card)",
                  }
                : arrowDirection === "left"
                ? {
                    borderTop: "8px solid transparent",
                    borderBottom: "8px solid transparent",
                    borderRight: "8px solid var(--card)",
                  }
                : {
                    borderTop: "8px solid transparent",
                    borderBottom: "8px solid transparent",
                    borderLeft: "8px solid var(--card)",
                  }),
            }}
          />
        )}

        {/* Step counter chip */}
        {!isCenterModal && (
          <div
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--teal)",
              background: "color-mix(in srgb, var(--teal) 10%, transparent)",
              borderRadius: 20,
              padding: "3px 10px",
              marginBottom: 10,
            }}
          >
            Step {currentStep + 1} of {totalSteps}
          </div>
        )}

        {/* Title */}
        <h3
          style={{
            margin: 0,
            fontSize: isCenterModal ? 22 : 17,
            fontWeight: 800,
            color: "var(--text)",
            marginBottom: 8,
            textAlign: isCenterModal ? "center" : "left",
          }}
        >
          {step.title}
        </h3>

        {/* Description */}
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.6,
            color: "var(--text-sec)",
            marginBottom: 20,
            textAlign: isCenterModal ? "center" : "left",
          }}
        >
          {step.description}
        </p>

        {/* Progress dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            marginBottom: 16,
          }}
        >
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentStep ? 20 : 7,
                height: 7,
                borderRadius: 4,
                background:
                  i === currentStep
                    ? "var(--teal)"
                    : i < currentStep
                    ? "color-mix(in srgb, var(--teal) 40%, transparent)"
                    : "var(--border)",
                transition: "all 0.25s ease",
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: isCenterModal ? "center" : "space-between",
            alignItems: "center",
          }}
        >
          {isFirst || isLast ? (
            <>
              {!isLast && (
                <button
                  onClick={skipTour}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Skip Tour
                </button>
              )}
              <button
                onClick={handleNext}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--navy)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isFirst ? "Start Tour" : "Get Started"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={skipTour}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  color: "var(--text-muted)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={prevStep}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-sec)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: "var(--navy)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
