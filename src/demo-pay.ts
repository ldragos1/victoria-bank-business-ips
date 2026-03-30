/**
 * Test payment simulator (separate host from main API).
 * Swagger: https://test-ipspj-demopay.victoriabank.md/swagger/index.html
 */

import { trimTrailingSlashes } from "./url-utils";

export interface DemoPayClientConfig {
  /** Default: `https://test-ipspj-demopay.victoriabank.md` */
  baseUrl?: string;
  fetch?: typeof fetch;
}

export class DemoPayClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: DemoPayClientConfig = {}) {
    this.baseUrl = trimTrailingSlashes(
      config.baseUrl ?? "https://test-ipspj-demopay.victoriabank.md"
    );
    this.fetchImpl = config.fetch ?? globalThis.fetch;
  }

  /**
   * POST /api/pay/ — simulate payment for a QR header.
   * 202 Accepted — success; 400 — error (body may be plain text).
   */
  async pay(qrHeaderUUID: string): Promise<{ status: number; body: unknown }> {
    const url = `${this.baseUrl}/api/pay/`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrHeaderUUID }),
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      // plain-text error from API
    }
    return { status: res.status, body };
  }
}
