import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { getOriginalHost, getOriginalHostWithProtocol } from "./host";

// Mock the Next.js headers function
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

describe("Host utility functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getOriginalHost", () => {
    describe("Multi-tenant mode (no ZITADEL_API_URL)", () => {
      beforeEach(() => {
        process.env.ZITADEL_API_URL = undefined as any;
      });

      test("should use x-zitadel-forward-host when available", async () => {
        const { headers } = await import("next/headers");
        const mockHeaders = {
          get: vi.fn((key: string) => {
            if (key === "x-zitadel-forward-host") return "accounts.zitadel.cloud";
            if (key === "host") return "internal.vercel.app";
            return null;
          }),
        };

        vi.mocked(headers).mockResolvedValue(mockHeaders as any);

        const result = await getOriginalHost();
        expect(result).toBe("accounts.zitadel.cloud");
        expect(mockHeaders.get).toHaveBeenCalledWith("x-zitadel-forward-host");
      });

      test("should fall back to host when x-zitadel-forward-host is not available", async () => {
        const { headers } = await import("next/headers");
        const mockHeaders = {
          get: vi.fn((key: string) => {
            if (key === "x-zitadel-forward-host") return null;
            if (key === "host") return "localhost:3000";
            return null;
          }),
        };

        vi.mocked(headers).mockResolvedValue(mockHeaders as any);

        const result = await getOriginalHost();
        expect(result).toBe("localhost:3000");
        expect(mockHeaders.get).toHaveBeenCalledWith("x-zitadel-forward-host");
        expect(mockHeaders.get).toHaveBeenCalledWith("host");
      });
    });

    describe("Self-hosted mode (with ZITADEL_API_URL)", () => {
      beforeEach(() => {
        process.env.ZITADEL_API_URL = "https://zitadel.mycompany.com";
      });

      afterEach(() => {
        process.env.ZITADEL_API_URL = undefined as any;
      });

      test("should use x-forwarded-host when available", async () => {
        const { headers } = await import("next/headers");
        const mockHeaders = {
          get: vi.fn((key: string) => {
            if (key === "x-forwarded-host") return "accounts.mycompany.com";
            if (key === "x-zitadel-forward-host") return "evil.com"; // Should be ignored
            if (key === "host") return "internal.server";
            return null;
          }),
        };

        vi.mocked(headers).mockResolvedValue(mockHeaders as any);

        const result = await getOriginalHost();
        expect(result).toBe("accounts.mycompany.com");
        expect(mockHeaders.get).toHaveBeenCalledWith("x-forwarded-host");
        expect(mockHeaders.get).not.toHaveBeenCalledWith("x-zitadel-forward-host");
      });

      test("should fall back to host when x-forwarded-host is not available", async () => {
        const { headers } = await import("next/headers");
        const mockHeaders = {
          get: vi.fn((key: string) => {
            if (key === "x-forwarded-host") return null;
            if (key === "host") return "localhost:3000";
            return null;
          }),
        };

        vi.mocked(headers).mockResolvedValue(mockHeaders as any);

        const result = await getOriginalHost();
        expect(result).toBe("localhost:3000");
        expect(mockHeaders.get).toHaveBeenCalledWith("x-forwarded-host");
        expect(mockHeaders.get).toHaveBeenCalledWith("host");
      });
    });

    test("should throw error when no host is found", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => null),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      await expect(getOriginalHost()).rejects.toThrow("No host found in headers");
    });

    test("should throw error when host is empty string", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => ""),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      await expect(getOriginalHost()).rejects.toThrow("No host found in headers");
    });

    test("should throw error when host is not a string", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => 123),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      await expect(getOriginalHost()).rejects.toThrow("No host found in headers");
    });

    describe("TRUSTED_HOSTS validation", () => {
      test("should accept any host when validation is disabled (TRUSTED_HOSTS not set)", async () => {
        process.env.TRUSTED_HOSTS = undefined as any;

        const { headers } = await import("next/headers");
        const mockHeaders = {
          get: vi.fn((key: string) => {
            if (key === "x-forwarded-host") return "any-host.com";
            return null;
          }),
        };

        vi.mocked(headers).mockResolvedValue(mockHeaders as any);

        const result = await getOriginalHost();
        expect(result).toBe("any-host.com");
      });

      test("should reject untrusted host when validation is enabled", async () => {
        process.env.TRUSTED_HOSTS = "trusted.com,*.trusted.com";

        const { headers } = await import("next/headers");
        const mockHeaders = {
          get: vi.fn(() => "untrusted.com"),
        };

        vi.mocked(headers).mockResolvedValue(mockHeaders as any);

        await expect(getOriginalHost()).rejects.toThrow("Untrusted host: untrusted.com");
      });

      test("should accept trusted host with wildcard", async () => {
        process.env.TRUSTED_HOSTS = "*.example.com,localhost";

        const { headers } = await import("next/headers");
        const mockHeaders = {
          get: vi.fn(() => "sub.example.com"),
        };

        vi.mocked(headers).mockResolvedValue(mockHeaders as any);

        const result = await getOriginalHost();
        expect(result).toBe("sub.example.com");
      });
    });
  });

  describe("getOriginalHostWithProtocol", () => {
    test("should return https for production domain", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "zitadel.com"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHostWithProtocol();
      expect(result).toBe("https://zitadel.com");
    });

    test("should return http for localhost", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "localhost:3000"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHostWithProtocol();
      expect(result).toBe("http://localhost:3000");
    });

    test("should return http for localhost without port", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "localhost"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHostWithProtocol();
      expect(result).toBe("http://localhost");
    });

    test("should return https for custom domain", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "auth.company.com"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHostWithProtocol();
      expect(result).toBe("https://auth.company.com");
    });
  });

  describe("Real-world scenarios", () => {
    test("should handle Vercel rewrite scenario", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn((key: string) => {
          // Simulate Vercel rewrite: zitadel.com/login -> login-zitadel-qa.vercel.app
          if (key === "x-forwarded-host") return "zitadel.com";
          if (key === "host") return "login-zitadel-qa.vercel.app";
          return null;
        }),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHostWithProtocol();
      expect(result).toBe("https://zitadel.com");
    });

    test("should handle CloudFlare proxy scenario", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn((key: string) => {
          if (key === "x-forwarded-host") return "auth.company.com";
          if (key === "x-original-host") return null;
          if (key === "host") return "cloudflare-worker.workers.dev";
          return null;
        }),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHost();
      expect(result).toBe("auth.company.com");
    });

    test("should handle development environment", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn((key: string) => {
          if (key === "host") return "localhost:3000";
          return null;
        }),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHostWithProtocol();
      expect(result).toBe("http://localhost:3000");
    });

    test("should handle staging environment with subdomain", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn((key: string) => {
          if (key === "x-forwarded-host") return "staging-auth.company.com";
          if (key === "host") return "staging-internal.vercel.app";
          return null;
        }),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHostWithProtocol();
      expect(result).toBe("https://staging-auth.company.com");
    });
  });

  describe("Edge cases", () => {
    test("should handle IPv4 addresses", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "192.168.1.100:3000"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHostWithProtocol();
      expect(result).toBe("https://192.168.1.100:3000");
    });

    test("should handle IPv6 addresses", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "[::1]:3000"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHostWithProtocol();
      expect(result).toBe("https://[::1]:3000");
    });

    test("should handle hosts with ports", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "zitadel.com:8080"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHostWithProtocol();
      expect(result).toBe("https://zitadel.com:8080");
    });

    test("should handle localhost with different ports", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "localhost:8080"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHostWithProtocol();
      expect(result).toBe("http://localhost:8080");
    });

    test("should handle priority order correctly", async () => {
      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn((key: string) => {
          // All headers are present, should return x-forwarded-host (highest priority)
          if (key === "x-forwarded-host") return "priority1.com";
          if (key === "x-original-host") return "priority2.com";
          if (key === "host") return "priority3.com";
          return null;
        }),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHost();
      expect(result).toBe("priority1.com");
      // Should only call x-forwarded-host since it's available
      expect(mockHeaders.get).toHaveBeenCalledWith("x-forwarded-host");
      expect(mockHeaders.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("Host validation security", () => {
    const originalEnv = process.env.TRUSTED_HOSTS;

    afterEach(() => {
      process.env.TRUSTED_HOSTS = originalEnv;
    });

    test("should reject untrusted host by default", async () => {
      process.env.TRUSTED_HOSTS = "trusted.com,localhost";

      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "evil.com"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      await expect(getOriginalHost()).rejects.toThrow("Untrusted host: evil.com");
    });

    test("should accept trusted host", async () => {
      process.env.TRUSTED_HOSTS = "trusted.com,accounts.company.com";

      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "accounts.company.com"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHost();
      expect(result).toBe("accounts.company.com");
    });

    test("should accept wildcard subdomain", async () => {
      process.env.TRUSTED_HOSTS = "*.company.com,company.com";

      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "auth.company.com"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHost();
      expect(result).toBe("auth.company.com");
    });

    test("should accept nested subdomain with wildcard", async () => {
      process.env.TRUSTED_HOSTS = "*.company.com";

      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "staging.auth.company.com"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHost();
      expect(result).toBe("staging.auth.company.com");
    });

    test("should accept root domain when wildcard is set", async () => {
      process.env.TRUSTED_HOSTS = "*.company.com,company.com";

      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "company.com"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHost();
      expect(result).toBe("company.com");
    });

    test("should reject similar but different domain", async () => {
      process.env.TRUSTED_HOSTS = "accounts.company.com";

      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "accounts-company.com"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      await expect(getOriginalHost()).rejects.toThrow("Untrusted host: accounts-company.com");
    });

    test("should handle localhost with port", async () => {
      process.env.TRUSTED_HOSTS = "localhost:3000,localhost:4000";

      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "localhost:3000"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHost();
      expect(result).toBe("localhost:3000");
    });

    test("should reject localhost with different port", async () => {
      process.env.TRUSTED_HOSTS = "localhost:3000";

      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "localhost:9999"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      await expect(getOriginalHost()).rejects.toThrow("Untrusted host: localhost:9999");
    });

    test("should handle comma-separated list with spaces", async () => {
      process.env.TRUSTED_HOSTS = "domain1.com, domain2.com , domain3.com  ";

      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "domain2.com"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHost();
      expect(result).toBe("domain2.com");
    });

    test("should validate in getOriginalHostWithProtocol", async () => {
      process.env.TRUSTED_HOSTS = "trusted.com";

      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "evil.com"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      await expect(getOriginalHostWithProtocol()).rejects.toThrow("Untrusted host: evil.com");
    });

    test("should allow empty TRUSTED_HOSTS to use defaults", async () => {
      delete process.env.TRUSTED_HOSTS;

      const { headers } = await import("next/headers");
      const mockHeaders = {
        get: vi.fn(() => "localhost"),
      };

      vi.mocked(headers).mockResolvedValue(mockHeaders as any);

      const result = await getOriginalHost();
      expect(result).toBe("localhost");
    });
  });
});
