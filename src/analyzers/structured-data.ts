import type { CheerioAPI } from "cheerio";
import type { StructuredDataAnalysis } from "../types.js";

function normalizeType(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function walkJsonLd(
  node: unknown,
  ctx: {
    types: Set<string>;
    hasOrganization: boolean;
    hasAuthor: boolean;
    hasDatePublished: boolean;
    hasDateModified: boolean;
  }
): void {
  if (!node) {
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      walkJsonLd(child, ctx);
    }
    return;
  }

  if (typeof node !== "object") {
    return;
  }

  const record = node as Record<string, unknown>;

  for (const typeName of normalizeType(record["@type"])) {
    ctx.types.add(typeName);
    if (typeName.toLowerCase() === "organization") {
      ctx.hasOrganization = true;
    }
  }

  if (record.author !== undefined) {
    ctx.hasAuthor = true;
  }

  if (record.datePublished !== undefined) {
    ctx.hasDatePublished = true;
  }

  if (record.dateModified !== undefined || record.modifiedTime !== undefined) {
    ctx.hasDateModified = true;
  }

  for (const value of Object.values(record)) {
    walkJsonLd(value, ctx);
  }
}

export function analyzeStructuredData($: CheerioAPI): StructuredDataAnalysis {
  const scripts = $("script[type='application/ld+json']").toArray();
  const types = new Set<string>();

  let validCount = 0;
  let invalidCount = 0;

  const ctx = {
    types,
    hasOrganization: false,
    hasAuthor: false,
    hasDatePublished: false,
    hasDateModified: false
  };

  for (const script of scripts) {
    const payload = $(script).text().trim();
    if (!payload) {
      continue;
    }

    try {
      const parsed = JSON.parse(payload);
      validCount += 1;
      walkJsonLd(parsed, ctx);
    } catch {
      invalidCount += 1;
    }
  }

  return {
    hasJsonLd: scripts.length > 0,
    validJsonLd: scripts.length > 0 && validCount > 0 && invalidCount === 0,
    schemaTypes: [...types].sort((a, b) => a.localeCompare(b)),
    hasOrganizationSchema: ctx.hasOrganization,
    hasAuthorProperty: ctx.hasAuthor,
    hasDatePublished: ctx.hasDatePublished,
    hasDateModified: ctx.hasDateModified
  };
}
