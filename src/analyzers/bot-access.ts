import type { Check, Recommendation, RobotsAnalysis } from "../types.js";

export function calculateBotAccessPoints(robots: RobotsAnalysis): number {
  const { allowed, notMentioned, partiallyBlocked, totalBots } = robots.summary;
  if (totalBots === 0) {
    return 0;
  }

  const ratio = (allowed + notMentioned + partiallyBlocked * 0.5) / totalBots;
  return Math.round(10 * ratio);
}

export function buildBotAccessCheck(robots: RobotsAnalysis): Check {
  const points = calculateBotAccessPoints(robots);
  const allowedEquivalent = robots.summary.allowed + robots.summary.notMentioned + robots.summary.partiallyBlocked * 0.5;

  return {
    id: "ai.bots_access",
    name: "AI bots allowed in robots.txt",
    passed: points >= 7,
    points,
    maxPoints: 10,
    detail: `${allowedEquivalent.toFixed(1)} of ${robots.summary.totalBots} bots counted as allowed-equivalent`,
    fix: "Allow strategic AI bots in robots.txt while explicitly documenting bot policy."
  };
}

export function buildSitemapCheck(robots: RobotsAnalysis): Check {
  const hasSitemap = robots.sitemaps.length > 0;

  return {
    id: "ai.sitemap_reference",
    name: "Sitemap.xml referenced in robots.txt",
    passed: hasSitemap,
    points: hasSitemap ? 3 : 0,
    maxPoints: 3,
    detail: hasSitemap
      ? `Found ${robots.sitemaps.length} sitemap reference(s)`
      : "No sitemap reference found in robots.txt",
    fix: "Add a Sitemap directive in robots.txt (e.g., Sitemap: https://example.com/sitemap.xml)."
  };
}

export function buildNotMentionedRecommendation(robots: RobotsAnalysis): Recommendation | null {
  if (robots.summary.notMentioned === 0) {
    return null;
  }

  return {
    priority: "low",
    category: "AI Accessibility",
    message: `${robots.summary.notMentioned} AI bot(s) are not explicitly mentioned in robots.txt. Add explicit rules to remove ambiguity.`,
    impact: "No score impact",
    checkId: "ai.bots_explicit_policy"
  };
}
