import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { isMultiTenant, isSelfHosted, hasSystemUserCredentials, hasServiceUserToken } from "./deployment";

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
    test("should return true when ZITADEL_CLOUD is explicitly set to true", () => {
      process.env.ZITADEL_CLOUD = "true";

      expect(isMultiTenant()).toBe(true);
    });

    test("should return false when ZITADEL_CLOUD is set to false", () => {
      process.env.ZITADEL_CLOUD = "false";

      expect(isMultiTenant()).toBe(false);
    });

    test("should return false when ZITADEL_CLOUD is not set", () => {
      process.env.ZITADEL_CLOUD = undefined as any;

      expect(isMultiTenant()).toBe(false);
    });

    test("should return false when ZITADEL_CLOUD is set to any other value", () => {
      process.env.ZITADEL_CLOUD = "yes";

      expect(isMultiTenant()).toBe(false);
    });

    test("should return true even if system user credentials are also present", () => {
      // Cloud environment with system user credentials
      process.env.ZITADEL_CLOUD = "true";
      process.env.AUDIENCE = "https://api.zitadel.cloud";
      process.env.SYSTEM_USER_ID = "12345";
      process.env.SYSTEM_USER_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...";

      expect(isMultiTenant()).toBe(true);
    });

    test("should work with ZITADEL_API_URL present", () => {
      // ZITADEL_API_URL can be present in multi-tenant too
      process.env.ZITADEL_CLOUD = "true";
      process.env.ZITADEL_API_URL = "https://api.zitadel.cloud";

      expect(isMultiTenant()).toBe(true);
    });
  });

  describe("isSelfHosted", () => {
    test("should return false when ZITADEL_CLOUD is set to true", () => {
      process.env.ZITADEL_CLOUD = "true";

      expect(isSelfHosted()).toBe(false);
    });

    test("should return true when ZITADEL_CLOUD is not set", () => {
      process.env.ZITADEL_CLOUD = undefined as any;

      expect(isSelfHosted()).toBe(true);
    });

    test("should return true with ZITADEL_API_URL but no cloud marker", () => {
      process.env.ZITADEL_API_URL = "https://zitadel.mycompany.com";
      process.env.ZITADEL_CLOUD = undefined as any;

      expect(isSelfHosted()).toBe(true);
    });

    test("should return true even with system user credentials if no cloud marker", () => {
      // Self-hosted deployment using system user authentication
      process.env.ZITADEL_CLOUD = undefined as any;
      process.env.AUDIENCE = "https://zitadel.mycompany.com";
      process.env.SYSTEM_USER_ID = "12345";
      process.env.SYSTEM_USER_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...";

      expect(isSelfHosted()).toBe(true);
    });

    test("should return true when ZITADEL_CLOUD is explicitly false", () => {
      process.env.ZITADEL_CLOUD = "false";

      expect(isSelfHosted()).toBe(true);
    });
  });

  describe("consistency", () => {
    test("isMultiTenant and isSelfHosted should be mutually exclusive", () => {
      // Test various configurations
      const configs = [
        // Self-hosted: no cloud marker
        {
          ZITADEL_API_URL: "https://zitadel.mycompany.com",
        },
        // Multi-tenant: ZITADEL_CLOUD set
        {
          ZITADEL_CLOUD: "true",
        },
        // Self-hosted: empty config
        {},
        // Self-hosted: ZITADEL_CLOUD false
        {
          ZITADEL_CLOUD: "false",
        },
        // Multi-tenant: with system user credentials
        {
          ZITADEL_CLOUD: "true",
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

  describe("hasSystemUserCredentials", () => {
    test("should return true when all system user credentials are present", () => {
      process.env.AUDIENCE = "https://api.zitadel.cloud";
      process.env.SYSTEM_USER_ID = "12345";
      process.env.SYSTEM_USER_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...";

      expect(hasSystemUserCredentials()).toBe(true);
    });

    test("should return false when AUDIENCE is missing", () => {
      process.env.AUDIENCE = undefined as any;
      process.env.SYSTEM_USER_ID = "12345";
      process.env.SYSTEM_USER_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...";

      expect(hasSystemUserCredentials()).toBe(false);
    });

    test("should return false when SYSTEM_USER_ID is missing", () => {
      process.env.AUDIENCE = "https://api.zitadel.cloud";
      process.env.SYSTEM_USER_ID = undefined as any;
      process.env.SYSTEM_USER_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...";

      expect(hasSystemUserCredentials()).toBe(false);
    });

    test("should return false when SYSTEM_USER_PRIVATE_KEY is missing", () => {
      process.env.AUDIENCE = "https://api.zitadel.cloud";
      process.env.SYSTEM_USER_ID = "12345";
      process.env.SYSTEM_USER_PRIVATE_KEY = undefined as any;

      expect(hasSystemUserCredentials()).toBe(false);
    });

    test("should return false when all credentials are missing", () => {
      process.env.AUDIENCE = undefined as any;
      process.env.SYSTEM_USER_ID = undefined as any;
      process.env.SYSTEM_USER_PRIVATE_KEY = undefined as any;

      expect(hasSystemUserCredentials()).toBe(false);
    });

    test("should work independently of ZITADEL_CLOUD", () => {
      // Self-hosted with system user credentials
      process.env.ZITADEL_CLOUD = undefined as any;
      process.env.AUDIENCE = "https://zitadel.mycompany.com";
      process.env.SYSTEM_USER_ID = "12345";
      process.env.SYSTEM_USER_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...";

      expect(hasSystemUserCredentials()).toBe(true);
    });
  });

  describe("hasServiceUserToken", () => {
    test("should return true when ZITADEL_SERVICE_USER_TOKEN is present", () => {
      process.env.ZITADEL_SERVICE_USER_TOKEN = "token123";

      expect(hasServiceUserToken()).toBe(true);
    });

    test("should return false when ZITADEL_SERVICE_USER_TOKEN is not set", () => {
      process.env.ZITADEL_SERVICE_USER_TOKEN = undefined as any;

      expect(hasServiceUserToken()).toBe(false);
    });

    test("should return false when ZITADEL_SERVICE_USER_TOKEN is empty string", () => {
      process.env.ZITADEL_SERVICE_USER_TOKEN = "";

      expect(hasServiceUserToken()).toBe(false);
    });

    test("should work independently of deployment mode", () => {
      // Multi-tenant with service user token (unusual but valid)
      process.env.ZITADEL_CLOUD = "true";
      process.env.ZITADEL_SERVICE_USER_TOKEN = "token123";

      expect(hasServiceUserToken()).toBe(true);
    });
  });
});
