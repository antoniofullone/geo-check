import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aiBots } from "../src/data/ai-bots.js";
import { evaluateBotAccess, parseRobotsTxt } from "../src/scanner/robots.js";

const fixtures = join(process.cwd(), "tests", "fixtures");

describe("robots parser and access evaluation", () => {
  it("parses allow-all robots and applies wildcard rules", () => {
    const content = readFileSync(join(fixtures, "robots-allow-all.txt"), "utf8");
    const parsed = parseRobotsTxt(content);

    const gpt = aiBots.find((bot) => bot.userAgent === "GPTBot");
    expect(gpt).toBeDefined();

    const result = evaluateBotAccess(gpt!, parsed);

    expect(result.status).toBe("allowed");
    expect(result.rules).toContain("Allow: /");
  });

  it("gives specific group precedence over wildcard and detects partial blocking", () => {
    const content = readFileSync(join(fixtures, "robots-block-ai.txt"), "utf8");
    const parsed = parseRobotsTxt(content);

    const gpt = aiBots.find((bot) => bot.userAgent === "GPTBot")!;
    const claude = aiBots.find((bot) => bot.userAgent === "ClaudeBot")!;
    const perplexity = aiBots.find((bot) => bot.userAgent === "PerplexityBot")!;

    const gptResult = evaluateBotAccess(gpt, parsed);
    const claudeResult = evaluateBotAccess(claude, parsed);
    const perplexityResult = evaluateBotAccess(perplexity, parsed);

    expect(gptResult.status).toBe("blocked");
    expect(claudeResult.status).toBe("partially_blocked");
    expect(perplexityResult.status).toBe("partially_blocked");
  });

  it("marks bots as not_mentioned when no wildcard or specific rules exist", () => {
    const parsed = parseRobotsTxt("Sitemap: https://example.com/sitemap.xml");
    const gpt = aiBots.find((bot) => bot.userAgent === "GPTBot")!;

    const result = evaluateBotAccess(gpt, parsed);

    expect(result.status).toBe("not_mentioned");
    expect(result.rules).toEqual([]);
  });
});
