// src/shared/components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-raff-neutral-300 bg-white px-3 py-2 text-sm transition-all duration-200",
          "placeholder:text-raff-neutral-400",
          "focus:border-raff-primary focus:outline-none focus:ring-2 focus:ring-raff-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-raff-neutral-400",
          className
        )}
        ref={ref}
        suppressHydrationWarning
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
