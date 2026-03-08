import { describe, expect, it } from "vitest";
import { buildNotMentionedRecommendation, calculateBotAccessPoints } from "../src/analyzers/bot-access.js";
import type { RobotsAnalysis } from "../src/types.js";

function robots(summaryOverrides: Partial<RobotsAnalysis["summary"]>): RobotsAnalysis {
  return {
    url: "https://example.com/robots.txt",
    found: true,
    rawContent: "",
    botResults: [],
    summary: {
      totalBots: 10,
      allowed: 0,
      blocked: 0,
      partiallyBlocked: 0,
      notMentioned: 0,
      ...summaryOverrides
    },
    sitemaps: [],
    warnings: []
  };
}

describe("bot access scoring", () => {
  it("uses weighted formula for allowed + not_mentioned + 0.5*partial", () => {
    const points = calculateBotAccessPoints(
      robots({ totalBots: 10, allowed: 4, notMentioned: 2, partiallyBlocked: 2 })
    );

    expect(points).toBe(7);
  });

  it("emits explicit-policy recommendation when bots are not mentioned", () => {
    const rec = buildNotMentionedRecommendation(robots({ notMentioned: 3 }));

    expect(rec).not.toBeNull();
    expect(rec?.message).toContain("3 AI bot(s)");
    expect(rec?.impact).toBe("No score impact");
  });
});
