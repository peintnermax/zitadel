import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { getServiceConfig, constructUrl } from "./service-url";
import { NextRequest } from "next/server";

describe("Service URL utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getServiceConfig - Security", () => {
    test("should NOT use x-zitadel-forward-host in self-hosted mode", () => {
      // Self-hosted mode (no ZITADEL_CLOUD)
      process.env.ZITADEL_CLOUD = undefined as any;
      process.env.ZITADEL_API_URL = undefined as any;

      const mockHeaders = {
        get: vi.fn((key: string) => {
          if (key === "x-zitadel-forward-host") return "attacker.evil.com";
          if (key === "host") return "legitimate.com";
          return null;
        }),
      } as any;

      // Should throw because ZITADEL_API_URL is required for self-hosted
      expect(() => getServiceConfig(mockHeaders)).toThrow("Service URL could not be determined");
    });

    test("should use x-zitadel-forward-host ONLY in multi-tenant mode", () => {
      // Multi-tenant mode
      process.env.ZITADEL_CLOUD = "true";
      process.env.ZITADEL_API_URL = undefined as any;

      const mockHeaders = {
        get: vi.fn((key: string) => {
          if (key === "x-zitadel-forward-host") return "accounts.zitadel.cloud";
          return null;
        }),
      } as any;

      const result = getServiceConfig(mockHeaders);

      expect(result.serviceConfig.baseUrl).toBe("https://accounts.zitadel.cloud");
      expect(mockHeaders.get).toHaveBeenCalledWith("x-zitadel-forward-host");
    });

    test("should prioritize ZITADEL_API_URL over x-zitadel-forward-host in multi-tenant", () => {
      // Multi-tenant with explicit API URL
      process.env.ZITADEL_CLOUD = "true";
      process.env.ZITADEL_API_URL = "https://api.zitadel.cloud";

      const mockHeaders = {
        get: vi.fn((key: string) => {
          if (key === "x-zitadel-forward-host") return "should-not-be-used.com";
          return null;
        }),
      } as any;

      const result = getServiceConfig(mockHeaders);

      expect(result.serviceConfig.baseUrl).toBe("https://api.zitadel.cloud");
      // Should not even check x-zitadel-forward-host when API URL is set
    });

    test("should require ZITADEL_API_URL for self-hosted mode", () => {
      // Self-hosted mode
      process.env.ZITADEL_CLOUD = undefined as any;
      process.env.ZITADEL_API_URL = undefined as any;

      const mockHeaders = {
        get: vi.fn(() => null),
      } as any;

      expect(() => getServiceConfig(mockHeaders)).toThrow("Service URL could not be determined");
    });
  });

  describe("constructUrl - Security", () => {
    test("should NOT use x-zitadel-forward-host in self-hosted mode", () => {
      // Self-hosted mode
      process.env.ZITADEL_CLOUD = undefined as any;

      const mockRequest = {
        headers: {
          get: vi.fn((key: string) => {
            if (key === "x-zitadel-forward-host") return "attacker.evil.com";
            if (key === "x-forwarded-host") return "legitimate.com";
            if (key === "x-forwarded-proto") return "https";
            return null;
          }),
        },
        nextUrl: {
          protocol: "https:",
        },
      } as any;

      const result = constructUrl(mockRequest as NextRequest, "/test");

      // Should use x-forwarded-host, NOT x-zitadel-forward-host
      expect(result.hostname).toBe("legitimate.com");
      expect(result.hostname).not.toBe("attacker.evil.com");
    });

    test("should use x-zitadel-forward-host ONLY in multi-tenant mode", () => {
      // Multi-tenant mode
      process.env.ZITADEL_CLOUD = "true";

      const mockRequest = {
        headers: {
          get: vi.fn((key: string) => {
            if (key === "x-zitadel-forward-host") return "accounts.zitadel.cloud";
            if (key === "x-forwarded-proto") return "https";
            return null;
          }),
        },
        nextUrl: {
          protocol: "https:",
        },
      } as any;

      const result = constructUrl(mockRequest as NextRequest, "/test");

      expect(result.hostname).toBe("accounts.zitadel.cloud");
    });

    test("should fall back to x-forwarded-host in self-hosted when x-zitadel-forward-host is ignored", () => {
      // Self-hosted mode
      process.env.ZITADEL_CLOUD = undefined as any;

      const mockRequest = {
        headers: {
          get: vi.fn((key: string) => {
            if (key === "x-zitadel-forward-host") return "evil.com"; // Should be ignored
            if (key === "x-forwarded-host") return "mycompany.com"; // Should be used
            if (key === "x-forwarded-proto") return "https";
            return null;
          }),
        },
        nextUrl: {
          protocol: "https:",
        },
      } as any;

      const result = constructUrl(mockRequest as NextRequest, "/oauth/authorize");

      expect(result.hostname).toBe("mycompany.com");
      expect(result.pathname).toBe("/oauth/authorize");
    });
  });
});
