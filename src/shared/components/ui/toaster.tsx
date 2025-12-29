// src/shared/components/ui/toaster.tsx
"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: "var(--font-geist-sans)",
        },
        classNames: {
          toast: "rounded-lg shadow-lg border border-raff-neutral-200",
          title: "text-sm font-semibold",
          description: "text-sm text-raff-neutral-600",
          actionButton: "bg-raff-primary text-white hover:bg-raff-primary-dark",
          cancelButton:
            "bg-raff-neutral-200 text-raff-neutral-900 hover:bg-raff-neutral-300",
          closeButton:
            "bg-raff-neutral-100 hover:bg-raff-neutral-200 border-raff-neutral-200",
        },
      }}
    />
  );
}
