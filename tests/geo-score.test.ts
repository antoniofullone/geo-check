import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeGeoScore } from "../src/analyzers/geo-score.js";
import type { RobotsAnalysis } from "../src/types.js";

const fixtures = join(process.cwd(), "tests", "fixtures");

const robots: RobotsAnalysis = {
  url: "https://example.com/robots.txt",
  found: true,
  rawContent: "User-agent: *\nAllow: /",
  botResults: [],
  summary: {
    totalBots: 10,
    allowed: 8,
    blocked: 1,
    partiallyBlocked: 1,
    notMentioned: 0
  },
  sitemaps: ["https://example.com/sitemap.xml"],
  warnings: []
};

describe("geo score analyzer", () => {
  it("builds category scores and deterministic check IDs", () => {
    const html = readFileSync(join(fixtures, "sample-page.html"), "utf8");

    const report = analyzeGeoScore({
      html,
      finalUrl: "https://example.com/sample",
      loadTimeMs: 850,
      robots
    });

    expect(report.total).toBeGreaterThanOrEqual(70);
    expect(["A+", "A", "B+", "B", "C", "D", "F"]).toContain(report.grade);

    const checkIds = report.categories.structuredData.checks.map((check) => check.id);
    expect(checkIds).toEqual([
      "structured.jsonld_present",
      "structured.schema_types",
      "structured.jsonld_valid",
      "structured.opengraph"
    ]);
  });

  it("creates recommendations for missing points", () => {
    const html = readFileSync(join(fixtures, "poor-page.html"), "utf8");

    const report = analyzeGeoScore({
      html,
      finalUrl: "http://example.com/poor",
      loadTimeMs: 3500,
      robots
    });

    expect(report.total).toBeLessThan(60);
    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations[0]?.impact).toMatch(/^\+[0-9]+ points$/);
  });
});
