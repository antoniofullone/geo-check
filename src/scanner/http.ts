const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface FetchWithRedirectsOptions {
  fetchImpl?: typeof fetch;
  timeoutMs: number;
  maxRedirects: number;
  headers?: HeadersInit;
}

export interface FetchWithRedirectsResult {
  response: Response;
  finalUrl: string;
}

export async function fetchWithRedirects(
  initialUrl: string,
  options: FetchWithRedirectsOptions
): Promise<FetchWithRedirectsResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let currentUrl = initialUrl;

  for (let redirects = 0; redirects <= options.maxRedirects; redirects += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetchImpl(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "geo-check/1.0.0",
          accept: "text/html,text/plain,*/*",
          ...options.headers
        }
      });

      if (!REDIRECT_STATUSES.has(response.status)) {
        return { response, finalUrl: currentUrl };
      }

      const location = response.headers.get("location");
      if (!location) {
        return { response, finalUrl: currentUrl };
      }

      if (redirects === options.maxRedirects) {
        throw new Error(`Too many redirects (>${options.maxRedirects})`);
      }

      currentUrl = new URL(location, currentUrl).toString();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Too many redirects (>${options.maxRedirects})`);
}
