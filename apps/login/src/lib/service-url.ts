import { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { NextRequest } from "next/server";
import { isMultiTenant } from "./deployment";
import { ServiceConfig } from "./zitadel";

/**
 * Extracts the service URL based on deployment mode and configuration.
 *
 * Priority:
 * 1. ZITADEL_API_URL (required) - Used by both self-hosted and multi-tenant
 * 2. x-zitadel-forward-host (multi-tenant only) - Set by Zitadel proxy
 * 3. host header (multi-tenant fallback) - For dynamic host resolution
 *
 * @param headers - Request headers
 * @returns Object containing the service Configuration
 * @throws Error if the service Configuration could not be determined
 */

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export function getServiceConfig(headers: ReadonlyHeaders): { serviceConfig: ServiceConfig } {
  if (!process.env.ZITADEL_API_URL) {
    throw new Error("ZITADEL_API_URL is not set");
  }

  let instanceHost, publicHost;
  // Multi-tenant deployment: use forwarded host from Zitadel proxy
  const forwardedHost = headers.get("x-zitadel-forward-host");

  if (!forwardedHost) {
    return {
      serviceConfig: {
        baseUrl: process.env.ZITADEL_API_URL,
      },
    };
  } else {
    instanceHost = forwardedHost;

    const host = headers.get("host");

    if (!host) {
      throw new Error("host is not set");
    }

    const [hostname] = host.split(":");
    if (hostname !== "localhost") {
      publicHost = host;
    }

    if (!publicHost) {
      throw new Error("Service URL could not be determined in multi-tenant mode");
    }
  }

  return {
    serviceConfig: {
      baseUrl: process.env.ZITADEL_API_URL,
      instanceHost: stripProtocol(instanceHost),
      publicHost: stripProtocol(publicHost),
    },
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
