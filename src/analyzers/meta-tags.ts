import type { CheerioAPI } from "cheerio";
import type { MetaTagsAnalysis } from "../types.js";

const REQUIRED_OG_TAGS = ["og:title", "og:description", "og:image", "og:type"];

function getMetaContent($: CheerioAPI, selector: string): string | undefined {
  const value = $(selector).attr("content")?.trim();
  return value || undefined;
}

function hasDirective(value: string | undefined, directive: string): boolean {
  if (!value) {
    return false;
  }
  return value
    .toLowerCase()
    .split(",")
    .map((entry) => entry.trim())
    .includes(directive);
}

export function analyzeMetaTags($: CheerioAPI): MetaTagsAnalysis {
  const ogMissing = REQUIRED_OG_TAGS.filter((tag) => !getMetaContent($, `meta[property='${tag}']`));

  const canonicalUrl = $("link[rel='canonical']").attr("href")?.trim();
  const viewport = getMetaContent($, "meta[name='viewport']");

  const robots = getMetaContent($, "meta[name='robots']");
  const googleBot = getMetaContent($, "meta[name='googlebot']");
  const noaiMeta = getMetaContent($, "meta[name='noai']");
  const noImageAiMeta = getMetaContent($, "meta[name='noimageai']");

  const publicationDate =
    getMetaContent($, "meta[property='article:published_time']") ??
    getMetaContent($, "meta[name='datePublished']") ??
    $("time[datetime]").first().attr("datetime")?.trim();

  const modifiedDate =
    getMetaContent($, "meta[property='article:modified_time']") ??
    getMetaContent($, "meta[name='last-modified']") ??
    getMetaContent($, "meta[name='dateModified']");

  const hasMetaAuthor =
    !!getMetaContent($, "meta[name='author']") ||
    $("link[rel='author']").length > 0 ||
    !!getMetaContent($, "meta[property='article:author']");

  return {
    ogTagsPresent: ogMissing.length === 0,
    ogMissing,
    hasCanonical: !!canonicalUrl,
    canonicalUrl,
    hasViewport: !!viewport,
    hasNoAiDirectives:
      hasDirective(robots, "noai") ||
      hasDirective(robots, "noimageai") ||
      hasDirective(googleBot, "noai") ||
      hasDirective(googleBot, "noimageai") ||
      !!noaiMeta ||
      !!noImageAiMeta,
    publicationDate,
    modifiedDate,
    hasMetaAuthor
  };
}
