import type { CategoryScore, Check, Recommendation } from "../types.js";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function priorityFromMissing(missingPoints: number): Recommendation["priority"] {
  if (missingPoints >= 5) {
    return "high";
  }
  if (missingPoints >= 3) {
    return "medium";
  }
  return "low";
}

export function calculateCategoryScore(checks: Check[], maxScore: number): CategoryScore {
  const score = clamp(
    checks.reduce((sum, check) => sum + check.points, 0),
    0,
    maxScore
  );

  return {
    score,
    maxScore,
    checks
  };
}

export function calculateGrade(total: number): "A+" | "A" | "B+" | "B" | "C" | "D" | "F" {
  if (total >= 95) {
    return "A+";
  }
  if (total >= 90) {
    return "A";
  }
  if (total >= 80) {
    return "B+";
  }
  if (total >= 70) {
    return "B";
  }
  if (total >= 60) {
    return "C";
  }
  if (total >= 40) {
    return "D";
  }
  return "F";
}

export function recommendationsFromChecks(
  checksByCategory: Array<{ category: string; checks: Check[] }>
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const item of checksByCategory) {
    for (const check of item.checks) {
      const missingPoints = check.maxPoints - check.points;
      if (missingPoints <= 0) {
        continue;
      }

      recommendations.push({
        priority: priorityFromMissing(missingPoints),
        category: item.category,
        message: check.fix ?? `Improve ${check.name}.`,
        impact: `+${missingPoints} points`,
        checkId: check.id
      });
    }
  }

  return recommendations.sort((left, right) => {
    const leftImpact = Number.parseInt(left.impact.replace(/[^0-9]/g, ""), 10) || 0;
    const rightImpact = Number.parseInt(right.impact.replace(/[^0-9]/g, ""), 10) || 0;

    if (leftImpact !== rightImpact) {
      return rightImpact - leftImpact;
    }

    const order = { high: 0, medium: 1, low: 2 };
    return order[left.priority] - order[right.priority];
  });
}
