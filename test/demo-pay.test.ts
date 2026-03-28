import { describe, expect, it, vi } from "vitest";
import { DemoPayClient } from "../src/demo-pay.js";

describe("DemoPayClient", () => {
  it("POSTs qrHeaderUUID to /api/pay/", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe("https://test-ipspj-demopay.victoriabank.md/api/pay/");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toMatchObject({
        "Content-Type": "application/json",
      });
      expect(JSON.parse(init?.body as string)).toEqual({
        qrHeaderUUID: "hdr-1",
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    });
    const demo = new DemoPayClient({ fetch: fetchMock as typeof fetch });
    const out = await demo.pay("hdr-1");
    expect(out.status).toBe(202);
    expect(out.body).toEqual({ ok: true });
  });

  it("returns plain text body on JSON parse failure (400 errors)", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response("EQV|Target QR code does not exist", {
        status: 400,
      });
    });
    const demo = new DemoPayClient({ fetch: fetchMock as typeof fetch });
    const out = await demo.pay("missing");
    expect(out.status).toBe(400);
    expect(out.body).toBe("EQV|Target QR code does not exist");
  });
});
