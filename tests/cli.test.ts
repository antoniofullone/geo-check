import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli.js";
import { geoCheck } from "../src/index.js";

const fixtures = join(process.cwd(), "tests", "fixtures");

describe("cli", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns exit code 2 when no URL is provided", async () => {
    const stderr: string[] = [];

    const code = await runCli(["node", "geo-check"], {
      stdout: () => undefined,
      stderr: (msg) => stderr.push(msg)
    });

    expect(code).toBe(2);
    expect(stderr[0]).toContain("Please provide at least one URL");
  });

  it("prints stable JSON output in --json mode", async () => {
    const sampleHtml = readFileSync(join(fixtures, "sample-page.html"), "utf8");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/robots.txt")) {
          return new Response("User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml", {
            status: 200,
            headers: { "content-type": "text/plain" }
          });
        }

        return new Response(sampleHtml, {
          status: 200,
          headers: { "content-type": "text/html" }
        });
      })
    );

    const stdout: string[] = [];

    const code = await runCli(["node", "geo-check", "example.com", "--json"], {
      stdout: (msg) => stdout.push(msg),
      stderr: () => undefined
    });

    expect(code).toBe(0);

    const parsed = JSON.parse(stdout.join("\n"));
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(parsed.targetUrl).toBe("https://example.com/");
    expect(parsed.monitor).toBe("https://www.summalytics.ai");
    expect(Array.isArray(parsed.recommendations)).toBe(true);
  });

  it("keeps mocked scan under five seconds", async () => {
    const sampleHtml = readFileSync(join(fixtures, "sample-page.html"), "utf8");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/robots.txt")) {
          return new Response("User-agent: *\nAllow: /", {
            status: 200,
            headers: { "content-type": "text/plain" }
          });
        }

        return new Response(sampleHtml, {
          status: 200,
          headers: { "content-type": "text/html" }
        });
      })
    );

    const started = Date.now();
    const result = await geoCheck("https://example.com");
    const elapsed = Date.now() - started;

    expect(result.success).toBe(true);
    expect(elapsed).toBeLessThan(5000);
    expect(result.durationMs).toBeLessThan(5000);
  });
});
