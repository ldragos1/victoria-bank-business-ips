/**
 * Environment-driven configuration helpers.
 * Load credentials from env in your app; this module only defines keys and a factory.
 */

/** Common environment variable names (suggested; not read automatically). */
export const envKeys = {
  baseUrl: "VICTORIA_BANK_IPS_BASE_URL",
  /** OAuth token path; omit for default `/api/identity/token`. */
  identityTokenPath: "VICTORIA_BANK_IPS_IDENTITY_TOKEN_PATH",
  username: "VICTORIA_BANK_IPS_USERNAME",
  password: "VICTORIA_BANK_IPS_PASSWORD",
  demoPayBaseUrl: "VICTORIA_BANK_IPS_DEMO_PAY_BASE_URL",
} as const;

export const defaultBaseUrlTest = "https://test-ipspj.victoriabank.md";

import type { StoredTokens, VictoriaBankClientConfig } from "./types";
import { VictoriaBankClient } from "./client";

export interface ClientFromEnvInput {
  baseUrl?: string;
  identityTokenPath?: string;
  username: string;
  password: string;
  initialTokens?: StoredTokens;
  onTokens?: VictoriaBankClientConfig["onTokens"];
  fetch?: typeof fetch;
  tokenRefreshBufferMs?: number;
  timeoutMs?: number;
  retries?: number;
}

/** Build {@link VictoriaBankClient} from explicit settings (e.g. after reading `process.env`). */
export function createClientFromSettings(
  input: ClientFromEnvInput
): VictoriaBankClient {
  return new VictoriaBankClient({
    baseUrl: input.baseUrl ?? defaultBaseUrlTest,
    identityTokenPath: input.identityTokenPath,
    username: input.username,
    password: input.password,
    onTokens: input.onTokens,
    initialTokens: input.initialTokens,
    fetch: input.fetch,
    tokenRefreshBufferMs: input.tokenRefreshBufferMs,
    timeoutMs: input.timeoutMs,
    retries: input.retries,
  });
}

export interface CreateClientFromEnvOptions {
  onTokens?: VictoriaBankClientConfig["onTokens"];
  fetch?: typeof fetch;
  tokenRefreshBufferMs?: number;
  timeoutMs?: number;
  retries?: number;
  identityTokenPath?: string;
}

/**
 * Build {@link VictoriaBankClient} directly from `process.env` using {@link envKeys}.
 *
 * Reads:
 * - `VICTORIA_BANK_IPS_USERNAME` (required)
 * - `VICTORIA_BANK_IPS_PASSWORD` (required)
 * - `VICTORIA_BANK_IPS_BASE_URL` (optional; defaults to test URL)
 *
 * Throws if required env vars are missing.
 *
 * No need to call `authenticate()` — the client auto-authenticates on the first API call.
 */
export function createClientFromEnv(
  options?: CreateClientFromEnvOptions
): VictoriaBankClient {
  const username = process.env[envKeys.username];
  const password = process.env[envKeys.password];

  if (!username || !password) {
    throw new Error(
      `Missing required environment variables: ${envKeys.username} and/or ${envKeys.password}`
    );
  }

  const baseUrl = process.env[envKeys.baseUrl] ?? defaultBaseUrlTest;
  const identityTokenPath =
    process.env[envKeys.identityTokenPath] ?? options?.identityTokenPath;

  return new VictoriaBankClient({
    baseUrl,
    identityTokenPath,
    username,
    password,
    onTokens: options?.onTokens,
    fetch: options?.fetch,
    tokenRefreshBufferMs: options?.tokenRefreshBufferMs,
    timeoutMs: options?.timeoutMs,
    retries: options?.retries,
  });
}
