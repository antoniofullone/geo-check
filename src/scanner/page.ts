import type { PageScanResult } from "../types.js";
import { fetchWithRedirects } from "./http.js";

function headersToObject(headers: Headers): Record<string, string> {
  const output: Record<string, string> = {};
  headers.forEach((value, key) => {
    output[key.toLowerCase()] = value;
  });
  return output;
}

export async function fetchPage(
  url: string,
  options?: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    maxRedirects?: number;
  }
): Promise<PageScanResult> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  const maxRedirects = options?.maxRedirects ?? 5;
  const start = Date.now();

  try {
    const { response, finalUrl } = await fetchWithRedirects(url, {
      fetchImpl: options?.fetchImpl,
      timeoutMs,
      maxRedirects
    });

    const html = await response.text();

    return {
      requestedUrl: url,
      finalUrl,
      statusCode: response.status,
      ok: response.ok,
      html,
      headers: headersToObject(response.headers),
      loadTimeMs: Date.now() - start,
      error: response.ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      requestedUrl: url,
      finalUrl: url,
      statusCode: null,
      ok: false,
      html: "",
      headers: {},
      loadTimeMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown fetch error"
    };
  }
}
