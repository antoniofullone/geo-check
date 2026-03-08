import { aiBots } from "../data/ai-bots.js";
import type { AIBot, BotAccessResult, BotStatus, RobotsAnalysis, RobotsSummary } from "../types.js";
import { fetchWithRedirects } from "./http.js";

interface RobotsRule {
  directive: "allow" | "disallow";
  path: string;
}

interface RobotsGroup {
  userAgents: string[];
  rules: RobotsRule[];
}

interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
}

interface MatchInfo {
  decision: "allow" | "disallow" | "none";
  matchedLength: number;
}

function normalizeLine(line: string): string {
  const hashIndex = line.indexOf("#");
  const withoutComment = hashIndex >= 0 ? line.slice(0, hashIndex) : line;
  return withoutComment.trim();
}

function parseDirective(line: string): { key: string; value: string } | null {
  const colon = line.indexOf(":");
  if (colon <= 0) {
    return null;
  }

  const key = line.slice(0, colon).trim().toLowerCase();
  const value = line.slice(colon + 1).trim();
  if (!key) {
    return null;
  }

  return { key, value };
}

export function parseRobotsTxt(content: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let currentGroup: RobotsGroup | null = null;
  let hasRuleInCurrentGroup = false;

  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line) {
      continue;
    }

    const parsed = parseDirective(line);
    if (!parsed) {
      continue;
    }

    if (parsed.key === "user-agent") {
      const userAgent = parsed.value.toLowerCase();
      if (!userAgent) {
        continue;
      }

      if (!currentGroup || hasRuleInCurrentGroup) {
        currentGroup = { userAgents: [], rules: [] };
        groups.push(currentGroup);
        hasRuleInCurrentGroup = false;
      }

      currentGroup.userAgents.push(userAgent);
      continue;
    }

    if (parsed.key === "allow" || parsed.key === "disallow") {
      if (!currentGroup) {
        continue;
      }

      if (!parsed.value) {
        continue;
      }

      currentGroup.rules.push({ directive: parsed.key, path: parsed.value });
      hasRuleInCurrentGroup = true;
      continue;
    }

    if (parsed.key === "sitemap") {
      if (parsed.value) {
        sitemaps.push(parsed.value);
      }
    }
  }

  return { groups, sitemaps };
}

function escapeRegex(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

function getMatchLength(targetPath: string, rulePath: string): number {
  if (!rulePath) {
    return 0;
  }

  if (!rulePath.includes("*") && !rulePath.includes("$")) {
    return targetPath.startsWith(rulePath) ? rulePath.length : -1;
  }

  const endsWithAnchor = rulePath.endsWith("$");
  const patternBody = endsWithAnchor ? rulePath.slice(0, -1) : rulePath;
  const escaped = escapeRegex(patternBody).replace(/\\\*/g, ".*");
  const pattern = endsWithAnchor ? `^${escaped}$` : `^${escaped}`;
  const regex = new RegExp(pattern);
  const match = targetPath.match(regex);

  if (!match || !match[0]) {
    return -1;
  }

  return match[0].length;
}

function getDecisionForPath(path: string, rules: RobotsRule[]): MatchInfo {
  let bestDecision: "allow" | "disallow" | "none" = "none";
  let bestLength = -1;

  for (const rule of rules) {
    const matchLength = getMatchLength(path, rule.path);
    if (matchLength < 0) {
      continue;
    }

    if (matchLength > bestLength) {
      bestLength = matchLength;
      bestDecision = rule.directive;
      continue;
    }

    if (matchLength === bestLength && rule.directive === "allow") {
      bestDecision = "allow";
    }
  }

  return {
    decision: bestDecision,
    matchedLength: Math.max(bestLength, 0)
  };
}

function pathProbeFromRule(rulePath: string): string {
  const withoutAnchor = rulePath.endsWith("$") ? rulePath.slice(0, -1) : rulePath;
  const withWildcardExpanded = withoutAnchor.replace(/\*/g, "sample");
  if (!withWildcardExpanded.startsWith("/")) {
    return `/${withWildcardExpanded}`;
  }
  return withWildcardExpanded || "/";
}

function classifyStatus(rules: RobotsRule[]): BotStatus {
  if (rules.length === 0) {
    return "allowed";
  }

  const hasDisallow = rules.some((rule) => rule.directive === "disallow");
  if (!hasDisallow) {
    return "allowed";
  }

  const rootDecision = getDecisionForPath("/", rules).decision;

  if (rootDecision === "disallow") {
    const hasAllowedIsland = rules.some((rule) => {
      if (rule.directive !== "allow") {
        return false;
      }
      const probe = pathProbeFromRule(rule.path);
      return getDecisionForPath(probe, rules).decision === "allow";
    });

    return hasAllowedIsland ? "partially_blocked" : "blocked";
  }

  const blocksAnyPath = rules.some((rule) => {
    if (rule.directive !== "disallow") {
      return false;
    }
    const probe = pathProbeFromRule(rule.path);
    return getDecisionForPath(probe, rules).decision === "disallow";
  });

  return blocksAnyPath ? "partially_blocked" : "allowed";
}

function summarize(results: BotAccessResult[]): RobotsSummary {
  const summary: RobotsSummary = {
    totalBots: results.length,
    allowed: 0,
    blocked: 0,
    partiallyBlocked: 0,
    notMentioned: 0
  };

  for (const result of results) {
    if (result.status === "allowed") {
      summary.allowed += 1;
    } else if (result.status === "blocked") {
      summary.blocked += 1;
    } else if (result.status === "partially_blocked") {
      summary.partiallyBlocked += 1;
    } else {
      summary.notMentioned += 1;
    }
  }

  return summary;
}

function toRuleLines(rules: RobotsRule[]): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const rule of rules) {
    const line = `${rule.directive === "allow" ? "Allow" : "Disallow"}: ${rule.path}`;
    if (!seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }

  return lines;
}

