// src/shared/components/ui/badge.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-raff-primary text-white",
        secondary:
          "border-transparent bg-raff-neutral-200 text-raff-neutral-900",
        accent:
          "border-transparent bg-raff-accent text-white",
        success:
          "border-transparent bg-raff-success text-white",
        warning:
          "border-transparent bg-raff-warning text-white",
        error:
          "border-transparent bg-raff-error text-white",
        outline:
          "text-raff-primary border-raff-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
