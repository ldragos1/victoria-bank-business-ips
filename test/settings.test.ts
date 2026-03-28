import { describe, expect, it } from "vitest";
import {
  createClientFromSettings,
  defaultBaseUrlTest,
  parseStoredTokensJson,
} from "../src/settings.js";

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
