"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  Users,
  Store,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Eye,
  MousePointerClick,
  Home,
  Globe,
  Terminal,
  Filter,
  X,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  Trash2,
  Pause,
  Play,
  RefreshCw,
  Zap,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Bell,
  Database,
  Loader2,
} from "lucide-react";
import { useLocale as useLocaleHook } from "@/core/i18n/hooks/useLocale";
import { AnimatedButton } from "@/shared/components/AnimatedButton";
import { toast } from "sonner";

interface AdminAnalytics {
  overview: {
    totalMerchants: number;
    activeMerchants: number;
    pendingMerchants: number;
    merchantsGrowth: number;
    totalProducts: number;
    activeProducts: number;
    productsGrowth: number;
    totalUsers: number;
    totalOrders: number;
    ordersGrowth: number;
    totalRevenue: number;
    revenueGrowth: number;
    totalClicks: number;
    clicksGrowth: number;
    totalViews: number;
    viewsGrowth: number;
    avgCTR: number;
    avgConversion: number;
    currency: string;
  };
  platformDistribution: {
    salla: number;
    zid: number;
    total: number;
  };
  clickQuality: {
    qualifiedClicks: number;
    totalClickEvents: number;
    qualityRate: number;
    disqualifiedReasons: Array<{ reason: string; count: number }>;
  };
  topMerchants: Array<{
    id: string;
    name: string;
    email: string;
    products: number;
    clicks: number;
    orders: number;
    revenue: number;
  }>;
  dailyStats: Array<{
    date: string;
    merchants: number;
    users: number;
    products: number;
    orders: number;
    revenue: number;
    clicks: number;
    views: number;
  }>;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  namespace: string;
  message: string;
  context?: Record<string, unknown>;
}

type LogFilter = "all" | "error" | "warn" | "info" | "debug" | "salla" | "zid" | "oauth" | "sync";

interface SystemHealth {
  database: "healthy" | "degraded" | "down";
  sallaApi: "healthy" | "degraded" | "down";
  zidApi: "healthy" | "degraded" | "down";
  lastSyncSalla: string | null;
  lastSyncZid: string | null;
  failedSyncsLast24h: number;
  oauthErrorsLast24h: number;
  pendingMerchants: number;
}

