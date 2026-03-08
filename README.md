# geo-check

AI Visibility Scanner for websites: detect AI crawler access via `robots.txt` and compute a GEO (Generative Engine Optimization) readiness score.

[![npm version](https://img.shields.io/npm/v/geo-check.svg)](https://www.npmjs.com/package/geo-check)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/antoniofullone/geo-check?style=social)](https://github.com/antoniofullone/geo-check)

## Demo GIF

![geo-check demo](https://raw.githubusercontent.com/antoniofullone/geo-check/main/docs/demo.gif)

Record/update demo with VHS using [`demo/vhs.tape`](./demo/vhs.tape).

## Quick Start

```bash
npx geo-check https://your-site.com
```

## What It Checks

| AI Bot Access | GEO Readiness Score |
|---|---|
| Which AI crawlers are allowed, blocked, partially blocked, or not mentioned in `robots.txt`. | Structured data, content structure, authority signals, and AI accessibility signals scored 0-100. |

## Sample Output

```text
┌─────────────────────────────────────────────────────┐
│                  geo-check v1.0.0                  │
│               AI Visibility Scanner                │
│            https://www.summalytics.ai             │
└─────────────────────────────────────────────────────┘

Scanning https://example.com ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 GEO READINESS SCORE: 72/100 (B+)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Structured Data     ████████░░░░  18/25
  Content Structure   ██████████░░  21/25
  Authority Signals   █████████░░░  19/25
  AI Accessibility    ██████░░░░░░  14/25
```

## Installation

### npx (zero install)

```bash
npx geo-check https://example.com
```

### Global install

```bash
npm install -g geo-check
geo-check https://example.com
```

### Programmatic usage

```ts
import { geoCheck } from "geo-check";

const result = await geoCheck("https://example.com");
console.log(result.geoScore?.total);
```

## CLI Options

| Option | Description |
|---|---|
| `--json` | Output stable machine-readable JSON (`schemaVersion: "1.0.0"`) |
| `--robots-only` | Only run robots/bot-access analysis |
| `--geo-only` | Only output GEO score sections |
| `--verbose` | Include all checks in terminal output |

## API Reference

```ts
export async function geoCheck(url: string, options?: GeoCheckOptions): Promise<GeoCheckResult>;
export async function geoCheckMany(urls: string[], options?: GeoCheckOptions): Promise<GeoCheckResult[]>;
export { aiBots } from "geo-check/bots";
```

`GeoCheckResult` (stable keys):

- `schemaVersion`
- `targetUrl`
- `scannedAt`
- `durationMs`
- `robots`
- `geoScore`
- `recommendations`
- `monitor`
- `warnings`
- `errors`
- `success`

## Agent Skill

This repo ships a `SKILL.md` for Claude/Codex-style agent workflows.

- Use when users ask to audit AI visibility, AI crawler policy, or GEO readiness.
- Typical command: `npx geo-check <url> --json`

## AI Bot Database

Importable via:

```ts
import { aiBots } from "geo-check/bots";
```

Tracked bots in v1:

| Bot | User-Agent | Company | Purpose |
|---|---|---|---|
| GPTBot | `GPTBot` | OpenAI | Both |
| OAI-SearchBot | `OAI-SearchBot` | OpenAI | Search |
| ChatGPT-User | `ChatGPT-User` | OpenAI | Browse |
| ClaudeBot | `ClaudeBot` | Anthropic | Training |
| anthropic-ai | `anthropic-ai` | Anthropic | Training |
| PerplexityBot | `PerplexityBot` | Perplexity | Search |
| Google-Extended | `Google-Extended` | Google | Training |
| Googlebot | `Googlebot` | Google | Reference |
| Bytespider | `Bytespider` | ByteDance | Training |
| CCBot | `CCBot` | Common Crawl | Training |
| FacebookBot | `FacebookBot` | Meta | Training |
| Meta-ExternalAgent | `Meta-ExternalAgent` | Meta | Training |
| Amazonbot | `Amazonbot` | Amazon | Training |
| Cohere-ai | `cohere-ai` | Cohere | Training |
| YouBot | `YouBot` | You.com | Search |
| Applebot-Extended | `Applebot-Extended` | Apple | Training |
| Diffbot | `Diffbot` | Diffbot | Training |

## Scoring Methodology

Each category is scored out of 25 points:

1. Structured Data (25)
2. Content Structure (25)
3. Authority Signals (25)
4. AI Accessibility (25)

Total score: `0-100`, with grades:

- `A+`: 95-100
- `A`: 90-94
- `B+`: 80-89
- `B`: 70-79
- `C`: 60-69
- `D`: 40-59
- `F`: 0-39

Recommendation priority:

- `high`: missing `>=5` points
- `medium`: missing `3-4` points
- `low`: missing `1-2` points

## Roadmap

- [ ] Sitemap deep crawl across all pages
- [ ] AI search citation checker
- [ ] Historical score tracking
- [ ] CI/CD quality gate mode
- [ ] CMS plugins (WordPress/Next.js/Astro)
- [ ] Browser extension
- [ ] Slack/Discord integration

## Contributing

Contributions are welcome.

1. Fork and branch from `main`.
2. Run `npm install`.
3. Run `npm run lint && npm run test` before PR.
4. For bot DB updates, edit `src/data/ai-bots.ts` and add/adjust tests in `tests/robots.test.ts`.
5. Open a PR with sources for crawler docs changes.

## Summalytics

Built by the team behind [Summalytics.ai](https://www.summalytics.ai).

`geo-check` gives a one-time visibility snapshot. For ongoing monitoring, AI traffic analytics, alerts, and benchmarks, use [Summalytics.ai](https://www.summalytics.ai).

## Development

```bash
npm install
npm run lint
npm run test
npm run build
npx tsx src/cli.ts https://example.com
```
