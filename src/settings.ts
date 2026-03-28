/**
 * Environment-driven configuration helpers.
 * Load credentials from env in your app; this module only defines keys and a factory.
 */

/** Common environment variable names (suggested; not read automatically). */
export const envKeys = {
  baseUrl: "VICTORIA_BANK_IPS_BASE_URL",
  username: "VICTORIA_BANK_IPS_USERNAME",
  password: "VICTORIA_BANK_IPS_PASSWORD",
  /** Optional: JSON string of `{ accessToken, refreshToken, expiresAtAccess, expiresAtRefresh }` */
  storedTokensJson: "VICTORIA_BANK_IPS_STORED_TOKENS_JSON",
  demoPayBaseUrl: "VICTORIA_BANK_IPS_DEMO_PAY_BASE_URL",
} as const;

export const defaultBaseUrlTest = "https://test-ipspj.victoriabank.md";

import type { StoredTokens, VictoriaBankClientConfig } from "./types";
import { VictoriaBankClient } from "./client";

export interface ClientFromEnvInput {
  baseUrl?: string;
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
}

/**
 * Build {@link VictoriaBankClient} directly from `process.env` using {@link envKeys}.
 *
 * Reads:
 * - `VICTORIA_BANK_IPS_USERNAME` (required)
 * - `VICTORIA_BANK_IPS_PASSWORD` (required)
 * - `VICTORIA_BANK_IPS_BASE_URL` (optional; defaults to test URL)
 * - `VICTORIA_BANK_IPS_STORED_TOKENS_JSON` (optional; restores previous session)
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
  const storedJson = process.env[envKeys.storedTokensJson];
  const initialTokens = storedJson ? parseStoredTokensJson(storedJson) : undefined;

  return new VictoriaBankClient({
    baseUrl,
    username,
    password,
    onTokens: options?.onTokens,
    initialTokens,
    fetch: options?.fetch,
    tokenRefreshBufferMs: options?.tokenRefreshBufferMs,
    timeoutMs: options?.timeoutMs,
    retries: options?.retries,
  });
}

/**
 * Parse stored tokens JSON (same shape as {@link VictoriaBankClient.getStoredTokens}).
 */
export function parseStoredTokensJson(json: string): StoredTokens | undefined {
  try {
    const o = JSON.parse(json) as Partial<StoredTokens>;
    if (
      typeof o.accessToken === "string" &&
      typeof o.refreshToken === "string" &&
      typeof o.expiresAtAccess === "number" &&
      typeof o.expiresAtRefresh === "number"
    ) {
      return {
        accessToken: o.accessToken,
        refreshToken: o.refreshToken,
        expiresAtAccess: o.expiresAtAccess,
        expiresAtRefresh: o.expiresAtRefresh,
      };
    }
  } catch {
    /* ignore */
  }
  return undefined;
}
