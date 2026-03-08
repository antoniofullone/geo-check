export type BotStatus = "allowed" | "blocked" | "partially_blocked" | "not_mentioned";

export type BotPurpose = "Training" | "Search" | "Both" | "Browse" | "Reference";

export interface AIBot {
  name: string;
  userAgent: string;
  company: string;
  purpose: BotPurpose;
  docsUrl: string;
}

export interface BotAccessResult {
  bot: AIBot;
  status: BotStatus;
  rules: string[];
}

export interface RobotsSummary {
  totalBots: number;
  allowed: number;
  blocked: number;
  partiallyBlocked: number;
  notMentioned: number;
}

export interface RobotsAnalysis {
  url: string;
  found: boolean;
  rawContent: string;
  botResults: BotAccessResult[];
  summary: RobotsSummary;
  sitemaps: string[];
  warnings: string[];
}

export interface PageScanResult {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number | null;
  ok: boolean;
  html: string;
  headers: Record<string, string>;
  loadTimeMs: number;
  error?: string;
}

export interface HeaderAnalysis {
  present: string[];
  missing: string[];
}

export interface Check {
  id: string;
  name: string;
  passed: boolean;
  points: number;
  maxPoints: number;
  detail: string;
  fix?: string;
}

export interface CategoryScore {
  score: number;
  maxScore: number;
  checks: Check[];
}

export interface Recommendation {
  priority: "high" | "medium" | "low";
  category: string;
  message: string;
  impact: string;
  checkId: string;
}

export interface GEOScore {
  total: number;
  grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
  categories: {
    structuredData: CategoryScore;
    contentStructure: CategoryScore;
    authoritySignals: CategoryScore;
    aiAccessibility: CategoryScore;
  };
  recommendations: Recommendation[];
}

export interface GeoCheckOptions {
  robotsOnly?: boolean;
  geoOnly?: boolean;
  verbose?: boolean;
  concurrency?: number;
  fetchImpl?: typeof fetch;
}

export interface GeoCheckResult {
  schemaVersion: "1.0.0";
  targetUrl: string;
  scannedAt: string;
  durationMs: number;
  robots: RobotsAnalysis | null;
  geoScore: GEOScore | null;
  recommendations: Recommendation[];
  monitor: "https://www.summalytics.ai";
  warnings: string[];
  errors: string[];
  success: boolean;
}

export interface StructuredDataAnalysis {
  hasJsonLd: boolean;
  validJsonLd: boolean;
  schemaTypes: string[];
  hasOrganizationSchema: boolean;
  hasAuthorProperty: boolean;
  hasDatePublished: boolean;
  hasDateModified: boolean;
}

export interface MetaTagsAnalysis {
  ogTagsPresent: boolean;
  ogMissing: string[];
  hasCanonical: boolean;
  canonicalUrl?: string;
  hasViewport: boolean;
  hasNoAiDirectives: boolean;
  publicationDate?: string;
  modifiedDate?: string;
  hasMetaAuthor: boolean;
}

export interface ContentQualityAnalysis {
  h1Count: number;
  headingHierarchyLogical: boolean;
  wordCount: number;
  avgParagraphWords: number;
  hasLists: boolean;
  hasTablesWithHeaders: boolean;
  internalLinks: number;
  externalLinks: number;
  hasAuthorSignal: boolean;
  hasMeaningfulHtmlContent: boolean;
}

export interface TechnicalAnalysis {
  isHttps: boolean;
  loadUnder3Seconds: boolean;
}
