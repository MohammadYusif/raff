// src/shared/components/PageTransition.tsx
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode, Children } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Page Transition Component
 *
 * Wraps page content with smooth fade + slide animations
 * Works with Next.js App Router
 *
 * @example
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 */
export function PageTransition({
  children,
  className = "",
}: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.3,
        ease: [0, 0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger Container
 *
 * Animates children with a stagger effect
 */
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.05,
}: StaggerContainerProps) {
  const shouldReduceMotion = useReducedMotion();
  const childCount = Children.count(children);
  const shouldStagger = !shouldReduceMotion && childCount < 100;

  if (!shouldStagger) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Fade In Wrapper
 *
 * Simple fade-in animation for any element
 */
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  className = "",
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        delay,
        duration,
        ease: [0, 0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Slide In Wrapper
 *
 * Slide + fade animation from specified direction
 */
interface SlideInProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
}

export function SlideIn({
  children,
  direction = "up",
  delay = 0,
  duration = 0.4,
  className = "",
}: SlideInProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        ...directions[direction],
      }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
      }}
      transition={{
        delay,
        duration,
        ease: [0, 0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scale In Wrapper
 *
 * Scale + fade animation
 */
interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function ScaleIn({
  children,
  delay = 0,
  duration = 0.3,
  className = "",
}: ScaleInProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.9,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        delay,
        duration,
        ease: [0, 0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
