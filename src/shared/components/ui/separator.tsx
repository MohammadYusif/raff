// src/shared/components/ui/separator.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <div
      ref={ref}
      role={decorative ? "none" : "separator"}
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-raff-neutral-200",
        orientation === "horizontal" ? " w-full" : "h-full ",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

export { Separator };