interface Alert {
  id: string;
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: Date;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

// System Health Summary Card
function SystemHealthCard({ health, t }: { health: SystemHealth | null; t: ReturnType<typeof useTranslations> }) {
  const getStatusIcon = (status: "healthy" | "degraded" | "down") => {
    switch (status) {
      case "healthy": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "degraded": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "down": return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: "healthy" | "degraded" | "down") => {
    switch (status) {
      case "healthy": return "text-green-600 bg-green-50";
      case "degraded": return "text-yellow-600 bg-yellow-50";
      case "down": return "text-red-600 bg-red-50";
    }
  };

  if (!health) {
    return (
      <div className="rounded-lg border border-raff-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-raff-neutral-400" />
          <span className="text-sm text-raff-neutral-500">{t("health.loading")}</span>
        </div>
      </div>
    );
  }

  const hasIssues = health.database !== "healthy" || health.sallaApi !== "healthy" || health.zidApi !== "healthy" || health.failedSyncsLast24h > 0 || health.oauthErrorsLast24h > 0;

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${hasIssues ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className={`h-5 w-5 ${hasIssues ? "text-yellow-600" : "text-green-600"}`} />
          <h3 className="font-semibold text-raff-neutral-900">{t("health.title")}</h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${hasIssues ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
          {hasIssues ? t("health.issues") : t("health.allGood")}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className={`rounded-lg p-2 ${getStatusColor(health.database)}`}>
          <div className="flex items-center gap-1.5">
            {getStatusIcon(health.database)}
            <span className="text-xs font-medium">{t("health.database")}</span>
          </div>
        </div>
        <div className={`rounded-lg p-2 ${getStatusColor(health.sallaApi)}`}>
          <div className="flex items-center gap-1.5">
            {getStatusIcon(health.sallaApi)}
            <span className="text-xs font-medium">Salla API</span>
          </div>
        </div>
        <div className={`rounded-lg p-2 ${getStatusColor(health.zidApi)}`}>
          <div className="flex items-center gap-1.5">
            {getStatusIcon(health.zidApi)}
            <span className="text-xs font-medium">Zid API</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-raff-neutral-600">
        {health.failedSyncsLast24h > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="h-3 w-3" />
            {t("health.failedSyncs", { count: health.failedSyncsLast24h })}
          </span>
        )}
        {health.oauthErrorsLast24h > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <AlertCircle className="h-3 w-3" />
            {t("health.oauthErrors", { count: health.oauthErrorsLast24h })}
          </span>
        )}
        {health.pendingMerchants > 0 && (
          <span className="flex items-center gap-1 text-yellow-600">
            <Clock className="h-3 w-3" />
            {t("health.pendingMerchants", { count: health.pendingMerchants })}
          </span>
        )}
      </div>
    </div>
  );
}

// Quick Actions Panel
function QuickActionsPanel({ t, onRefreshAnalytics }: { t: ReturnType<typeof useTranslations>; onRefreshAnalytics: () => void }) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const executeAction = async (action: string, endpoint: string, successMsg: string) => {
    setLoadingAction(action);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      if (response.ok) {
        toast.success(successMsg);
        if (action === "refresh") onRefreshAnalytics();
      } else {
        const data = await response.json();
        toast.error(data.error || t("quickActions.error"));
      }
    } catch {
      toast.error(t("quickActions.error"));
    } finally {
      setLoadingAction(null);
    }
  };

  const actions = [
    {
      id: "refresh",
      icon: RefreshCw,
      label: t("quickActions.refresh"),
      color: "bg-blue-500 hover:bg-blue-600",
      onClick: () => {
        setLoadingAction("refresh");
        onRefreshAnalytics();
        setTimeout(() => {
          setLoadingAction(null);
          toast.success(t("quickActions.refreshSuccess"));
        }, 1000);
      },
    },
    {
      id: "syncAll",
      icon: RefreshCw,
      label: t("quickActions.syncAll"),
      color: "bg-green-500 hover:bg-green-600",
      onClick: () => executeAction("syncAll", "/api/admin/sync-all", t("quickActions.syncAllSuccess")),
    },
    {
      id: "calculateTrending",
      icon: TrendingUp,
      label: t("quickActions.calculateTrending"),
      color: "bg-purple-500 hover:bg-purple-600",
      onClick: () => executeAction("calculateTrending", "/api/admin/calculate-trending", t("quickActions.trendingSuccess")),
    },
    {
      id: "clearCache",
      icon: Database,
      label: t("quickActions.clearCache"),
      color: "bg-orange-500 hover:bg-orange-600",
      onClick: () => executeAction("clearCache", "/api/admin/clear-cache", t("quickActions.cacheCleared")),
    },
  ];

  return (
    <div className="rounded-lg border border-raff-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-raff-primary" />
        <h3 className="font-semibold text-raff-neutral-900">{t("quickActions.title")}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={loadingAction !== null}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${action.color}`}
          >
            {loadingAction === action.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <action.icon className="h-4 w-4" />
            )}
            <span className="truncate">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Alerts Panel
function AlertsPanel({ alerts, t }: { alerts: Alert[]; t: ReturnType<typeof useTranslations> }) {
  const getAlertStyle = (type: Alert["type"]) => {
    switch (type) {
      case "error": return "border-red-200 bg-red-50";
      case "warning": return "border-yellow-200 bg-yellow-50";
      case "info": return "border-blue-200 bg-blue-50";
    }
  };

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="font-medium text-green-700">{t("alerts.noAlerts")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-raff-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-5 w-5 text-raff-primary" />
        <h3 className="font-semibold text-raff-neutral-900">{t("alerts.title")}</h3>
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          {alerts.length}
        </span>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {alerts.map((alert) => (
          <div key={alert.id} className={`rounded-lg border p-3 ${getAlertStyle(alert.type)}`}>
            <div className="flex items-start gap-2">
              {getAlertIcon(alert.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-raff-neutral-900">{alert.title}</p>
                <p className="text-xs text-raff-neutral-600 mt-0.5">{alert.message}</p>
                <p className="text-xs text-raff-neutral-400 mt-1">
                  {alert.timestamp.toLocaleTimeString()}
                </p>
              </div>
              {alert.action && (
                alert.action.href ? (
                  <Link
                    href={alert.action.href}
                    className="shrink-0 rounded bg-white px-2 py-1 text-xs font-medium text-raff-primary hover:bg-raff-neutral-50"
                  >
                    {alert.action.label}
                  </Link>
                ) : (
                  <button
                    onClick={alert.action.onClick}
                    className="shrink-0 rounded bg-white px-2 py-1 text-xs font-medium text-raff-primary hover:bg-raff-neutral-50"
                  >
                    {alert.action.label}
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Console Log Viewer Component
function ConsoleViewer() {
  const t = useTranslations("adminDashboard");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>("all");
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Simulate real-time logs (in production, this would connect to a WebSocket or SSE endpoint)
  useEffect(() => {
    if (isPaused) return;

    // Poll for logs every 2 seconds
    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/admin/logs?limit=100");
        if (response.ok) {
          const data = await response.json();
          if (data.logs) {
            setLogs(data.logs.map((log: LogEntry & { timestamp: string }) => ({
              ...log,
              timestamp: new Date(log.timestamp),
            })));
          }
        }
      } catch {
        // Silently fail - logs endpoint might not exist yet
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const filteredLogs = useMemo(() => {
    if (filter === "all") return logs;
    if (["error", "warn", "info", "debug"].includes(filter)) {
      return logs.filter((log) => log.level === filter);
    }
    // Platform/namespace filters
    return logs.filter((log) =>
      log.namespace.toLowerCase().includes(filter) ||
      log.message.toLowerCase().includes(filter)
    );
  }, [logs, filter]);

  const clearLogs = () => setLogs([]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warn": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
      case "debug": return <Bug className="h-4 w-4 text-gray-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error": return "bg-red-50 border-red-200 text-red-800";
      case "warn": return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "info": return "bg-blue-50 border-blue-200 text-blue-800";
      case "debug": return "bg-gray-50 border-gray-200 text-gray-600";
      default: return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const filters: { value: LogFilter; label: string }[] = [
    { value: "all", label: t("console.filters.all") },
    { value: "error", label: t("console.filters.errors") },
    { value: "warn", label: t("console.filters.warnings") },
    { value: "info", label: t("console.filters.info") },
    { value: "salla", label: "Salla" },
    { value: "zid", label: "Zid" },
    { value: "oauth", label: "OAuth" },
    { value: "sync", label: t("console.filters.sync") },
  ];

  return (
    <div className="rounded-lg border border-raff-neutral-200 bg-raff-neutral-900 shadow-sm">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-raff-neutral-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-green-400" />
          <h3 className="font-semibold text-white">{t("console.title")}</h3>
          <span className="rounded-full bg-raff-neutral-700 px-2 py-0.5 text-xs text-raff-neutral-300">
            {filteredLogs.length} {t("console.entries")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`rounded p-1.5 transition-colors ${
              isPaused ? "bg-green-600 text-white" : "bg-raff-neutral-700 text-raff-neutral-300 hover:bg-raff-neutral-600"
            }`}
            title={isPaused ? t("console.resume") : t("console.pause")}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            onClick={clearLogs}
            className="rounded bg-raff-neutral-700 p-1.5 text-raff-neutral-300 transition-colors hover:bg-raff-neutral-600"
            title={t("console.clear")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded bg-raff-neutral-700 p-1.5 text-raff-neutral-300 transition-colors hover:bg-raff-neutral-600"
          >
            {isExpanded ? <X className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 border-b border-raff-neutral-700 px-4 py-2">
            <Filter className="h-4 w-4 text-raff-neutral-400" />
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-raff-primary text-white"
                    : "bg-raff-neutral-700 text-raff-neutral-300 hover:bg-raff-neutral-600"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Log Entries */}
          <div className="max-h-80 overflow-y-auto p-2 font-mono text-sm">
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-raff-neutral-500">
                <p>{t("console.noLogs")}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 rounded border px-2 py-1.5 ${getLevelColor(log.level)}`}
                  >
                    {getLevelIcon(log.level)}
                    <span className="shrink-0 text-xs text-raff-neutral-500">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    <span className="shrink-0 rounded bg-raff-neutral-200 px-1.5 py-0.5 text-xs font-medium">
                      {log.namespace}
                    </span>
                    <span className="flex-1 break-all">{log.message}</span>
                    {log.context && Object.keys(log.context).length > 0 && (
                      <details className="shrink-0">
                        <summary className="cursor-pointer text-xs text-raff-neutral-500 hover:text-raff-neutral-700">
                          +{Object.keys(log.context).length}
                        </summary>
                        <pre className="mt-1 max-w-xs overflow-auto rounded bg-white/50 p-1 text-xs">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function AdminDashboardContent() {
  const t = useTranslations("adminDashboard");
  const locale = useLocale();
  const { switchLocale } = useLocaleHook();
  const isRtl = locale === "ar";

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?range=${range}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch admin analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [range]);

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/health");
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch {
      // Health check failed - set degraded state
      setHealth({
        database: "degraded",
        sallaApi: "degraded",
        zidApi: "degraded",
        lastSyncSalla: null,
        lastSyncZid: null,
        failedSyncsLast24h: 0,
        oauthErrorsLast24h: 0,
        pendingMerchants: 0,
      });
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/alerts");
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts.map((a: Alert & { timestamp: string }) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        })));
      }
    } catch {
      // Alerts fetch failed silently
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    fetchHealth();
    fetchAlerts();
    // Refresh health and alerts every 30 seconds
    const interval = setInterval(() => {
      fetchHealth();
      fetchAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchAlerts]);

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US").format(num);
  }, [locale]);

  const formatCurrency = useCallback((amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, [locale]);

  const formatPercent = useCallback((num: number) => {
    const sign = num >= 0 ? "+" : "";
    return `${sign}${num.toFixed(1)}%`;
  }, []);

  if (loading || !analytics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-raff-neutral-50">
        <div className="text-lg text-raff-neutral-600">{t("loading")}</div>
      </div>
    );
  }

  const { overview, platformDistribution, clickQuality, topMerchants } = analytics;

  const StatCard = ({
    title,
    value,
    growth,
    icon: Icon,
    color,
  }: {
    title: string;
    value: string | number;
    growth?: number;
    icon: typeof Users;
    color: string;
  }) => (
    <div className="rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-raff-neutral-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-raff-neutral-900">{value}</p>
          {growth !== undefined && (
            <p
              className={`mt-2 text-sm font-medium ${
                growth >= 0 ? "text-raff-success" : "text-raff-error"
              }`}
            >
              {formatPercent(growth)} {t("stats.fromLastPeriod")}
            </p>
          )}
        </div>
        <div className={`rounded-full p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-raff-neutral-50 p-8 ${isRtl ? "rtl" : "ltr"}`} dir={isRtl ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-raff-neutral-900">{t("title")}</h1>
            <p className="mt-2 text-raff-neutral-600">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <AnimatedButton
              variant="outline"
              size="sm"
              onClick={() => switchLocale(locale === "ar" ? "en" : "ar")}
              className="gap-2"
            >
              <Globe className="h-4 w-4" />
              {locale === "ar" ? "English" : "العربية"}
            </AnimatedButton>

            {/* Back to Home */}
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-raff-neutral-700 shadow-sm transition-colors hover:bg-raff-neutral-100"
            >
              <Home className="h-4 w-4" />
              <span>{t("backToHome")}</span>
            </Link>
          </div>
        </div>

        {/* Mobile-First: Health, Quick Actions, Alerts */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <SystemHealthCard health={health} t={t} />
          <QuickActionsPanel t={t} onRefreshAnalytics={fetchAnalytics} />
          <AlertsPanel alerts={alerts} t={t} />
        </div>

        {/* Time Range Selector */}
        <div className="mb-6 flex gap-2">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                range === r
                  ? "bg-raff-primary text-white"
                  : "bg-white text-raff-neutral-700 hover:bg-raff-neutral-100"
              }`}
            >
              {t(`timeRange.${r}`)}
            </button>
          ))}
        </div>

        {/* Overview Stats */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("stats.totalMerchants")}
            value={formatNumber(overview.totalMerchants)}
            growth={overview.merchantsGrowth}
            icon={Store}
            color="bg-blue-500"
          />
          <StatCard
            title={t("stats.activeMerchants")}
            value={formatNumber(overview.activeMerchants)}
            icon={Store}
            color="bg-green-500"
          />
          <StatCard
            title={t("stats.totalProducts")}
            value={formatNumber(overview.totalProducts)}
            growth={overview.productsGrowth}
            icon={Package}
            color="bg-purple-500"
          />
          <StatCard
            title={t("stats.totalUsers")}
            value={formatNumber(overview.totalUsers)}
            icon={Users}
            color="bg-indigo-500"
          />
        </div>

        {/* Revenue & Performance */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("stats.totalRevenue")}
            value={formatCurrency(overview.totalRevenue, overview.currency)}
            growth={overview.revenueGrowth}
            icon={DollarSign}
            color="bg-raff-primary"
          />
          <StatCard
            title={t("stats.totalOrders")}
            value={formatNumber(overview.totalOrders)}
            growth={overview.ordersGrowth}
            icon={ShoppingCart}
            color="bg-orange-500"
          />
          <StatCard
            title={t("stats.totalViews")}
            value={formatNumber(overview.totalViews)}
            growth={overview.viewsGrowth}
            icon={Eye}
            color="bg-cyan-500"
          />
          <StatCard
            title={t("stats.totalClicks")}
            value={formatNumber(overview.totalClicks)}
            growth={overview.clicksGrowth}
            icon={MousePointerClick}
            color="bg-pink-500"
          />
        </div>

        {/* Conversion Metrics */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-raff-neutral-900">{t("metrics.ctr")}</h3>
            <p className="mt-2 text-4xl font-bold text-raff-primary">
              {overview.avgCTR.toFixed(2)}%
            </p>
            <p className="mt-2 text-sm text-raff-neutral-600">
              {t("metrics.ctrDescription", {
                clicks: formatNumber(overview.totalClicks),
                views: formatNumber(overview.totalViews),
              })}
            </p>
          </div>
          <div className="rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-raff-neutral-900">{t("metrics.conversionRate")}</h3>
            <p className="mt-2 text-4xl font-bold text-raff-success">
              {overview.avgConversion.toFixed(2)}%
            </p>
            <p className="mt-2 text-sm text-raff-neutral-600">
              {t("metrics.conversionDescription", {
                orders: formatNumber(overview.totalOrders),
                clicks: formatNumber(overview.totalClicks),
              })}
            </p>
          </div>
        </div>

        {/* Platform Distribution & Click Quality */}
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Platform Distribution */}
          <div className="rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-raff-neutral-900">
              {t("platformDistribution.title")}
            </h3>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="text-sm font-medium text-raff-neutral-700">Salla</span>
                  <span className="text-sm font-bold text-raff-neutral-900">
                    {platformDistribution.salla}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-raff-neutral-200">
                  <div
                    className="h-full bg-[#00C48C]"
                    style={{
                      width: `${platformDistribution.total > 0 ? (platformDistribution.salla / platformDistribution.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between">
                  <span className="text-sm font-medium text-raff-neutral-700">Zid</span>
                  <span className="text-sm font-bold text-raff-neutral-900">
                    {platformDistribution.zid}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-raff-neutral-200">
                  <div
                    className="h-full bg-[#7C3AED]"
                    style={{
                      width: `${platformDistribution.total > 0 ? (platformDistribution.zid / platformDistribution.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Click Quality */}
          <div className="rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-raff-neutral-900">
              {t("clickQuality.title")}
            </h3>
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-raff-neutral-700">{t("clickQuality.qualityRate")}</span>
                <span className="text-2xl font-bold text-raff-success">
                  {clickQuality.qualityRate.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 text-sm text-raff-neutral-600">
                {t("clickQuality.qualifiedDescription", {
                  qualified: formatNumber(clickQuality.qualifiedClicks),
                  total: formatNumber(clickQuality.totalClickEvents),
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-raff-neutral-500">
                {t("clickQuality.disqualifiedReasons")}
              </p>
              {clickQuality.disqualifiedReasons.map((reason) => (
                <div key={reason.reason} className="flex items-center justify-between text-sm">
                  <span className="text-raff-neutral-700">{reason.reason}</span>
                  <span className="font-medium text-raff-neutral-900">{reason.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Console Log Viewer */}
        <div className="mb-8">
          <ConsoleViewer />
        </div>

        {/* Top Merchants */}
        <div className="mb-8 rounded-lg border border-raff-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-raff-neutral-900">
            {t("topMerchants.title")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-raff-neutral-200 text-sm font-medium text-raff-neutral-600">
                  <th className={`pb-3 ${isRtl ? "text-right" : "text-left"}`}>{t("topMerchants.merchant")}</th>
                  <th className={`pb-3 ${isRtl ? "text-right" : "text-left"}`}>{t("topMerchants.email")}</th>
                  <th className={`pb-3 ${isRtl ? "text-left" : "text-right"}`}>{t("topMerchants.products")}</th>
                  <th className={`pb-3 ${isRtl ? "text-left" : "text-right"}`}>{t("topMerchants.clicks")}</th>
                  <th className={`pb-3 ${isRtl ? "text-left" : "text-right"}`}>{t("topMerchants.orders")}</th>
                  <th className={`pb-3 ${isRtl ? "text-left" : "text-right"}`}>{t("topMerchants.revenue")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-raff-neutral-200">
                {topMerchants.map((merchant) => (
                  <tr key={merchant.id} className="text-sm">
                    <td className={`py-3 font-medium text-raff-neutral-900 ${isRtl ? "text-right" : "text-left"}`}>
                      {merchant.name}
                    </td>
                    <td className={`py-3 text-raff-neutral-600 ${isRtl ? "text-right" : "text-left"}`}>
                      {merchant.email}
                    </td>
                    <td className={`py-3 text-raff-neutral-900 ${isRtl ? "text-left" : "text-right"}`}>
                      {formatNumber(merchant.products)}
                    </td>
                    <td className={`py-3 text-raff-neutral-900 ${isRtl ? "text-left" : "text-right"}`}>
                      {formatNumber(merchant.clicks)}
                    </td>
                    <td className={`py-3 text-raff-neutral-900 ${isRtl ? "text-left" : "text-right"}`}>
                      {formatNumber(merchant.orders)}
                    </td>
                    <td className={`py-3 font-semibold text-raff-primary ${isRtl ? "text-left" : "text-right"}`}>
                      {formatCurrency(merchant.revenue, overview.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Merchants Alert */}
        {overview.pendingMerchants > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <p className="font-medium text-yellow-900">
                {t("pendingMerchants", { count: overview.pendingMerchants })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
