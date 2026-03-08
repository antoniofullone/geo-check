import type { HeaderAnalysis } from "../types.js";

const SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy"
];

export function analyzeSecurityHeaders(headers: Record<string, string>): HeaderAnalysis {
  const present: string[] = [];
  const missing: string[] = [];

  for (const header of SECURITY_HEADERS) {
    if (headers[header]) {
      present.push(header);
    } else {
      missing.push(header);
    }
  }

  return { present, missing };
}
