// src/lib/utils/metrics.ts
/**
 * Monitoring metrics helper for tracking key integration metrics
 *
 * Provides simple metric tracking without requiring external dependencies.
 * For production, integrate with Prometheus, Datadog, or CloudWatch.
 */

import { createLogger } from "./logger";

const logger = createLogger("metrics");

type MetricType = "counter" | "gauge" | "histogram";

interface MetricEntry {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

class MetricsCollector {
  private metrics: Map<string, MetricEntry> = new Map();
  private histograms: Map<string, number[]> = new Map();

  /**
   * Increment a counter metric
   * @example metrics.increment("webhook.received", { event: "order.created" })
   */
  increment(name: string, labels?: Record<string, string>, value: number = 1): void {
    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing) {
      this.metrics.set(key, {
        ...existing,
        value: existing.value + value,
        timestamp: Date.now(),
      });
    } else {
      this.metrics.set(key, {
        name,
        type: "counter",
        value,
        labels,
        timestamp: Date.now(),
      });
    }

    logger.debug("metric-increment", { name, labels, value });
  }

  /**
   * Set a gauge metric (can go up or down)
   * @example metrics.gauge("active.merchants", {}, 150)
   */
  gauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);

    this.metrics.set(key, {
      name,
      type: "gauge",
      value,
      labels,
      timestamp: Date.now(),
    });

    logger.debug("metric-gauge", { name, labels, value });
  }

  /**
   * Record a histogram value (for latencies, sizes, etc.)
   * @example metrics.histogram("api.latency", 150, { endpoint: "/products" })
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);

    // Store individual values for percentile calculation
    const values = this.histograms.get(key) || [];
    values.push(value);

    // Keep last 1000 values for memory efficiency
    if (values.length > 1000) {
      values.shift();
    }

    this.histograms.set(key, values);

    // Store aggregated metric
    const sorted = [...values].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    this.metrics.set(key, {
      name,
      type: "histogram",
      value: p50, // Median
      labels: {
        ...labels,
        p50: String(p50),
        p95: String(p95),
        p99: String(p99),
      },
      timestamp: Date.now(),
    });

    logger.debug("metric-histogram", { name, labels, value, p50, p95, p99 });
  }

  /**
   * Measure execution time of an async function
   * @example await metrics.time("sync.products", async () => { await syncProducts() })
   */
  async time<T>(
    name: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.histogram(name, duration, labels);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.histogram(name, duration, { ...labels, error: "true" });
      this.increment(`${name}.error`, labels);

      throw error;
    }
  }

  /**
   * Get current value of a metric
   */
  get(name: string, labels?: Record<string, string>): number | undefined {
    const key = this.getMetricKey(name, labels);
    return this.metrics.get(key)?.value;
  }

  /**
   * Get all metrics (for exporting to monitoring systems)
   */
  getAll(): MetricEntry[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    this.metrics.clear();
    this.histograms.clear();
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      const labelStr = metric.labels
        ? Object.entries(metric.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(",")
        : "";

      const metricName = metric.name.replace(/\./g, "_");
      lines.push(`# TYPE ${metricName} ${metric.type}`);

      if (labelStr) {
        lines.push(`${metricName}{${labelStr}} ${metric.value}`);
      } else {
        lines.push(`${metricName} ${metric.value}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Log metrics summary to console
   */
  logSummary(): void {
    const metrics = this.getAll();

    logger.info("Metrics summary", {
      totalMetrics: metrics.length,
      counters: metrics.filter((m) => m.type === "counter").length,
      gauges: metrics.filter((m) => m.type === "gauge").length,
      histograms: metrics.filter((m) => m.type === "histogram").length,
    });

    for (const metric of metrics.slice(0, 10)) {
      // Log top 10
      logger.info("Metric", {
        name: metric.name,
        type: metric.type,
        value: metric.value,
        labels: metric.labels,
      });
    }
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(",");

    return `${name}{${labelStr}}`;
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

// Convenience functions for common Salla metrics

export function trackWebhookReceived(event: string, status: "success" | "failed"): void {
  metrics.increment("salla.webhook.received", { event, status });
}

export function trackWebhookProcessingTime(event: string, durationMs: number): void {
  metrics.histogram("salla.webhook.processing_time", durationMs, { event });
}

export function trackProductSync(merchantId: string, count: number, durationMs: number): void {
  metrics.gauge("salla.products.synced", count, { merchantId });
  metrics.histogram("salla.sync.duration", durationMs, { type: "products" });
}

export function trackOrderSync(merchantId: string, count: number, durationMs: number): void {
  metrics.gauge("salla.orders.synced", count, { merchantId });
  metrics.histogram("salla.sync.duration", durationMs, { type: "orders" });
}

export function trackTokenRefresh(status: "success" | "failed"): void {
  metrics.increment("salla.token.refresh", { status });
}

export function trackApiError(endpoint: string, statusCode: number): void {
  metrics.increment("salla.api.error", {
    endpoint,
    status: String(statusCode),
  });
}

export function trackDatabaseQuery(operation: string, durationMs: number): void {
  metrics.histogram("salla.database.query_time", durationMs, { operation });
}
