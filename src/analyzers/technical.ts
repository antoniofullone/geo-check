import type { TechnicalAnalysis } from "../types.js";

export function analyzeTechnical(input: { finalUrl: string; loadTimeMs: number }): TechnicalAnalysis {
  return {
    isHttps: input.finalUrl.startsWith("https://"),
    loadUnder3Seconds: input.loadTimeMs < 3000
  };
}
