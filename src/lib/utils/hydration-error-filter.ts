// src/lib/utils/hydration-error-filter.ts
/**
 * Hydration Error Filter
 *
 * Filters out hydration errors caused by browser extensions
 * while preserving real hydration errors that need attention.
 *
 * Usage: Call this in your root layout's useEffect
 */

export function filterHydrationErrors() {
  if (typeof window === "undefined") return;

  const originalError = console.error;
  const originalWarn = console.warn;

  // Known browser extension attributes that cause hydration warnings
  const extensionAttributes = [
    "fdprocessedid", // Form filler extensions
    "data-lastpass-icon-root", // LastPass
    "data-dashlane-rid", // Dashlane
    "data-dashlane-label", // Dashlane
    "data-1p-ignore", // 1Password
    "data-form-type", // Generic form extensions
    "data-kwimpalastatus", // Keeper Password Manager
    "data-com-onepassword-", // 1Password
    "data-bwignore", // Bitwarden
  ];

  /**
   * Check if an error message is related to browser extensions
   */
  const isExtensionRelatedError = (message: string): boolean => {
    return extensionAttributes.some((attr) => message.includes(attr));
  };

  /**
   * Check if this is a hydration-related message
   */
  const isHydrationMessage = (message: string): boolean => {
    return (
      message.includes("Hydration") ||
      message.includes("did not match") ||
      message.includes("hydrat") ||
      message.includes("server HTML") ||
      message.includes("client-side")
    );
  };

  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || "";

    // Only filter hydration errors caused by extensions
    if (isHydrationMessage(message) && isExtensionRelatedError(message)) {
      // Suppress this error - it's from a browser extension
      return;
    }

    // Let all other errors through (including real hydration errors)
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || "";

    // Only filter hydration warnings caused by extensions
    if (isHydrationMessage(message) && isExtensionRelatedError(message)) {
      // Suppress this warning
      return;
    }

    // Let all other warnings through
    originalWarn.apply(console, args);
  };

  // Log that the filter is active (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log(
      "%c[Raff] Hydration error filter active",
      "color: #00C48C; font-weight: bold"
    );
    console.log(
      "%cBrowser extension hydration errors will be suppressed",
      "color: #666; font-size: 11px"
    );
  }
}

/**
 * Alternative: Use this if you want to log suppressed errors
 * instead of completely hiding them
 */
export function filterHydrationErrorsWithLogging() {
  if (typeof window === "undefined") return;

  const originalError = console.error;
  const extensionAttributes = [
    "fdprocessedid",
    "data-lastpass-icon-root",
    "data-dashlane-rid",
    "data-1p-ignore",
    "data-form-type",
  ];

  const suppressedErrors: string[] = [];

  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || "";

    const isHydration =
      message.includes("Hydration") || message.includes("did not match");
    const isExtension = extensionAttributes.some((attr) =>
      message.includes(attr)
    );

    if (isHydration && isExtension) {
      suppressedErrors.push(message);

      // Log once every 10 suppressions
      if (suppressedErrors.length % 10 === 0) {
        console.log(
          `%c[Raff] Suppressed ${suppressedErrors.length} browser extension hydration errors`,
          "color: #999; font-size: 10px"
        );
      }
      return;
    }

    originalError.apply(console, args);
  };

  // Expose count for debugging
  if (process.env.NODE_ENV === "development") {
    (window as any).__raffSuppressedHydrationErrors = suppressedErrors;
  }
}
