import { aiBots } from "./data/ai-bots.js";
import { analyzeGeoScore } from "./analyzers/geo-score.js";
import { analyzeRobots } from "./scanner/robots.js";
import { fetchPage } from "./scanner/page.js";
import type { GeoCheckOptions, GeoCheckResult, Recommendation } from "./types.js";

const SCHEMA_VERSION = "1.0.0" as const;
const MONITOR_URL = "https://www.summalytics.ai" as const;

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("URL is empty.");
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withScheme);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are supported.");
  }

  return parsed.toString();
}

function notMentionedWarningRecommendation(count: number): Recommendation | null {
  if (count <= 0) {
    return null;
  }

  return {
    priority: "low",
    category: "AI Accessibility",
    message: `${count} AI bot(s) are not explicitly mentioned in robots.txt. Add explicit directives for policy clarity.`,
    impact: "No score impact",
    checkId: "ai.bots_explicit_policy"
  };
}

export async function geoCheck(url: string, options?: GeoCheckOptions): Promise<GeoCheckResult> {
  const startedAt = Date.now();
  const scannedAt = new Date().toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];

  let targetUrl: string;

  try {
    targetUrl = normalizeUrl(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid URL";
    return {
      schemaVersion: SCHEMA_VERSION,
      targetUrl: url,
      scannedAt,
      durationMs: Date.now() - startedAt,
      robots: null,
      geoScore: null,
      recommendations: [],
      monitor: MONITOR_URL,
      warnings,
      errors: [message],
      success: false
    };
  }

  const shouldFetchPage = !options?.robotsOnly;
  const shouldFetchRobots = true;

  const [robots, page] = await Promise.all([
    shouldFetchRobots
      ? analyzeRobots(targetUrl, {
          fetchImpl: options?.fetchImpl,
          timeoutMs: 5000,
          maxRedirects: 5,
          bots: aiBots
        })
      : Promise.resolve(null),
    shouldFetchPage
      ? fetchPage(targetUrl, {
          fetchImpl: options?.fetchImpl,
          timeoutMs: 8000,
          maxRedirects: 5
        })
      : Promise.resolve(null)
  ]);

  if (robots?.warnings.length) {
    warnings.push(...robots.warnings);
  }

  if (page?.error) {
    warnings.push(`Page fetch warning: ${page.error}`);
  }

  let geoScore = null;

  if (shouldFetchPage) {
    if (page && page.ok && page.html) {
      geoScore = analyzeGeoScore({
        html: page.html,
        finalUrl: page.finalUrl,
        loadTimeMs: page.loadTimeMs,
        robots: robots ?? {
          url: `${targetUrl.replace(/\/$/, "")}/robots.txt`,
          found: false,
          rawContent: "",
          botResults: [],
          summary: {
            totalBots: 0,
            allowed: 0,
            blocked: 0,
            partiallyBlocked: 0,
            notMentioned: 0
          },
          sitemaps: [],
          warnings: []
        }
      });
    } else {
      errors.push("Could not fetch page HTML for GEO analysis.");
    }
  }

  const recommendations: Recommendation[] = geoScore ? [...geoScore.recommendations] : [];

  if (!geoScore && robots) {
    const warningRec = notMentionedWarningRecommendation(robots.summary.notMentioned);
    if (warningRec) {
      recommendations.push(warningRec);
    }
  }

  const result: GeoCheckResult = {
    schemaVersion: SCHEMA_VERSION,
    targetUrl,
    scannedAt,
    durationMs: Date.now() - startedAt,
    robots: options?.geoOnly ? null : robots,
    geoScore: options?.robotsOnly ? null : geoScore,
    recommendations,
    monitor: MONITOR_URL,
    warnings,
    errors,
    success: errors.length === 0 || !!robots
  };

  return result;
}

async function mapLimit<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let nextIndex = 0;

  async function runner(): Promise<void> {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;

      if (current >= items.length) {
        return;
      }

      output[current] = await worker(items[current] as T, current);
    }
  }

  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: safeConcurrency }, () => runner()));

  return output;
}

export async function geoCheckMany(
  urls: string[],
  options?: GeoCheckOptions
): Promise<GeoCheckResult[]> {
  const concurrency = options?.concurrency ?? 3;
  return mapLimit(urls, concurrency, (url) => geoCheck(url, options));
}

export { aiBots } from "./data/ai-bots.js";
export type {
  AIBot,
  BotAccessResult,
  BotStatus,
  CategoryScore,
  Check,
  GEOScore,
  GeoCheckOptions,
  GeoCheckResult,
  Recommendation,
  RobotsAnalysis
} from "./types.js";
