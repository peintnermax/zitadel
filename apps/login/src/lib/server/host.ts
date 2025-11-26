import { headers } from "next/headers";

/**
 * List of trusted hosts that are allowed to be used in URLs (e.g., password reset links).
 * This prevents host header injection attacks where an attacker could manipulate headers
 * to redirect users to malicious sites.
 *
 * ⚠️ SECURITY: Set TRUSTED_HOSTS env var to enable validation.
 *
 * Set TRUSTED_HOSTS env var to:
 * - Comma-separated list of hosts: "example.com,*.example.com,localhost"
 * - Undefined/not set: disables validation (relies on reverse proxy security)
 */
const TRUSTED_HOSTS = process.env.TRUSTED_HOSTS ? process.env.TRUSTED_HOSTS.split(",").map((h) => h.trim()) : null; // Not set: disable validation (rely on reverse proxy)

/**
 * Validates that a host is in the trusted hosts list.
 * Supports exact matches and wildcard subdomains.
 *
 * @param host - The host to validate
 * @returns true if host is trusted or validation is disabled, false otherwise
 */
function isTrustedHost(host: string): boolean {
  // If TRUSTED_HOSTS is null, validation is disabled (set via TRUSTED_HOSTS="")
  if (TRUSTED_HOSTS === null) {
    return true;
  }

  // Direct match
  if (TRUSTED_HOSTS.includes(host)) {
    return true;
  }

  // Check for wildcard subdomain matches (e.g., "*.yourdomain.com")
  return TRUSTED_HOSTS.some((trustedHost) => {
    if (trustedHost.startsWith("*.")) {
      const domain = trustedHost.slice(2); // Remove "*."
      return host.endsWith(`.${domain}`) || host === domain;
    }
    return false;
  });
}

/**
 * Gets the original host that the user sees in their browser URL.
 * When using rewrites this function prioritizes forwarded headers that preserve the original host.
 *
 * ⚠️ SECURITY: Host validation is disabled by default. Set TRUSTED_HOSTS to enable.
 * Configure via TRUSTED_HOSTS environment variable:
 * - Set to comma-separated list: "example.com,*.example.com" (enables validation)
 * - Leave unset to disable validation (relies on reverse proxy security)
 *
 * @returns The host string (e.g., "zitadel.com")
 * @throws Error if no host is found or if host is not trusted (when validation enabled)
 */
export async function getOriginalHost(): Promise<string> {
  const _headers = await headers();

  let host: string | null;

  // use standard proxy headers (x-forwarded-host → host) for both multi-tenant and self-hosted
  host = _headers.get("x-forwarded-host") || _headers.get("host");

  if (!host || typeof host !== "string") {
    throw new Error("No host found in headers");
  }

  // SECURITY: Validate against trusted hosts to prevent host header injection
  if (!isTrustedHost(host)) {
    console.warn(`[SECURITY] Untrusted host rejected: ${host}`);
    throw new Error(`Untrusted host: ${host}`);
  }

  return host;
}

/**
 * Gets the original host with protocol prefix.
 * Automatically detects if localhost should use http:// or https://
 *
 * @returns The full URL prefix (e.g., "https://zitadel.com")
 */
export async function getOriginalHostWithProtocol(): Promise<string> {
  const host = await getOriginalHost();
  const protocol = host.includes("localhost") ? "http://" : "https://";
  return `${protocol}${host}`;
}
