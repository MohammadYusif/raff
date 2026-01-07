// src/shared/components/SearchInput.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, X, Loader2, Package } from "lucide-react";
import Image from "next/image";
import { Input } from "@/shared/components/ui";
import { cn, formatPrice, debounce, getLocalizedText } from "@/lib/utils";
import Link from "next/link";
import { AnimatedButton } from "@/shared/components/AnimatedButton";

interface SearchSuggestion {
  id: string;
  slug: string;
  title: string;
  titleAr: string | null;
  price: number;
  thumbnail: string | null;
  category: {
    name: string;
    nameAr: string | null;
    slug: string;
  } | null;
}

interface SearchInputProps {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  size?: "sm" | "md" | "lg";
  showSuggestions?: boolean;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
  autoSubmit?: boolean; // Auto-submit after typing stops
  initialValue?: string; // Pre-fill input with value
}

export function SearchInput({
  placeholder,
  className,
  inputClassName,
  size = "md",
  showSuggestions = true,
  autoFocus = false,
  onSearch,
  autoSubmit = false,
  initialValue = "",
}: SearchInputProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("search");
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const latestQueryRef = useRef(query);
  const showSuggestionsRef = useRef(showSuggestions);

  useEffect(() => {
    latestQueryRef.current = query;
  }, [query]);

  useEffect(() => {
    showSuggestionsRef.current = showSuggestions;
  }, [showSuggestions]);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      requestIdRef.current += 1;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  const fetchSuggestions = useMemo(
    () =>
      debounce(async (searchQuery: string) => {
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery || !showSuggestionsRef.current) {
          setSuggestions([]);
          setIsLoading(false);
          return;
        }

        if (trimmedQuery !== latestQueryRef.current.trim()) {
          return;
        }

        if (abortRef.current) {
          abortRef.current.abort();
        }
        requestIdRef.current += 1;
        const requestId = requestIdRef.current;
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);

        try {
          const response = await fetch(
            `/api/search?q=${encodeURIComponent(searchQuery)}&mode=suggestions&limit=5`,
            { signal: controller.signal }
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch suggestions: ${response.status}`);
          }

          const data = await response.json();
          if (
            controller.signal.aborted ||
            requestId !== requestIdRef.current
          ) {
            return;
          }
          const nextSuggestions = Array.isArray(data.suggestions)
            ? data.suggestions
            : [];
          setSuggestions(nextSuggestions);
          setIsOpen(true);
        } catch (error) {
          if ((error as Error).name === "AbortError") {
            return;
          }
          console.error("Failed to fetch suggestions:", error);
          setSuggestions([]);
        } finally {
          if (
            !controller.signal.aborted &&
            requestId === requestIdRef.current
          ) {
            setIsLoading(false);
          }
        }
      }, 300),
    []
  );

  useEffect(() => {
    if (!showSuggestions) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      requestIdRef.current += 1;
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    if (query.trim().length > 0) {
      fetchSuggestions(query);
    } else {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      requestIdRef.current += 1;
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
    }
  }, [query, showSuggestions, fetchSuggestions]);

  // Auto-submit after user stops typing (for search page)
  useEffect(() => {
    if (!autoSubmit) return;

    const timer = setTimeout(() => {
      if (query.trim().length > 0) {
        if (onSearch) {
          onSearch(query);
        } else {
          router.push(`/products?search=${encodeURIComponent(query.trim())}`);
        }
      }
    }, 1000); // Wait 1 second after typing stops

    return () => clearTimeout(timer);
  }, [query, autoSubmit, onSearch, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      if (onSearch) {
        onSearch(query);
      } else {
        router.push(`/products?search=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleSuggestionClick = (slug: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/products/${encodeURIComponent(slug)}`);
  };

  const sizeClasses = {
    sm: "h-9 text-sm",
    md: "h-10 text-base",
    lg: "h-12 text-lg",
  };

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="relative">
        {/* Search Icon */}
        <Search
          className={cn(
            "absolute start-3 top-1/2 -translate-y-1/2 text-raff-neutral-400",
            size === "sm" && "h-4 w-4",
            size === "md" && "h-5 w-5",
            size === "lg" && "h-6 w-6"
          )}
        />

        {/* Input */}
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            sizeClasses[size],
            "w-full pe-10 ps-10",
            inputClassName
          )}
        />

        {/* Loading / Clear Button */}
        <div className="absolute end-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-raff-neutral-400" />
          ) : query ? (
            <AnimatedButton
              type="button"
              onClick={handleClear}
              unstyled
              className="text-raff-neutral-400 hover:text-raff-neutral-600"
            >
              <X className="h-4 w-4" />
            </AnimatedButton>
          ) : null}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && isOpen && suggestions.length > 0 && (
        <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-lg border border-raff-neutral-200 bg-white shadow-lg">
          <div className="max-h-96 overflow-y-auto">
            {suggestions.map((suggestion) => {
              const productTitle = getLocalizedText(
                locale,
                suggestion.titleAr,
                suggestion.title
              );
              const categoryName = suggestion.category
                ? getLocalizedText(
                    locale,
                    suggestion.category.nameAr,
                    suggestion.category.name
                  )
                : null;

              return (
                <AnimatedButton
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion.slug)}
                  unstyled
                  className="flex w-full items-center gap-3 border-b border-raff-neutral-100 p-3 text-start transition-colors hover:bg-raff-neutral-50 last:border-b-0"
                >
                  {/* Product Thumbnail */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-raff-neutral-100">
                    {suggestion.thumbnail ? (
                      <Image
                        src={suggestion.thumbnail}
                        alt={productTitle}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-5 w-5 text-raff-neutral-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 line-clamp-1 text-sm font-semibold text-raff-primary">
                      {productTitle}
                    </div>
                    <div className="flex items-center gap-2">
                      {categoryName && (
                        <span className="text-xs text-raff-neutral-500">
                          {categoryName}
                        </span>
                      )}
                      <span className="text-xs font-bold text-raff-primary">
                        {formatPrice(suggestion.price, locale)}
                      </span>
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <div className="shrink-0 text-raff-neutral-400">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </AnimatedButton>
              );
            })}
          </div>

          {/* View All Results Link */}
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center gap-2 border-t border-raff-neutral-200 bg-raff-neutral-50 p-3 text-sm font-semibold text-raff-primary hover:bg-raff-neutral-100"
          >
            <Search className="h-4 w-4" />
            {locale === "ar"
              ? `عرض جميع النتائج لـ "${query}"`
              : `View all results for "${query}"`}
          </Link>
        </div>
      )}

      {/* No Results Message */}
      {showSuggestions &&
        isOpen &&
        !isLoading &&
        query.trim() &&
        suggestions.length === 0 && (
          <div className="absolute top-full z-50 mt-2 w-full rounded-lg border border-raff-neutral-200 bg-white p-4 text-center shadow-lg">
            <p className="text-sm text-raff-neutral-600">{t("noResults")}</p>
          </div>
        )}
    </div>
  );
}