function getApplicableRules(parsed: ParsedRobots, botUserAgent: string): { rules: RobotsRule[]; source: "specific" | "wildcard" | "none" } {
  const target = botUserAgent.toLowerCase();

  const specificGroups = parsed.groups.filter((group) =>
    group.userAgents.some((agent) => agent === target)
  );

  if (specificGroups.length > 0) {
    return {
      source: "specific",
      rules: specificGroups.flatMap((group) => group.rules)
    };
  }

  const wildcardGroups = parsed.groups.filter((group) =>
    group.userAgents.some((agent) => agent === "*")
  );

  if (wildcardGroups.length > 0) {
    return {
      source: "wildcard",
      rules: wildcardGroups.flatMap((group) => group.rules)
    };
  }

  return { source: "none", rules: [] };
}

export function evaluateBotAccess(bot: AIBot, parsed: ParsedRobots): BotAccessResult {
  const applicable = getApplicableRules(parsed, bot.userAgent);

  if (applicable.source === "none") {
    return {
      bot,
      status: "not_mentioned",
      rules: []
    };
  }

  const status = classifyStatus(applicable.rules);

  return {
    bot,
    status,
    rules: toRuleLines(applicable.rules)
  };
}

function buildImplicitAllowAnalysis(
  robotsUrl: string,
  warning: string,
  bots: AIBot[]
): RobotsAnalysis {
  const botResults = bots.map((bot) => ({
    bot,
    status: "not_mentioned" as const,
    rules: []
  }));

  return {
    url: robotsUrl,
    found: false,
    rawContent: "",
    botResults,
    summary: summarize(botResults),
    sitemaps: [],
    warnings: [warning]
  };
}

export async function analyzeRobots(
  siteUrl: string,
  options?: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    maxRedirects?: number;
    bots?: AIBot[];
  }
): Promise<RobotsAnalysis> {
  const bots = options?.bots ?? aiBots;
  const timeoutMs = options?.timeoutMs ?? 5000;
  const maxRedirects = options?.maxRedirects ?? 5;
  const robotsUrl = new URL("/robots.txt", siteUrl).toString();

  try {
    const { response } = await fetchWithRedirects(robotsUrl, {
      fetchImpl: options?.fetchImpl,
      timeoutMs,
      maxRedirects
    });

    if (response.status === 404) {
      return buildImplicitAllowAnalysis(
        robotsUrl,
        "No robots.txt found (404). AI bots are implicitly allowed.",
        bots
      );
    }

    if (!response.ok) {
      return buildImplicitAllowAnalysis(
        robotsUrl,
        `Could not read robots.txt (${response.status}). AI bots are treated as implicitly allowed.`,
        bots
      );
    }

    const rawContent = await response.text();
    const parsed = parseRobotsTxt(rawContent);
    const botResults = bots.map((bot) => evaluateBotAccess(bot, parsed));

    return {
      url: robotsUrl,
      found: true,
      rawContent,
      botResults,
      summary: summarize(botResults),
      sitemaps: parsed.sitemaps,
      warnings: []
    };
  } catch (error) {
    return buildImplicitAllowAnalysis(
      robotsUrl,
      `Failed to fetch robots.txt: ${error instanceof Error ? error.message : "Unknown error"}`,
      bots
    );
  }
}
