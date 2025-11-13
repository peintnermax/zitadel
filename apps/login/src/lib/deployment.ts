/**
 * Determines if the application is running in multi-tenant mode (ZITADEL Cloud).
 *
 * Multi-tenant mode is identified by the ZITADEL_CLOUD environment variable
 * being explicitly set to "true" in ZITADEL Cloud infrastructure.
 *
 *
 * @returns true if running in ZITADEL Cloud (multi-tenant), false for self-hosted
 */
export function isMultiTenant(): boolean {
  // Check for ZITADEL Cloud-specific marker
  return process.env.ZITADEL_CLOUD === "true";
}

/**
 * Determines if the application is running in self-hosted mode.
 *
 * @returns true if running in self-hosted mode, false for ZITADEL Cloud
 */
export function isSelfHosted(): boolean {
  return !isMultiTenant();
}

/**
 * Checks if system user credentials are available for JWT authentication.
 *
 * System user authentication requires:
 * - AUDIENCE: The API audience for JWT authentication
 * - SYSTEM_USER_ID: The system user's ID
 * - SYSTEM_USER_PRIVATE_KEY: The private key for JWT signing
 *
 * Both multi-tenant and self-hosted deployments can use system user authentication.
 *
 * @returns true if system user credentials are present, false otherwise
 */
export function hasSystemUserCredentials(): boolean {
  return !!process.env.AUDIENCE && !!process.env.SYSTEM_USER_ID && !!process.env.SYSTEM_USER_PRIVATE_KEY;
}

/**
 * Checks if service user token is available for authentication.
 *
 * @returns true if ZITADEL_SERVICE_USER_TOKEN is present, false otherwise
 */
export function hasServiceUserToken(): boolean {
  return !!process.env.ZITADEL_SERVICE_USER_TOKEN;
}
