// src/shared/components/ui/button.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-raff-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-raff-primary text-white hover:bg-raff-primary-light hover:-translate-y-0.5 active:translate-y-0 shadow-sm hover:shadow-md",
        primary:
          "bg-raff-primary text-white hover:bg-raff-primary-dark hover:-translate-y-0.5 active:translate-y-0 shadow-sm hover:shadow-md",
        outline:
          "border-2 border-raff-primary text-raff-primary bg-transparent hover:bg-raff-primary hover:text-white hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "hover:bg-raff-neutral-100 hover:text-raff-primary active:bg-raff-neutral-200",
        link: "text-raff-primary underline-offset-4 hover:underline hover:text-raff-primary-dark",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
