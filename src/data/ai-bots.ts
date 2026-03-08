import type { AIBot } from "../types.js";

export const aiBots: AIBot[] = [
  {
    name: "GPTBot",
    userAgent: "GPTBot",
    company: "OpenAI",
    purpose: "Both",
    docsUrl: "https://platform.openai.com/docs/bots"
  },
  {
    name: "OAI-SearchBot",
    userAgent: "OAI-SearchBot",
    company: "OpenAI",
    purpose: "Search",
    docsUrl: "https://platform.openai.com/docs/bots"
  },
  {
    name: "ChatGPT-User",
    userAgent: "ChatGPT-User",
    company: "OpenAI",
    purpose: "Browse",
    docsUrl: "https://platform.openai.com/docs/bots"
  },
  {
    name: "ClaudeBot",
    userAgent: "ClaudeBot",
    company: "Anthropic",
    purpose: "Training",
    docsUrl: "https://support.anthropic.com/en/articles/8896518" 
  },
  {
    name: "anthropic-ai",
    userAgent: "anthropic-ai",
    company: "Anthropic",
    purpose: "Training",
    docsUrl: "https://support.anthropic.com/en/articles/8896518"
  },
  {
    name: "PerplexityBot",
    userAgent: "PerplexityBot",
    company: "Perplexity",
    purpose: "Search",
    docsUrl: "https://docs.perplexity.ai/docs/perplexitybot"
  },
  {
    name: "Google-Extended",
    userAgent: "Google-Extended",
    company: "Google",
    purpose: "Training",
    docsUrl: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers"
  },
  {
    name: "Googlebot",
    userAgent: "Googlebot",
    company: "Google",
    purpose: "Reference",
    docsUrl: "https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers"
  },
  {
    name: "Bytespider",
    userAgent: "Bytespider",
    company: "ByteDance",
    purpose: "Training",
    docsUrl: "https://www.bytedance.com/en/robot"
  },
  {
    name: "CCBot",
    userAgent: "CCBot",
    company: "Common Crawl",
    purpose: "Training",
    docsUrl: "https://commoncrawl.org/ccbot"
  },
  {
    name: "FacebookBot",
    userAgent: "FacebookBot",
    company: "Meta",
    purpose: "Training",
    docsUrl: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers"
  },
  {
    name: "Meta-ExternalAgent",
    userAgent: "Meta-ExternalAgent",
    company: "Meta",
    purpose: "Training",
    docsUrl: "https://developers.facebook.com/docs/sharing/webmasters/web-crawlers"
  },
  {
    name: "Amazonbot",
    userAgent: "Amazonbot",
    company: "Amazon",
    purpose: "Training",
    docsUrl: "https://developer.amazon.com/support/amazonbot"
  },
  {
    name: "Cohere-ai",
    userAgent: "cohere-ai",
    company: "Cohere",
    purpose: "Training",
    docsUrl: "https://docs.cohere.com/docs/crawlers"
  },
  {
    name: "YouBot",
    userAgent: "YouBot",
    company: "You.com",
    purpose: "Search",
    docsUrl: "https://about.you.com/youbot/"
  },
  {
    name: "Applebot-Extended",
    userAgent: "Applebot-Extended",
    company: "Apple",
    purpose: "Training",
    docsUrl: "https://support.apple.com/en-us/119829"
  },
  {
    name: "Diffbot",
    userAgent: "Diffbot",
    company: "Diffbot",
    purpose: "Training",
    docsUrl: "https://docs.diffbot.com/docs/using-robots-txt"
  }
];
