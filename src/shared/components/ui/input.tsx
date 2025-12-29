// src/shared/components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-raff-neutral-300 bg-white px-3 py-2 text-sm transition-all duration-200",
          "placeholder:text-raff-neutral-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-raff-accent focus-visible:ring-offset-2 focus-visible:border-raff-accent focus-visible:-translate-y-0.5 focus-visible:shadow-md",
          "hover:border-raff-neutral-400",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
