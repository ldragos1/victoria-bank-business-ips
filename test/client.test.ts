import { describe, expect, it, vi } from "vitest";
import { VictoriaBankClient } from "../src/client";
import { VictoriaBankApiError } from "../src/types";

function tokenJson() {
  return JSON.stringify({
    accessToken: "access-1",
    tokenType: "bearer",
    expiresIn: 3600,
    refreshToken: "refresh-1",
    refreshExpiresIn: 18000,
  });
}

describe("VictoriaBankClient", () => {
  it("authenticate posts password grant to /api/identity/token", async () => {
    const calls: { url: string; body: string }[] = [];
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: String(init?.body ?? "") });
      return new Response(tokenJson(), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example/",
      username: "user@x",
      password: "secret",
      fetch: fetchMock as typeof fetch,
    });
    const tr = await client.authenticate();
    expect(tr.accessToken).toBe("access-1");
    expect(calls[0]?.url).toBe("https://api.example/api/identity/token");
    expect(calls[0]?.body).toContain("grant_type=password");
    expect(calls[0]?.body).toContain(encodeURIComponent("user@x"));
    expect(calls[0]?.body).toContain(encodeURIComponent("secret"));
  });

  it("createQr sends Bearer token and query params for image size", async () => {
    const responses: Response[] = [
      new Response(tokenJson(), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      new Response(
        JSON.stringify({
          qrHeaderUUID: "h1",
          qrExtensionUUID: "e1",
          qrAsText: "t",
          qrAsImage: "img",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ),
    ];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const r = responses.shift();
      if (!r) throw new Error("unexpected fetch");
      return r;
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
    });
    const qr = await client.createQr(
      {
        header: { qrType: "DYNM", amountType: "Fixed", pmtContext: "e" },
        extension: {
          creditorAccount: { iban: "MD00" },
          amount: { sum: 1, currency: "MDL" },
        },
      },
      { width: 400, height: 200 }
    );
    expect(qr.qrHeaderUUID).toBe("h1");
    const postQr = fetchMock.mock.calls[1];
    expect(postQr?.[0]).toContain("/api/v1/qr?");
    expect(String(postQr?.[0])).toMatch(/width=400/);
    expect(String(postQr?.[0])).toMatch(/height=200/);
    expect(postQr?.[1]?.headers).toMatchObject({
      Authorization: "Bearer access-1",
      "Content-Type": "application/json",
    });
  });

  it("uses extentions path for createQrExtension", async () => {
    const responses: Response[] = [
      new Response(tokenJson(), { status: 200 }),
      new Response(
        JSON.stringify({
          qrHeaderUUID: "h",
          qrExtensionUUID: "e",
          qrAsText: "",
          qrAsImage: "",
        }),
        { status: 200 }
      ),
    ];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const r = responses.shift();
      if (!r) throw new Error("unexpected fetch");
      return r;
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
    });
    await client.createQrExtension("uuid-here", {
      creditorAccount: { iban: "MD00" },
      amount: { sum: "1", currency: "MDL" },
    });
    const callUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(callUrl).toContain("/api/v1/qr/uuid-here/extentions");
  });

  it("retries once on 401 after refresh", async () => {
    const future = Date.now() + 3_600_000;
    let statusGetCount = 0;
    const fetchMock = vi.fn(
      async (url: string | URL, init?: RequestInit): Promise<Response> => {
        const u = String(url);
        if (u.includes("/api/identity/token")) {
          const body = String(init?.body ?? "");
          expect(body).toContain("grant_type=refresh_token");
          return new Response(
            JSON.stringify({
              accessToken: "access-2",
              tokenType: "bearer",
              expiresIn: 3600,
              refreshToken: "refresh-2",
              refreshExpiresIn: 18000,
            }),
            { status: 200 }
          );
        }
        if (u.includes("/status") && init?.method === "GET") {
          statusGetCount += 1;
          if (statusGetCount === 1) {
            return new Response('{"err":true}', { status: 401 });
          }
          return new Response(
            JSON.stringify({
              uuid: "x",
              status: "Active",
              statusDtTm: "",
              lockTtl: { length: 0, units: "mm" },
              extensions: [],
            }),
            { status: 200 }
          );
        }
        throw new Error(`unexpected: ${u}`);
      }
    );
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
      initialTokens: {
        accessToken: "old",
        refreshToken: "r0",
        expiresAtAccess: future,
        expiresAtRefresh: future,
      },
    });
    const status = await client.getQrStatus("qr-h");
    expect(status.uuid).toBe("x");
    const tokenCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes("/api/identity/token")
    );
    expect(tokenCalls.length).toBe(1);
    const getCalls = fetchMock.mock.calls.filter(
      (c) => String(c[0]).includes("/status") && (c[1] as RequestInit)?.method === "GET"
    );
    expect(getCalls.length).toBe(2);
  });

  it("throws VictoriaBankApiError with errorCode and traceReference on HTTP errors", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          traceReference: "abc-123",
          errorCode: "VB10403",
          description: "Lifetime validation failed.",
        }),
        { status: 500 }
      );
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
      retries: 0,
      initialTokens: {
        accessToken: "t",
        refreshToken: "r",
        expiresAtAccess: Date.now() + 3600000,
        expiresAtRefresh: Date.now() + 3600000,
      },
    });
    try {
      await client.cancelQr("q");
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(VictoriaBankApiError);
      const err = e as VictoriaBankApiError;
      expect(err.status).toBe(500);
      expect(err.errorCode).toBe("VB10403");
      expect(err.traceReference).toBe("abc-123");
      expect(err.message).toContain("[VB10403]");
      expect(err.message).toContain("Lifetime validation failed.");
      expect(err.body).toMatchObject({ errorCode: "VB10403" });
    }
  });

  it("token endpoint includes errorCode and description in error message", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          traceReference: "trace-999",
          errorCode: "VB10403",
          description: "Invalid credentials.",
        }),
        { status: 401 }
      );
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
    });
    try {
      await client.authenticate();
      expect.fail("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(VictoriaBankApiError);
      const err = e as VictoriaBankApiError;
      expect(err.status).toBe(401);
      expect(err.errorCode).toBe("VB10403");
      expect(err.traceReference).toBe("trace-999");
      expect(err.message).toContain("Token request failed: 401");
      expect(err.message).toContain("[VB10403]");
      expect(err.message).toContain("Invalid credentials.");
    }
  });

  it("retries on 5xx and eventually succeeds", async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async () => {
      callCount++;
      if (callCount <= 2) {
        return new Response('{"error":"internal"}', { status: 502 });
      }
      return new Response(tokenJson(), { status: 200 });
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
      retries: 2,
    });
    const tr = await client.authenticate();
    expect(tr.accessToken).toBe("access-1");
    expect(callCount).toBe(3);
  });

  it("retries on network error and eventually throws", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
      retries: 1,
    });
    await expect(client.authenticate()).rejects.toThrow("fetch failed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("onTokens is called when tokens are issued", async () => {
    const onTokens = vi.fn();
    const fetchMock = vi.fn(async () => {
      return new Response(tokenJson(), { status: 200 });
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
      onTokens,
    });
    await client.authenticate();
    expect(onTokens).toHaveBeenCalledTimes(1);
    expect(onTokens.mock.calls[0]?.[0]).toMatchObject({
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
  });

  it("refreshAccessToken uses refresh_token grant and updates tokens", async () => {
    const future = Date.now() + 3_600_000;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = String(init?.body ?? "");
      expect(body).toContain("grant_type=refresh_token");
      expect(body).toContain("refresh_token=r0");
      return new Response(
        JSON.stringify({
          accessToken: "access-new",
          tokenType: "bearer",
          expiresIn: 3600,
          refreshToken: "refresh-new",
          refreshExpiresIn: 18000,
        }),
        { status: 200 }
      );
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
      initialTokens: {
        accessToken: "a0",
        refreshToken: "r0",
        expiresAtAccess: future,
        expiresAtRefresh: future,
      },
    });
    const tr = await client.refreshAccessToken();
    expect(tr.accessToken).toBe("access-new");
    expect(client.getStoredTokens()?.accessToken).toBe("access-new");
  });

  it("refreshAccessToken falls back to password grant on 401", async () => {
    const future = Date.now() + 3_600_000;
    let callCount = 0;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      callCount++;
      const body = String(init?.body ?? "");
      if (callCount === 1) {
        expect(body).toContain("grant_type=refresh_token");
        return new Response('{"error":"invalid"}', { status: 401 });
      }
      expect(body).toContain("grant_type=password");
      return new Response(tokenJson(), { status: 200 });
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
      retries: 0,
      initialTokens: {
        accessToken: "a0",
        refreshToken: "r0",
        expiresAtAccess: future,
        expiresAtRefresh: future,
      },
    });
    const tr = await client.refreshAccessToken();
    expect(tr.accessToken).toBe("access-1");
    expect(callCount).toBe(2);
  });

  it("refreshAccessToken falls back to password grant on 400", async () => {
    const future = Date.now() + 3_600_000;
    let callCount = 0;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      callCount++;
      const body = String(init?.body ?? "");
      if (callCount === 1) {
        expect(body).toContain("grant_type=refresh_token");
        return new Response('{"error":"bad request"}', { status: 400 });
      }
      expect(body).toContain("grant_type=password");
      return new Response(tokenJson(), { status: 200 });
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
      retries: 0,
      initialTokens: {
        accessToken: "a0",
        refreshToken: "r0",
        expiresAtAccess: future,
        expiresAtRefresh: future,
      },
    });
    const tr = await client.refreshAccessToken();
    expect(tr.accessToken).toBe("access-1");
    expect(callCount).toBe(2);
  });

  it("cancelActiveExtension sends DELETE to /active-extension", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/api/identity/token")) {
        return new Response(tokenJson(), { status: 200 });
      }
      expect(init?.method).toBe("DELETE");
      expect(u).toContain("/api/v1/qr/qr-hdr-uuid/active-extension");
      return new Response(null, { status: 204 });
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
    });
    await client.cancelActiveExtension("qr-hdr-uuid");
  });

  it("getExtensionStatus sends GET with nbOfTxs query", async () => {
    const statusBody = JSON.stringify({
      uuid: "ext-1",
      isLast: true,
      status: "Active",
      statusDtTm: "2024-07-29T09:59:09Z",
      isHeaderLocked: false,
      ttl: { length: 360, units: "mm" },
      payments: [],
    });
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/api/identity/token")) {
        return new Response(tokenJson(), { status: 200 });
      }
      expect(init?.method).toBe("GET");
      expect(u).toContain("/api/v1/qr-extensions/ext-uuid-1/status");
      expect(u).toContain("nbOfTxs=5");
      return new Response(statusBody, { status: 200 });
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
    });
    const result = await client.getExtensionStatus("ext-uuid-1", { nbOfTxs: 5 });
    expect(result.uuid).toBe("ext-1");
  });

  it("reverseTransaction sends DELETE with encoded reference", async () => {
    const ref = "VICBMD2XAXXX250423463390000017890";
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/api/identity/token")) {
        return new Response(tokenJson(), { status: 200 });
      }
      expect(init?.method).toBe("DELETE");
      expect(u).toContain(`/api/v1/transaction/${ref}`);
      return new Response(null, { status: 204 });
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
    });
    await client.reverseTransaction(ref);
  });

  it("reverseTransaction encodes special characters in reference", async () => {
    const ref = "REF/WITH SPACES&SPECIAL";
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/api/identity/token")) {
        return new Response(tokenJson(), { status: 200 });
      }
      expect(init?.method).toBe("DELETE");
      expect(u).toContain(`/api/v1/transaction/${encodeURIComponent(ref)}`);
      return new Response(null, { status: 204 });
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
    });
    await client.reverseTransaction(ref);
  });

  it("listTransactions sends GET with datefrom and dateto query params", async () => {
    const body = JSON.stringify({
      transactionsInfo: [
        {
          id: "MOLDMD2XAXXX240206250390000001094",
          date: "2024-08-13",
          time: "06:41:50.3530000",
          payerName: "Jon Snow",
          transactionType: "QR",
          transactionAmount: 1500.0,
          transactionStatus: "Approved",
          miaId: "ref-1",
        },
      ],
    });
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/api/identity/token")) {
        return new Response(tokenJson(), { status: 200 });
      }
      expect(init?.method).toBe("GET");
      expect(u).toContain("/api/v1/reconciliation/transactions");
      expect(u).toContain("datefrom=2024-08-01");
      expect(u).toContain("dateto=2024-08-13");
      return new Response(body, { status: 200 });
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
    });
    const result = await client.listTransactions({
      datefrom: "2024-08-01",
      dateto: "2024-08-13",
    });
    expect(result.transactionsInfo).toHaveLength(1);
    expect(result.transactionsInfo[0].id).toBe("MOLDMD2XAXXX240206250390000001094");
  });

  it("getLastSignal sends GET to /api/v1/signal/{uuid}", async () => {
    const signalBody = JSON.stringify({
      signalCode: "Payment",
      signalDtTm: "2025-04-23T12:52:22+03:00",
      qrHeaderUUID: "hdr-1",
      qrExtensionUUID: "ext-1",
      payment: {
        system: "IPS",
        reference:
          "pacs.008.001.10|2025-04-23|VICBMD2X|VICBMD2XAXXX250423463390000017890",
        amount: { sum: "3.48", currency: "MDL" },
      },
    });
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/api/identity/token")) {
        return new Response(tokenJson(), { status: 200 });
      }
      expect(init?.method).toBe("GET");
      expect(u).toContain("/api/v1/signal/ext-uuid-abc");
      return new Response(signalBody, { status: 200 });
    });
    const client = new VictoriaBankClient({
      baseUrl: "https://api.example",
      username: "u",
      password: "p",
      fetch: fetchMock as typeof fetch,
    });
    const result = await client.getLastSignal("ext-uuid-abc");
    expect(result.signalCode).toBe("Payment");
    expect(result.qrExtensionUUID).toBe("ext-1");
    expect(result.payment?.reference).toContain("VICBMD2XAXXX250423463390000017890");
  });
});
