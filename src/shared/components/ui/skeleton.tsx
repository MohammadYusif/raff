// src/shared/components/ui/skeleton-enhanced.tsx
"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  variant?: "pulse" | "shimmer";
  speed?: "slow" | "normal" | "fast";
}

/**
 * Enhanced Skeleton Component with Shimmer Effect
 *
 * @example
 * // Pulse animation (default)
 * <Skeleton variant="shimmer" className="h-4 w-32" />
 *
 * @example
 * // Shimmer animation
 * <Skeleton variant="shimmer" className="h-4 w-32" />
 */
export function Skeleton({
  className,
  variant = "shimmer",
  speed = "normal",
  ...props
}: SkeletonProps) {
  const speeds = {
    slow: 3,
    normal: 2,
    fast: 1.5,
  };

  if (variant === "shimmer") {
    return (
      <motion.div
        className={cn(
          "relative overflow-hidden rounded-md bg-raff-neutral-200",
          className
        )}
        {...props}
      >
        <motion.div
          className="absolute inset-0 from-transparent via-white/40 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            repeat: Infinity,
            duration: speeds[speed],
            ease: "linear",
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn("rounded-md bg-raff-neutral-200", className)}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0.5 }}
      transition={{
        repeat: Infinity,
        repeatType: "reverse",
        duration: speeds[speed] / 2,
        ease: "easeInOut",
      }}
      {...props}
    />
  );
}

/**
 * Product Card Skeleton
 *
 * Pre-built skeleton for product cards
 */
export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-raff-neutral-200 bg-white">
      <Skeleton variant="shimmer" className="aspect-square w-full" />
      <div className="space-y-3 p-4">
        <Skeleton variant="shimmer" className="h-4 w-2/3" />
        <Skeleton variant="shimmer" className="h-5 w-full" />
        <Skeleton variant="shimmer" className="h-6 w-1/2" />
        <Skeleton variant="shimmer" className="h-10 w-full" />
      </div>
    </div>
  );
}

/**
 * Text Skeleton
 *
 * Pre-built skeleton for text lines
 */
interface TextSkeletonProps {
  lines?: number;
  className?: string;
}

export function TextSkeleton({ lines = 3, className = "" }: TextSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="shimmer"
          className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

/**
 * Avatar Skeleton
 *
 * Circular skeleton for avatars
 */
interface AvatarSkeletonProps {
  size?: "sm" | "md" | "lg";
}

export function AvatarSkeleton({ size = "md" }: AvatarSkeletonProps) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <Skeleton variant="shimmer" className={cn("rounded-full", sizes[size])} />
  );
}

/**
 * Table Skeleton
 *
 * Pre-built skeleton for tables
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="shimmer" className="h-4" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="shimmer" className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}
