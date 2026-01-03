// src/shared/components/AnimatedButton.tsx
"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { MouseEvent, useState } from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/shared/components/ui/button";

interface Ripple {
  x: number;
  y: number;
  size: number;
  key: number;
}

interface AnimatedButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref">,
    VariantProps<typeof buttonVariants> {
  enableRipple?: boolean;
  unstyled?: boolean;
  children: React.ReactNode;
}

/**
 * Animated Button Component
 *
 * Features:
 * - Press animation (scale down on click)
 * - Ripple effect on click
 * - Smooth transitions
 * - Accessible
 *
 * @example
 * <AnimatedButton onClick={handleClick}>
 *   Click Me
 * </AnimatedButton>
 */
export function AnimatedButton({
  variant,
  size,
  enableRipple = true,
  unstyled = false,
  className,
  children,
  onClick,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    // Create ripple effect
    if (enableRipple) {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const newRipple: Ripple = {
        x,
        y,
        size,
        key: Date.now(),
      };

      setRipples([...ripples, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.key !== newRipple.key));
      }, 600);
    }

    // Call original onClick handler
    onClick?.(e);
  };

  return (
    <motion.button
      className={cn(
        "relative overflow-hidden",
        unstyled
          ? cn(
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-raff-primary focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className
            )
          : buttonVariants({ variant, size, className })
      )}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ duration: 0.1 }}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.key}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}

      {/* Button content */}
      {children}
    </motion.button>
  );
}

/**
 * Icon Button with Animation
 *
 * Circular button for icon-only actions
 */
interface AnimatedIconButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref"> {
  icon: React.ReactNode;
  ariaLabel: string;
  size?: "sm" | "md" | "lg";
}

export function AnimatedIconButton({
  icon,
  ariaLabel,
  size = "md",
  className,
  onClick,
  disabled,
  ...props
}: AnimatedIconButtonProps) {
  const sizeStyles = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <motion.button
      className={cn(
        "flex items-center justify-center rounded-full",
        "bg-raff-primary text-white",
        "hover:bg-raff-primary-dark",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-raff-primary focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors duration-200",
        sizeStyles[size],
        className
      )}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      {...props}
    >
      {icon}
    </motion.button>
  );
}

/**
 * Floating Action Button
 *
 * Animated FAB with hover and tap effects
 */
interface FloatingActionButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref"> {
  icon: React.ReactNode;
  label?: string;
  position?: "bottom-right" | "bottom-left";
}

export function FloatingActionButton({
  icon,
  label,
  position = "bottom-right",
  className,
  onClick,
  ...props
}: FloatingActionButtonProps) {
  const positionStyles = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
  };

  return (
    <motion.button
      className={cn(
        "fixed z-50 flex items-center gap-2 rounded-full",
        "bg-raff-primary text-white shadow-lg",
        "hover:bg-raff-primary-dark hover:shadow-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-raff-primary focus-visible:ring-offset-2",
        "transition-all duration-200",
        label ? "px-6 py-3" : "h-14 w-14 justify-center",
        positionStyles[position],
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      onClick={onClick}
      {...props}
    >
      {icon}
      {label && <span className="font-medium">{label}</span>}
    </motion.button>
  );
}
