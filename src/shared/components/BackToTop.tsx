// src/shared/components/BackToTop.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";

interface BackToTopProps {
  showAfter?: number; // Scroll position in pixels to show button
  className?: string;
}

/**
 * Back to Top Button Component
 *
 * Features:
 * - Appears after scrolling down
 * - Smooth scroll to top
 * - Fade + scale animation
 * - Pulse animation on hover
 *
 * @example
 * <BackToTop showAfter={300} />
 */
export function BackToTop({ showAfter = 300, className = "" }: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > showAfter) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    // Check initial scroll position
    toggleVisibility();

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, [showAfter]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={
            shouldReduceMotion ? false : { opacity: 0, scale: 0.8, y: 20 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={
            shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 20 }
          }
          whileHover={
            shouldReduceMotion
              ? undefined
              : {
                  scale: 1.1,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2)",
                }
          }
          whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  duration: 0.3,
                  ease: [0, 0, 0.2, 1],
                }
          }
          onClick={scrollToTop}
          className={`fixed bottom-6 end-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-raff-primary text-white shadow-lg transition-all hover:bg-raff-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-raff-primary focus-visible:ring-offset-2 ${className}`}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/**
 * Scroll Progress Indicator
 *
 * Shows reading progress as a horizontal bar at top of page
 */
export function ScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollPx = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const totalDocScrollLength = docHeight - windowHeight;
      const scrollPosition = Math.floor(
        (scrollPx / totalDocScrollLength) * 100
      );

      setScrollProgress(scrollPosition);
    };

    window.addEventListener("scroll", updateScrollProgress);
    updateScrollProgress();

    return () => {
      window.removeEventListener("scroll", updateScrollProgress);
    };
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-raff-primary/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: scrollProgress > 0 ? 1 : 0 }}
    >
      <motion.div
        className="h-full bg-raff-primary"
        style={{ width: `${scrollProgress}%` }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.1 }}
      />
    </motion.div>
  );
}

/**
 * Scroll Reveal Component
 *
 * Reveals children when scrolled into view
 */
interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  className?: string;
}

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  className = "",
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldReduceMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    const element = elementRef.current;
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [delay, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const directions = {
    up: { y: 40 },
    down: { y: -40 },
    left: { x: 40 },
    right: { x: -40 },
  };

  return (
    <motion.div
      ref={elementRef}
      initial={{
        opacity: 0,
        ...directions[direction],
      }}
      animate={
        isVisible
          ? {
              opacity: 1,
              x: 0,
              y: 0,
            }
          : {}
      }
      transition={{
        delay,
        duration: 0.6,
        ease: [0, 0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
