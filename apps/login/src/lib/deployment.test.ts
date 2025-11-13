import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { isMultiTenant, isSelfHosted } from "./deployment";

describe("Deployment mode utilities", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("isMultiTenant", () => {
    test("should return true when system user credentials are present", () => {
      process.env.AUDIENCE = "https://api.zitadel.cloud";
      process.env.SYSTEM_USER_ID = "12345";
      process.env.SYSTEM_USER_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...";

      expect(isMultiTenant()).toBe(true);
    });

    test("should return false when no system user credentials are set", () => {
      process.env.AUDIENCE = undefined as any;
      process.env.SYSTEM_USER_ID = undefined as any;
      process.env.SYSTEM_USER_PRIVATE_KEY = undefined as any;

      expect(isMultiTenant()).toBe(false);
    });

    test("should return true when system user credentials are present with ZITADEL_API_URL", () => {
      // ZITADEL_API_URL can be present in multi-tenant too
      process.env.ZITADEL_API_URL = "https://api.zitadel.cloud";
      process.env.AUDIENCE = "https://api.zitadel.cloud";
      process.env.SYSTEM_USER_ID = "12345";
      process.env.SYSTEM_USER_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...";

      expect(isMultiTenant()).toBe(true);
    });

    test("should return true when system user credentials are present without ZITADEL_API_URL", () => {
      process.env.ZITADEL_API_URL = undefined as any;
      process.env.AUDIENCE = "https://api.zitadel.cloud";
      process.env.SYSTEM_USER_ID = "12345";
      process.env.SYSTEM_USER_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...";

      expect(isMultiTenant()).toBe(true);
    });

    test("should return false when only some system user credentials are present", () => {
      process.env.ZITADEL_API_URL = "https://zitadel.mycompany.com";
      process.env.AUDIENCE = "https://api.zitadel.cloud";
      process.env.SYSTEM_USER_ID = "12345";
      // Missing SYSTEM_USER_PRIVATE_KEY

      expect(isMultiTenant()).toBe(false);
    });
  });

  describe("isSelfHosted", () => {
    test("should return false when system user credentials are present", () => {
      process.env.AUDIENCE = "https://api.zitadel.cloud";
      process.env.SYSTEM_USER_ID = "12345";
      process.env.SYSTEM_USER_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...";

      expect(isSelfHosted()).toBe(false);
    });

    test("should return true when no system user credentials are set", () => {
      process.env.AUDIENCE = undefined as any;
      process.env.SYSTEM_USER_ID = undefined as any;
      process.env.SYSTEM_USER_PRIVATE_KEY = undefined as any;

      expect(isSelfHosted()).toBe(true);
    });

    test("should return true when ZITADEL_API_URL is set and no system user credentials", () => {
      process.env.ZITADEL_API_URL = "https://zitadel.mycompany.com";
      process.env.AUDIENCE = undefined as any;
      process.env.SYSTEM_USER_ID = undefined as any;
      process.env.SYSTEM_USER_PRIVATE_KEY = undefined as any;

      expect(isSelfHosted()).toBe(true);
    });

    test("should return false when system user credentials are present", () => {
      process.env.ZITADEL_API_URL = "https://zitadel.mycompany.com";
      process.env.AUDIENCE = "https://api.zitadel.cloud";
      process.env.SYSTEM_USER_ID = "12345";
      process.env.SYSTEM_USER_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...";

      expect(isSelfHosted()).toBe(false);
    });
  });

  describe("consistency", () => {
    test("isMultiTenant and isSelfHosted should be mutually exclusive", () => {
      // Test various configurations
      const configs = [
        // Self-hosted: no system user creds
        {
          ZITADEL_API_URL: "https://zitadel.mycompany.com",
        },
        // Multi-tenant: system user creds
        {
          AUDIENCE: "https://api.zitadel.cloud",
          SYSTEM_USER_ID: "12345",
          SYSTEM_USER_PRIVATE_KEY: "key",
        },
        // Self-hosted: empty config
        {},
        // Multi-tenant: system user creds + API URL
        {
          ZITADEL_API_URL: "https://api.zitadel.cloud",
          AUDIENCE: "https://api.zitadel.cloud",
          SYSTEM_USER_ID: "12345",
          SYSTEM_USER_PRIVATE_KEY: "key",
        },
      ];

      configs.forEach((config) => {
        process.env = { ...originalEnv, ...config };
        const multiTenant = isMultiTenant();
        const selfHosted = isSelfHosted();

        // Should be mutually exclusive (XOR)
        expect(multiTenant !== selfHosted).toBe(true);
      });
    });
  });
});
