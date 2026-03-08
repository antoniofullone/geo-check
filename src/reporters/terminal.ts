import chalk from "chalk";
import Table from "cli-table3";
import type { BotAccessResult, GeoCheckResult, Recommendation } from "../types.js";

const PRIORITY_ICON: Record<Recommendation["priority"], string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢"
};

function statusBadge(status: BotAccessResult["status"]): string {
  if (status === "allowed") {
    return `${chalk.green("✅")} Allowed`;
  }
  if (status === "blocked") {
    return `${chalk.red("❌")} Blocked`;
  }
  if (status === "partially_blocked") {
    return `${chalk.yellow("⚠️")} Partially blocked`;
  }
  return `${chalk.yellow("⚠️")} Not mentioned (implicitly allowed)`;
}

function bar(score: number, max: number, width = 12): string {
  const ratio = max === 0 ? 0 : score / max;
  const filled = Math.round(ratio * width);
  return `${"█".repeat(filled)}${"░".repeat(Math.max(0, width - filled))}`;
}

function headerBlock(): string {
  const lines = [
    "┌─────────────────────────────────────────────────────┐",
    "│                  geo-check v1.0.0                  │",
    "│               AI Visibility Scanner                │",
    "│            https://www.summalytics.ai             │",
    "└─────────────────────────────────────────────────────┘"
  ];

  return chalk.cyan(lines.join("\n"));
}

function renderBots(results: BotAccessResult[]): string {
  const table = new Table({
    head: ["Bot", "Company", "Status"],
    colWidths: [24, 16, 34],
    wordWrap: true
  });

  for (const result of results) {
    table.push([result.bot.name, result.bot.company, statusBadge(result.status)]);
  }

  return table.toString();
}

function renderRecommendations(recommendations: Recommendation[], verbose: boolean): string {
  const selected = verbose ? recommendations : recommendations.slice(0, 5);

  if (selected.length === 0) {
    return `${chalk.green("✅")} No recommendations. GEO profile looks strong.`;
  }

  return selected
    .map((recommendation) => {
      const icon = PRIORITY_ICON[recommendation.priority];
      return `  ${icon} ${recommendation.priority.toUpperCase()}: ${recommendation.message} (${recommendation.impact})`;
    })
    .join("\n");
}

function partialBlockExplanation(results: BotAccessResult[]): string[] {
  const partialResults = results.filter((result) => result.status === "partially_blocked");
  if (partialResults.length === 0) {
    return [];
  }

  const ruleCounts = new Map<string, number>();
  for (const result of partialResults) {
    for (const rule of result.rules) {
      if (!rule.startsWith("Disallow:")) {
        continue;
      }
      ruleCounts.set(rule, (ruleCounts.get(rule) ?? 0) + 1);
    }
  }

  const topRules = [...ruleCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([rule, count]) => `${rule} (${count})`);

  const lines = [
    `${chalk.yellow("ℹ️")} Partially blocked means bots can crawl some paths but are blocked on others by robots.txt rules.`
  ];

  if (topRules.length > 0) {
    lines.push(`   Top blocking rules: ${topRules.join(" · ")}`);
  }

  return lines;
}

function renderSingleResult(result: GeoCheckResult, options: { verbose: boolean }): string {
  const lines: string[] = [];
  lines.push(headerBlock());
  lines.push("");
  lines.push(`Scanning ${chalk.bold(result.targetUrl)} ...`);

  if (!result.success) {
    lines.push(chalk.red("Scan failed."));
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        lines.push(`  ${chalk.red("❌")} ${error}`);
      }
    }
    return lines.join("\n");
  }

  if (result.geoScore) {
    lines.push("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push(
      `${chalk.bold("📊 GEO READINESS SCORE")}: ${chalk.bold(`${result.geoScore.total}/100`)} (${result.geoScore.grade})`
    );
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const { categories } = result.geoScore;
    lines.push(
      `  Structured Data     ${bar(categories.structuredData.score, categories.structuredData.maxScore)}  ${categories.structuredData.score}/${categories.structuredData.maxScore}`
    );
    lines.push(
      `  Content Structure   ${bar(categories.contentStructure.score, categories.contentStructure.maxScore)}  ${categories.contentStructure.score}/${categories.contentStructure.maxScore}`
    );
    lines.push(
      `  Authority Signals   ${bar(categories.authoritySignals.score, categories.authoritySignals.maxScore)}  ${categories.authoritySignals.score}/${categories.authoritySignals.maxScore}`
    );
    lines.push(
      `  AI Accessibility    ${bar(categories.aiAccessibility.score, categories.aiAccessibility.maxScore)}  ${categories.aiAccessibility.score}/${categories.aiAccessibility.maxScore}`
    );
  }

  if (result.robots) {
    lines.push("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push(chalk.bold("🤖 AI BOT ACCESS"));
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push(renderBots(result.robots.botResults));
    lines.push(
      `Summary: ${result.robots.summary.allowed} allowed · ${result.robots.summary.blocked} blocked · ${result.robots.summary.partiallyBlocked} partial · ${result.robots.summary.notMentioned} not mentioned`
    );
    lines.push(...partialBlockExplanation(result.robots.botResults));
  }

  lines.push("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(chalk.bold("💡 TOP RECOMMENDATIONS"));
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(renderRecommendations(result.recommendations, options.verbose));

  if (result.warnings.length > 0) {
    lines.push("\nWarnings:");
    for (const warning of result.warnings) {
      lines.push(`  ${chalk.yellow("⚠️")} ${warning}`);
    }
  }

  if (options.verbose && result.geoScore) {
    lines.push("\nVerbose checks:");
    for (const [categoryName, category] of Object.entries(result.geoScore.categories)) {
      lines.push(`  ${chalk.bold(categoryName)}: ${category.score}/${category.maxScore}`);
      for (const check of category.checks) {
        const marker = check.passed ? chalk.green("✅") : chalk.red("❌");
        lines.push(`    ${marker} ${check.name} (${check.points}/${check.maxPoints}) - ${check.detail}`);
      }
    }
  }

  lines.push("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("For ongoing monitoring and AI traffic analytics: https://www.summalytics.ai");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return lines.join("\n");
}

export function renderTerminalResults(
  results: GeoCheckResult[],
  options: { verbose: boolean }
): string {
  return results.map((result) => renderSingleResult(result, options)).join("\n\n");
}
