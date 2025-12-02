import { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

/**
 * Gets the original host that the user sees in their browser URL.
 * When using rewrites this function prioritizes forwarded headers that preserve the original host.
 *
 * @returns The host string (e.g., "zitadel.com")
 * @throws Error if no host is found
 */
export function getInstanceHost(headers: ReadonlyHeaders): string {
  // use standard proxy headers (x-forwarded-host → host) for both multi-tenant and self-hosted, do not use x-zitadel-instance-host
  // use x-zitadel-forward-host as fallback
  const instanceHost =
    headers.get("x-zitadel-instance-host") ||
    headers.get("x-zitadel-forward-host") ||
    headers.get("x-forwarded-host") ||
    headers.get("host");

  if (!instanceHost || typeof instanceHost !== "string") {
    throw new Error("No host found in headers");
  }

  return instanceHost;
}

/**
 * Gets the original host with protocol prefix.
 * Automatically detects if localhost should use http:// or https://
 *
 * @returns The full URL prefix (e.g., "https://zitadel.com")
 */
export function getOriginalHostWithProtocol(headers: ReadonlyHeaders): string {
  const host = getInstanceHost(headers);
  const protocol = host.includes("localhost") ? "http://" : "https://";
  return `${protocol}${host}`;
}

/**
 * Gets the public host that the user sees in their browser URL.
 * Only considers standard proxy headers (x-forwarded-host and host).
 * Does NOT include x-zitadel-instance-host.
 *
 * Use this when you need the public-facing host that the user actually sees,
 * not the internal instance host used for API routing.
 *
 * @returns The public host string (e.g., "accounts.company.com")
 * @throws Error if no host is found
 */
export function getPublicHost(headers: ReadonlyHeaders): string {
  // Only use standard proxy headers (x-forwarded-host → host)
  // Do NOT use x-zitadel-instance-host as it may differ from what the user sees
  const publicHost = headers.get("x-forwarded-host") || headers.get("host");

  if (!publicHost || typeof publicHost !== "string") {
    throw new Error("No host found in headers");
  }

  return publicHost;
}
