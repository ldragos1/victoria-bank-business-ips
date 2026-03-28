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

import type { StoredTokens, VictoriaBankClientConfig } from "./types.js";
import { VictoriaBankClient } from "./client.js";

export interface ClientFromEnvInput {
  baseUrl?: string;
  username: string;
  password: string;
  initialTokens?: StoredTokens;
  onTokens?: VictoriaBankClientConfig["onTokens"];
  fetch?: typeof fetch;
  tokenRefreshBufferMs?: number;
}

/** Build {@link VictoriaBankClient} from explicit settings (e.g. after reading `process.env`). */
export function createClientFromSettings(
  input: ClientFromEnvInput
): VictoriaBankClient {
  const config: VictoriaBankClientConfig & {
    initialTokens?: StoredTokens;
    tokenRefreshBufferMs?: number;
  } = {
    baseUrl: input.baseUrl ?? defaultBaseUrlTest,
    username: input.username,
    password: input.password,
    onTokens: input.onTokens,
    initialTokens: input.initialTokens,
    fetch: input.fetch,
    tokenRefreshBufferMs: input.tokenRefreshBufferMs,
  };
  return new VictoriaBankClient(config);
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
