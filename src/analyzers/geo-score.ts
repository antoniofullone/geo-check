import { load } from "cheerio";
import type { GEOScore, RobotsAnalysis } from "../types.js";
import { buildBotAccessCheck, buildNotMentionedRecommendation, buildSitemapCheck } from "./bot-access.js";
import { analyzeContentQuality } from "./content-quality.js";
import { analyzeMetaTags } from "./meta-tags.js";
import { analyzeStructuredData } from "./structured-data.js";
import { analyzeTechnical } from "./technical.js";
import { calculateCategoryScore, calculateGrade, recommendationsFromChecks } from "../scoring/calculator.js";

const RELEVANT_SCHEMA_TYPES = ["Article", "FAQPage", "HowTo", "Product", "Organization"];

function hasType(types: string[], target: string): boolean {
  return types.some((type) => type.toLowerCase() === target.toLowerCase());
}

function check(id: string, name: string, points: number, maxPoints: number, detail: string, fix: string) {
  return {
    id,
    name,
    passed: points >= maxPoints,
    points,
    maxPoints,
    detail,
    fix
  };
}

export function analyzeGeoScore(input: {
  html: string;
  finalUrl: string;
  loadTimeMs: number;
  robots: RobotsAnalysis;
}): GEOScore {
  const $ = load(input.html || "");

  const structured = analyzeStructuredData($);
  const meta = analyzeMetaTags($);
  const content = analyzeContentQuality($, input.finalUrl);
  const technical = analyzeTechnical({ finalUrl: input.finalUrl, loadTimeMs: input.loadTimeMs });

  const matchedSchemaCount = RELEVANT_SCHEMA_TYPES.filter((schemaType) =>
    hasType(structured.schemaTypes, schemaType)
  ).length;

  const structuredChecks = [
    check(
      "structured.jsonld_present",
      "JSON-LD present",
      structured.hasJsonLd ? 8 : 0,
      8,
      structured.hasJsonLd ? "Found JSON-LD script blocks." : "No JSON-LD script detected.",
      "Add JSON-LD structured data to key pages."
    ),
    check(
      "structured.schema_types",
      "Relevant Schema.org types",
      Math.min(10, matchedSchemaCount * 5),
      10,
      matchedSchemaCount > 0
        ? `Found relevant schema types: ${RELEVANT_SCHEMA_TYPES.filter((schemaType) => hasType(structured.schemaTypes, schemaType)).join(", ")}`
        : "No relevant schema types found (Article, FAQPage, HowTo, Product, Organization).",
      "Add relevant Schema.org types (Article, FAQPage, HowTo, Product, Organization)."
    ),
    check(
      "structured.jsonld_valid",
      "Valid JSON-LD syntax",
      structured.validJsonLd ? 2 : 0,
      2,
      structured.validJsonLd ? "All JSON-LD blocks parsed successfully." : "JSON-LD missing or contains parse errors.",
      "Validate JSON-LD with a schema validator and fix parse errors."
    ),
    check(
      "structured.opengraph",
      "OpenGraph tags present",
      meta.ogTagsPresent ? 5 : 0,
      5,
      meta.ogTagsPresent
        ? "Found core OpenGraph tags (title, description, image, type)."
        : `Missing OpenGraph tags: ${meta.ogMissing.join(", ")}`,
      "Add complete OpenGraph tags: og:title, og:description, og:image, og:type."
    )
  ];

  const contentChecks = [
    check(
      "content.h1_single",
      "Single H1 present",
      content.h1Count === 1 ? 5 : 0,
      5,
      content.h1Count === 1 ? "Exactly one H1 found." : `Found ${content.h1Count} H1 elements.`,
      "Ensure each page has exactly one descriptive H1."
    ),
    check(
      "content.heading_hierarchy",
      "Logical heading hierarchy",
      content.headingHierarchyLogical ? 5 : 0,
      5,
      content.headingHierarchyLogical ? "Heading levels are sequential." : "Detected skipped heading levels (e.g., H2 to H4).",
      "Use sequential heading levels without skipping (H1 → H2 → H3)."
    ),
    check(
      "content.length_300_words",
      "Content length over 300 words",
      content.wordCount > 300 ? 3 : 0,
      3,
      `Detected ${content.wordCount} words.`,
      "Expand the page content to exceed 300 words of useful text."
    ),
    check(
      "content.short_paragraphs",
      "Average paragraph length under 150 words",
      content.avgParagraphWords > 0 && content.avgParagraphWords < 150 ? 3 : 0,
      3,
      `Average paragraph length is ${content.avgParagraphWords.toFixed(1)} words.`,
      "Break long paragraphs into shorter blocks for readability."
    ),
    check(
      "content.lists_present",
      "Bullet or numbered lists present",
      content.hasLists ? 2 : 0,
      2,
      content.hasLists ? "Found list elements." : "No bullet/numbered lists found.",
      "Use bullet or numbered lists to structure key points."
    ),
    check(
      "content.tables_with_headers",
      "Tables with headers present",
      content.hasTablesWithHeaders ? 2 : 0,
      2,
      content.hasTablesWithHeaders ? "Found table(s) with header cells." : "No data tables with headers detected.",
      "Add tables with <th> headers when presenting structured comparisons."
    ),
    check(
      "content.internal_links",
      "Internal links present",
      content.internalLinks > 0 ? 3 : 0,
      3,
      `Found ${content.internalLinks} internal links.`,
      "Add links to relevant internal pages to improve crawl pathways."
    ),
    check(
      "content.external_links",
      "External authoritative links present",
      content.externalLinks > 0 ? 2 : 0,
      2,
      `Found ${content.externalLinks} external links.`,
      "Add links to authoritative external sources where relevant."
    )
  ];

  const authorityChecks = [
    check(
      "authority.author_signal",
      "Author name or bio present",
      content.hasAuthorSignal || meta.hasMetaAuthor || structured.hasAuthorProperty ? 6 : 0,
      6,
      content.hasAuthorSignal || meta.hasMetaAuthor || structured.hasAuthorProperty
        ? "Detected author signals in page markup."
        : "No author information detected.",
      "Add an author name/bio and include structured author metadata."
    ),
    check(
      "authority.publication_date",
      "Publication date present",
      meta.publicationDate || structured.hasDatePublished ? 5 : 0,
      5,
      meta.publicationDate || structured.hasDatePublished
        ? `Publication date detected${meta.publicationDate ? ` (${meta.publicationDate})` : " in schema"}.`
        : "No publication date detected.",
      "Add datePublished in schema or article meta tags."
    ),
    check(
      "authority.last_modified",
      "Last modified date present",
      meta.modifiedDate || structured.hasDateModified ? 4 : 0,
      4,
      meta.modifiedDate || structured.hasDateModified
        ? `Last modified date detected${meta.modifiedDate ? ` (${meta.modifiedDate})` : " in schema"}.`
        : "No last modified date detected.",
      "Add dateModified / article:modified_time metadata."
    ),
    check(
      "authority.canonical",
      "Canonical URL set",
      meta.hasCanonical ? 4 : 0,
      4,
      meta.hasCanonical ? `Canonical URL: ${meta.canonicalUrl}` : "No canonical URL found.",
      "Add a canonical link tag to avoid duplicate-content ambiguity."
    ),
    check(
      "authority.https",
      "HTTPS enabled",
      technical.isHttps ? 3 : 0,
      3,
      technical.isHttps ? "Page is served via HTTPS." : "Page is not served via HTTPS.",
      "Serve pages over HTTPS."
    ),
    check(
      "authority.organization_schema",
      "Organization schema present",
      structured.hasOrganizationSchema ? 3 : 0,
      3,
      structured.hasOrganizationSchema ? "Organization schema detected." : "No Organization schema detected.",
      "Add Organization schema to establish publisher identity."
    )
  ];

  const aiChecks = [
    buildBotAccessCheck(input.robots),
    check(
      "ai.no_noai_tags",
      "No noai/noimageai directives",
      meta.hasNoAiDirectives ? 0 : 3,
      3,
      meta.hasNoAiDirectives
        ? "Detected noai/noimageai directives that may block AI usage."
        : "No restrictive noai/noimageai directives found.",
      "Remove noai/noimageai directives if you want AI systems to cite your content."
    ),
    buildSitemapCheck(input.robots),
    check(
      "ai.load_under_3s",
      "Page loads under 3 seconds",
      technical.loadUnder3Seconds ? 3 : 0,
      3,
      `Measured load time: ${input.loadTimeMs}ms.`,
      "Improve server and asset performance to stay below 3 seconds."
    ),
    check(
      "ai.viewport_meta",
      "Mobile viewport meta present",
      meta.hasViewport ? 3 : 0,
      3,
      meta.hasViewport ? "Viewport meta tag present." : "Viewport meta tag missing.",
      "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">."
    ),
    check(
      "ai.meaningful_html_content",
      "Meaningful raw HTML content present",
      content.hasMeaningfulHtmlContent ? 3 : 0,
      3,
      content.hasMeaningfulHtmlContent
        ? `Raw HTML includes ${content.wordCount} words of visible text.`
        : "Raw HTML has limited visible text and may rely on client-side rendering.",
      "Ensure important content is rendered in raw HTML, not only via JavaScript."
    )
  ];

  const structuredData = calculateCategoryScore(structuredChecks, 25);
  const contentStructure = calculateCategoryScore(contentChecks, 25);
  const authoritySignals = calculateCategoryScore(authorityChecks, 25);
  const aiAccessibility = calculateCategoryScore(aiChecks, 25);

  const total =
    structuredData.score + contentStructure.score + authoritySignals.score + aiAccessibility.score;

  const recommendations = recommendationsFromChecks([
    { category: "Structured Data", checks: structuredChecks },
    { category: "Content Structure", checks: contentChecks },
    { category: "Authority Signals", checks: authorityChecks },
    { category: "AI Accessibility", checks: aiChecks }
  ]);

  const notMentionedWarning = buildNotMentionedRecommendation(input.robots);
  if (notMentionedWarning) {
    recommendations.push(notMentionedWarning);
  }

  return {
    total,
    grade: calculateGrade(total),
    categories: {
      structuredData,
      contentStructure,
      authoritySignals,
      aiAccessibility
    },
    recommendations: recommendations.sort((left, right) => {
      const leftScore = Number.parseInt(left.impact.replace(/[^0-9]/g, ""), 10) || 0;
      const rightScore = Number.parseInt(right.impact.replace(/[^0-9]/g, ""), 10) || 0;
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      const order = { high: 0, medium: 1, low: 2 };
      return order[left.priority] - order[right.priority];
    })
  };
}
