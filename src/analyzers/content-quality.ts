import type { CheerioAPI } from "cheerio";
import type { ContentQualityAnalysis } from "../types.js";

function countWords(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return 0;
  }
  return normalized.split(" ").length;
}

function isHeadingHierarchyLogical($: CheerioAPI): boolean {
  const headings = $("h1,h2,h3,h4,h5,h6").toArray();
  let lastLevel = 0;

  for (const heading of headings) {
    const tag = heading.tagName?.toLowerCase();
    if (!tag || !/^h[1-6]$/.test(tag)) {
      continue;
    }

    const currentLevel = Number(tag.slice(1));
    if (lastLevel > 0 && currentLevel > lastLevel + 1) {
      return false;
    }

    lastLevel = currentLevel;
  }

  return true;
}

function analyzeLinks($: CheerioAPI, pageUrl: string): { internal: number; external: number } {
  const currentHost = new URL(pageUrl).hostname;
  let internal = 0;
  let external = 0;

  for (const anchor of $("a[href]").toArray()) {
    const href = $(anchor).attr("href")?.trim();
    if (!href) {
      continue;
    }

    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }

    try {
      const target = new URL(href, pageUrl);
      if (target.hostname === currentHost) {
        internal += 1;
      } else {
        external += 1;
      }
    } catch {
      continue;
    }
  }

  return { internal, external };
}

export function analyzeContentQuality($: CheerioAPI, pageUrl: string): ContentQualityAnalysis {
  const bodyText = $("body").text();
  const wordCount = countWords(bodyText);

  const paragraphWordCounts = $("p")
    .toArray()
    .map((paragraph) => countWords($(paragraph).text()))
    .filter((words) => words > 0);

  const avgParagraphWords =
    paragraphWordCounts.length === 0
      ? 0
      : paragraphWordCounts.reduce((sum, words) => sum + words, 0) / paragraphWordCounts.length;

  const links = analyzeLinks($, pageUrl);

  const hasAuthorSignal =
    $("[rel='author']").length > 0 ||
    $("[itemprop='author']").length > 0 ||
    $("meta[name='author']").length > 0 ||
    $("[class*='author' i]").length > 0;

  const hasTablesWithHeaders = $("table").toArray().some((table) => $(table).find("th").length > 0);

  return {
    h1Count: $("h1").length,
    headingHierarchyLogical: isHeadingHierarchyLogical($),
    wordCount,
    avgParagraphWords,
    hasLists: $("ul li,ol li").length > 0,
    hasTablesWithHeaders,
    internalLinks: links.internal,
    externalLinks: links.external,
    hasAuthorSignal,
    hasMeaningfulHtmlContent: wordCount >= 120
  };
}
