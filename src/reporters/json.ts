import type { GeoCheckResult } from "../types.js";

function serializeResult(result: GeoCheckResult): Record<string, unknown> {
  return {
    schemaVersion: result.schemaVersion,
    targetUrl: result.targetUrl,
    scannedAt: result.scannedAt,
    durationMs: result.durationMs,
    robots: result.robots,
    geoScore: result.geoScore,
    recommendations: result.recommendations,
    monitor: result.monitor,
    warnings: result.warnings,
    errors: result.errors,
    success: result.success
  };
}

export function formatJsonOutput(result: GeoCheckResult | GeoCheckResult[]): string {
  const payload = Array.isArray(result)
    ? result.map((item) => serializeResult(item))
    : serializeResult(result);

  return JSON.stringify(payload, null, 2);
}
