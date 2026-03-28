import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createClientFromEnv,
  createClientFromSettings,
  defaultBaseUrlTest,
  envKeys,
  parseStoredTokensJson,
} from "../src/settings";

describe("parseStoredTokensJson", () => {
  it("parses valid JSON", () => {
    const json = JSON.stringify({
      accessToken: "a",
      refreshToken: "r",
      expiresAtAccess: 100,
      expiresAtRefresh: 200,
    });
    expect(parseStoredTokensJson(json)).toEqual({
      accessToken: "a",
      refreshToken: "r",
      expiresAtAccess: 100,
      expiresAtRefresh: 200,
    });
  });

  it("returns undefined for invalid shape", () => {
    expect(parseStoredTokensJson("{}")).toBeUndefined();
    expect(parseStoredTokensJson("not json")).toBeUndefined();
  });
});

describe("createClientFromSettings", () => {
  it("uses default base URL and returns a client", () => {
    const client = createClientFromSettings({
      username: "u",
      password: "p",
    });
    expect(client.getStoredTokens()).toBeNull();
  });

  it("respects custom baseUrl", async () => {
    const calls: string[] = [];
    const fetchMock = async (url: string | URL) => {
      calls.push(String(url));
      return new Response(
        JSON.stringify({
          accessToken: "t",
          tokenType: "bearer",
          expiresIn: 3600,
          refreshToken: "r",
          refreshExpiresIn: 18000,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };
    const client = createClientFromSettings({
      baseUrl: "https://custom.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
    });
    await client.authenticate();
    expect(calls[0]).toBe("https://custom.example/api/identity/token");
  });
});

describe("defaultBaseUrlTest", () => {
  it("matches documented test host", () => {
    expect(defaultBaseUrlTest).toBe("https://test-ipspj.victoriabank.md");
  });
});

describe("createClientFromEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates client from process.env", () => {
    vi.stubEnv(envKeys.username, "envuser");
    vi.stubEnv(envKeys.password, "envpass");
    vi.stubEnv(envKeys.baseUrl, "https://custom.example");

    const client = createClientFromEnv();
    expect(client).toBeDefined();
    expect(client.getStoredTokens()).toBeNull();
  });

  it("throws if required env vars are missing", () => {
    vi.stubEnv(envKeys.username, "");
    vi.stubEnv(envKeys.password, "");

    expect(() => createClientFromEnv()).toThrow(/Missing required environment variables/);
  });

  it("uses default test URL when VICTORIA_BANK_IPS_BASE_URL is not set", async () => {
    vi.stubEnv(envKeys.username, "u");
    vi.stubEnv(envKeys.password, "p");

    const calls: string[] = [];
    const fetchMock = async (url: string | URL) => {
      calls.push(String(url));
      return new Response(
        JSON.stringify({
          accessToken: "t",
          tokenType: "bearer",
          expiresIn: 3600,
          refreshToken: "r",
          refreshExpiresIn: 18000,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const client = createClientFromEnv({ fetch: fetchMock as typeof fetch });
    await client.authenticate();
    expect(calls[0]).toBe("https://test-ipspj.victoriabank.md/api/identity/token");
  });

  it("restores tokens from VICTORIA_BANK_IPS_STORED_TOKENS_JSON", () => {
    vi.stubEnv(envKeys.username, "u");
    vi.stubEnv(envKeys.password, "p");
    vi.stubEnv(
      envKeys.storedTokensJson,
      JSON.stringify({
        accessToken: "a",
        refreshToken: "r",
        expiresAtAccess: Date.now() + 3_600_000,
        expiresAtRefresh: Date.now() + 18_000_000,
      })
    );

    const client = createClientFromEnv();
    const tokens = client.getStoredTokens();
    expect(tokens).not.toBeNull();
    expect(tokens!.accessToken).toBe("a");
  });
});
