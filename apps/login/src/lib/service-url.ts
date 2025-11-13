import { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { NextRequest } from "next/server";
import { isMultiTenant } from "./deployment";

/**
 * Extracts the service URL based on deployment mode and configuration.
 *
 * Priority:
 * 1. ZITADEL_API_URL (if set) - Used by both self-hosted and future multi-tenant
 * 2. x-zitadel-forward-host (multi-tenant only) - Set by ZITADEL proxy
 * 3. host header (multi-tenant fallback) - For dynamic host resolution
 *
 * ⚠️ SECURITY: Self-hosted deployments MUST set ZITADEL_API_URL.
 * No fallback to host header for self-hosted to prevent host header injection.
 *
 * @param headers - Request headers
 * @returns Object containing the service URL
 * @throws Error if the service URL could not be determined
 */
export function getServiceUrlFromHeaders(headers: ReadonlyHeaders): {
  serviceUrl: string;
} {
  let instanceUrl;

  // Priority: 1) ZITADEL_API_URL (if set) 2) x-zitadel-forward-host (multi-tenant only)
  if (process.env.ZITADEL_API_URL) {
    // Use configured API URL when available (both self-hosted and future multi-tenant internal)
    instanceUrl = process.env.ZITADEL_API_URL;
  } else if (isMultiTenant()) {
    // Multi-tenant without API URL: use forwarded host from ZITADEL proxy
    const forwardedHost = headers.get("x-zitadel-forward-host");
    if (forwardedHost) {
      instanceUrl =
        forwardedHost.startsWith("http://") || forwardedHost.startsWith("https://")
          ? forwardedHost
          : `https://${forwardedHost}`;
    } else {
      const host = headers.get("host");

      if (host) {
        const [hostname] = host.split(":");
        if (hostname !== "localhost") {
          instanceUrl = host.startsWith("http://") || host.startsWith("https://") ? host : `https://${host}`;
        }
      }
    }
  }

  if (!instanceUrl) {
    throw new Error("Service URL could not be determined");
  }

  return {
    serviceUrl: instanceUrl,
  };
}

export function constructUrl(request: NextRequest, path: string) {
  const forwardedProto = request.headers.get("x-forwarded-proto")
    ? `${request.headers.get("x-forwarded-proto")}:`
    : request.nextUrl.protocol;

  const forwardedHost =
    request.headers.get("x-zitadel-forward-host") ?? request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return new URL(`${basePath}${path}`, `${forwardedProto}//${forwardedHost}`);
}
