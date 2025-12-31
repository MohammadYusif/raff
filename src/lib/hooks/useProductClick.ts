// src/lib/hooks/useProductClick.ts
"use client";

import { useState } from "react";

interface TrackClickResponse {
  success: boolean;
  trackingId: string | null;
  redirectUrl: string;
  expiresAt: string | null;
  qualified?: boolean;
  disqualifyReason?: string | null;
}

export function useProductClick() {
  const [isTracking, setIsTracking] = useState(false);

  const trackAndRedirect = async (productId: string) => {
    setIsTracking(true);

    try {
      const response = await fetch("/api/track/click", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to track click");
      }

      const data: TrackClickResponse = await response.json();

      // Redirect to the merchant destination
      window.location.href = data.redirectUrl;
    } catch (error) {
      console.error("Click tracking error:", error);
      // On error, still redirect but without tracking
      // You could add a fallback here
      alert("Failed to track click. Please try again.");
    } finally {
      setIsTracking(false);
    }
  };

  return { trackAndRedirect, isTracking };
}
