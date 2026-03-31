import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createClientFromEnv,
  createClientFromSettings,
  defaultBaseUrlTest,
  envKeys,
} from "../src/settings";

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

  it("respects identityTokenPath (bank OpenAPI style /identity/token)", async () => {
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
      identityTokenPath: "/identity/token",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
    });
    await client.authenticate();
    expect(calls[0]).toBe("https://custom.example/identity/token");
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

  it("uses VICTORIA_BANK_IPS_IDENTITY_TOKEN_PATH when set", async () => {
    vi.stubEnv(envKeys.username, "u");
    vi.stubEnv(envKeys.password, "p");
    vi.stubEnv(envKeys.identityTokenPath, "/identity/token");

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
    expect(calls[0]).toBe(
      "https://test-ipspj.victoriabank.md/identity/token"
    );
  });
});
