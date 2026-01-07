// src/lib/hooks/useMerchantApi.ts
"use client";

import { useState, useEffect, useCallback } from "react";

interface MerchantProfile {
  id: string;
  name: string;
  nameAr: string | null;
  email: string;
  phone: string | null;
  logo: string | null;
  description: string | null;
  descriptionAr: string | null;
  storeInfo: {
    platform: "zid" | "salla" | null;
    storeId: string | null;
    storeUrl: string | null;
    isConnected: boolean;
    lastSyncAt: Date | null;
    autoSyncEnabled: boolean;
  };
  // Individual platform connection status
  zidStoreId: string | null;
  zidStoreUrl: string | null;
  zidHasAccessToken: boolean;
  zidHasManagerToken: boolean;
  zidConnected: boolean;
  sallaStoreId: string | null;
  sallaStoreUrl: string | null;
  sallaHasAccessToken: boolean;
  sallaConnected: boolean;
  totalProducts: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MerchantStats {
  totalProducts: number;
  activeProducts: number;
  outOfStock: number;
  totalViews: number;
  totalClicks: number;
  clickThroughRate: number;
  totalOrders: number;
  recentOrders: number;
  ordersGrowth: number;
  totalRevenue: number;
  recentRevenue: number;
  revenueGrowth: number;
  currency: string;
  conversionRate: number;
  topProducts: Array<{
    id: string;
    title: string;
    titleAr: string | null;
    slug: string;
    views: number;
    clicks: number;
    orders: number;
    trendingScore: number;
    price: number;
    thumbnail: string | null;
  }>;
}

let cachedMerchantProfile: MerchantProfile | null = null;
let merchantProfilePromise: Promise<MerchantProfile | null> | null = null;

async function fetchMerchantProfile() {
  if (merchantProfilePromise) {
    return merchantProfilePromise;
  }

  merchantProfilePromise = (async () => {
    const response = await fetch("/api/merchant/profile");

    if (!response.ok) {
      throw new Error("Failed to fetch profile");
    }

    const data = await response.json();
    return (data?.merchant as MerchantProfile | null) ?? null;
  })();

  try {
    return await merchantProfilePromise;
  } finally {
    merchantProfilePromise = null;
  }
}

export function useMerchantProfile(enabled: boolean) {
  const [profile, setProfile] = useState<MerchantProfile | null>(
    cachedMerchantProfile
  );
  const [loading, setLoading] = useState(enabled && !cachedMerchantProfile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let isActive = true;

    async function loadProfile() {
      try {
        if (!cachedMerchantProfile) {
          setLoading(true);
        } else {
          setLoading(false);
        }

        const merchant = await fetchMerchantProfile();

        if (!isActive) return;

        if (merchant) {
          cachedMerchantProfile = merchant;
          setProfile(merchant);
        }
        setError(null);
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [enabled]);

  return { profile, loading, error };
}

export function useMerchantStats(enabled: boolean, days: number = 30) {
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/merchant/stats?days=${days}`);

      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [enabled, days]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { stats, loading, error, refetch };
}

export function useMerchantSync(enabled: boolean) {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<{
    lastSyncAt: Date | null;
    timeSinceSync: string | null;
    canSyncNow: boolean;
  } | null>(null);

  const fetchSyncStatus = useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await fetch(
        "/api/merchant/sync"
      );

      if (!response.ok) {
        throw new Error("Failed to fetch sync status");
      }

      const data = await response.json();
      setLastSync({
        lastSyncAt: data.lastSyncAt ? new Date(data.lastSyncAt) : null,
        timeSinceSync: data.timeSinceSync,
        canSyncNow: data.canSyncNow,
      });
    } catch (err) {
      console.error("Error fetching sync status:", err);
    }
  }, [enabled]);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  const triggerSync = async () => {
    if (!enabled) {
      setError("Unauthorized");
      return { success: false };
    }

    try {
      setSyncing(true);
      setError(null);

      const response = await fetch("/api/merchant/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Sync failed");
      }

      // Refresh sync status
      await fetchSyncStatus();

      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setSyncing(false);
    }
  };

  return {
    triggerSync,
    syncing,
    error,
    lastSync,
    refetchStatus: fetchSyncStatus,
  };
}
