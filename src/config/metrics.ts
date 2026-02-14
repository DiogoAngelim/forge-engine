import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import { env } from "./env";

export const metricsRegistry = new Registry();

if (env.METRICS_ENABLED) {
  collectDefaultMetrics({ register: metricsRegistry, prefix: "forge_engine_" });
}

export const eventProcessDuration = new Histogram({
  name: "forge_engine_event_process_duration_seconds",
  help: "Duration of event processing in seconds",
  registers: [metricsRegistry],
  labelNames: ["app_id", "event_type"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

export const eventProcessedCounter = new Counter({
  name: "forge_engine_events_processed_total",
  help: "Total number of processed events",
  registers: [metricsRegistry],
  labelNames: ["app_id", "status"]
});

export const ruleEvalCounter = new Counter({
  name: "forge_engine_rule_evaluations_total",
  help: "Total reward rule evaluations",
  registers: [metricsRegistry],
  labelNames: ["app_id", "matched"]
});
