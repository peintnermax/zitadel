/**
 * Determines if the application is running in multi-tenant mode.
 *
 * Multi-tenant mode is identified by the presence of system user credentials:
 * - AUDIENCE: The API audience for JWT authentication
 * - SYSTEM_USER_ID: The system user's ID
 * - SYSTEM_USER_PRIVATE_KEY: The private key for JWT signing
 *
 * Self-hosted mode uses ZITADEL_SERVICE_USER_TOKEN instead of system user JWT auth.
 *
 * @returns true if running in multi-tenant mode, false for self-hosted
 */
export function isMultiTenant(): boolean {
  // Multi-tenant uses system user JWT authentication
  return !!process.env.AUDIENCE && !!process.env.SYSTEM_USER_ID && !!process.env.SYSTEM_USER_PRIVATE_KEY;
}

/**
 * Determines if the application is running in self-hosted mode.
 *
 * @returns true if running in self-hosted mode, false for multi-tenant
 */
export function isSelfHosted(): boolean {
  return !isMultiTenant();
}
