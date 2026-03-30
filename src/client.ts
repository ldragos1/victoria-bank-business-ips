import {
  VictoriaBankApiError,
  type BankSignalPayload,
  type NewQrRequest,
  type NewQrResponse,
  type QrExtensionPayload,
  type QrStatusResponse,
  type ReconciliationTransactionsResponse,
  type StoredTokens,
  type TokenResponse,
  type VictoriaBankClientConfig,
} from "./types";
import { trimTrailingSlashes } from "./url-utils";

const DEFAULT_REFRESH_BUFFER_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

function joinUrl(base: string, path: string): string {
  const b = trimTrailingSlashes(base);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isTransientError(status: number): boolean {
  return status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildErrorMessage(prefix: string, body: unknown): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    const parts: string[] = [prefix];
    if (typeof b.errorCode === "string") parts.push(`[${b.errorCode}]`);
    if (typeof b.description === "string") parts.push(b.description);
    if (parts.length > 1) return parts.join(" — ");
  }
  return prefix;
}

export class VictoriaBankClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly fetchImpl: typeof fetch;
  private readonly onTokens?: VictoriaBankClientConfig["onTokens"];
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAtAccess = 0;
  private expiresAtRefresh = 0;
  private refreshBufferMs: number;
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(config: VictoriaBankClientConfig & { tokenRefreshBufferMs?: number }) {
    this.baseUrl = trimTrailingSlashes(config.baseUrl);
    this.username = config.username;
    this.password = config.password;
    this.fetchImpl = config.fetch ?? globalThis.fetch;
    this.onTokens = config.onTokens;
    this.refreshBufferMs = config.tokenRefreshBufferMs ?? DEFAULT_REFRESH_BUFFER_MS;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retries = config.retries ?? DEFAULT_RETRIES;

    if (config.initialTokens) {
      this.hydrateTokens(config.initialTokens);
    }
  }

  private hydrateTokens(t: StoredTokens): void {
    this.accessToken = t.accessToken;
    this.refreshToken = t.refreshToken;
    this.expiresAtAccess = t.expiresAtAccess;
    this.expiresAtRefresh = t.expiresAtRefresh;
  }

  private emitTokens(): void {
    if (!this.accessToken || !this.refreshToken) return;
    this.onTokens?.({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAtAccess: this.expiresAtAccess,
      expiresAtRefresh: this.expiresAtRefresh,
    });
  }

  private applyTokenResponse(tr: TokenResponse): void {
    const now = Date.now();
    this.accessToken = tr.accessToken;
    this.refreshToken = tr.refreshToken;
    this.expiresAtAccess = now + tr.expiresIn * 1000;
    this.expiresAtRefresh = now + tr.refreshExpiresIn * 1000;
    this.emitTokens();
  }

  /**
   * **Authorization (Password grant)** — PDF § Authorization.
   * `POST /api/identity/token` with `grant_type=password`.
   */
  async authenticate(): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: "password",
      username: this.username,
      password: this.password,
    });
    const tr = await this.postFormToken(body);
    this.applyTokenResponse(tr);
    return tr;
  }

  /** Refresh access token using refresh_token grant. */
  async refreshAccessToken(): Promise<TokenResponse> {
    if (!this.refreshToken) {
      return this.authenticate();
    }
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshToken,
    });
    try {
      const tr = await this.postFormToken(body);
      this.applyTokenResponse(tr);
      return tr;
    } catch (e) {
      if (e instanceof VictoriaBankApiError && (e.status === 400 || e.status === 401)) {
        return this.authenticate();
      }
      throw e;
    }
  }

  private buildSignal(): AbortSignal | undefined {
    if (this.timeoutMs > 0) return AbortSignal.timeout(this.timeoutMs);
    return undefined;
  }

  private async postFormToken(body: URLSearchParams): Promise<TokenResponse> {
    const url = joinUrl(this.baseUrl, "/api/identity/token");

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));

      let res: Response;
      try {
        res = await this.fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
          signal: this.buildSignal(),
        });
      } catch (e) {
        lastError = e;
        if (attempt < this.retries) continue;
        throw e;
      }

      const text = await res.text();
      const parsed = parseJsonSafe(text) as TokenResponse | Record<string, unknown>;
      if (!res.ok) {
        lastError = new VictoriaBankApiError(
          buildErrorMessage(`Token request failed: ${res.status}`, parsed),
          res.status,
          parsed
        );
        if (isTransientError(res.status) && attempt < this.retries) continue;
        throw lastError;
      }
      return parsed as TokenResponse;
    }
    throw lastError;
  }

  private async ensureAccessToken(): Promise<string> {
    const now = Date.now();
    if (
      this.accessToken &&
      now < this.expiresAtAccess - this.refreshBufferMs
    ) {
      return this.accessToken;
    }
    if (
      this.refreshToken &&
      now < this.expiresAtRefresh
    ) {
      const tr = await this.refreshAccessToken();
      return tr.accessToken;
    }
    const tr = await this.authenticate();
    return tr.accessToken;
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      query?: Record<string, string | number | undefined>;
      jsonBody?: unknown;
      auth?: boolean;
    } = {},
    isRetryAfter401 = false
  ): Promise<T> {
    const { query, jsonBody, auth = true } = options;
    let url = joinUrl(this.baseUrl, path);
    if (query && Object.keys(query).length > 0) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined) continue;
        sp.set(k, String(v));
      }
      url += `?${sp.toString()}`;
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));

      const headers: Record<string, string> = {};
      if (jsonBody !== undefined) {
        headers["Content-Type"] = "application/json";
      }
      if (auth) {
        const token = await this.ensureAccessToken();
        headers.Authorization = `Bearer ${token}`;
      }

      let res: Response;
      try {
        res = await this.fetchImpl(url, {
          method,
          headers,
          body: jsonBody !== undefined ? JSON.stringify(jsonBody) : undefined,
          signal: this.buildSignal(),
        });
      } catch (e) {
        lastError = e;
        if (attempt < this.retries) continue;
        throw e;
      }

      const text = await res.text();
      if (res.status === 204) {
        return undefined as T;
      }
      const parsed = text ? parseJsonSafe(text) : null;
      if (!res.ok) {
        if (res.status === 401 && auth && !isRetryAfter401) {
          await this.refreshAccessToken();
          return this.request<T>(method, path, options, true);
        }
        lastError = new VictoriaBankApiError(
          buildErrorMessage(`HTTP ${res.status}: ${method} ${path}`, parsed),
          res.status,
          parsed
        );
        if (isTransientError(res.status) && attempt < this.retries) continue;
        throw lastError;
      }
      return parsed as T;
    }
    throw lastError;
  }

  /**
   * **New QR** — PDF: register payee-presented QR code.
   * `POST /api/v1/qr` (optional `width` / `height` query for image).
   */
  async createQr(
    body: NewQrRequest,
    imageSize?: { width?: number; height?: number }
  ): Promise<NewQrResponse> {
    return this.request<NewQrResponse>("POST", "/api/v1/qr", {
      query: {
        width: imageSize?.width,
        height: imageSize?.height,
      },
      jsonBody: body,
    });
  }

  /** **Cancel QR** — PDF: cancel payee-presented QR (and active extension if any). */
  async cancelQr(qrHeaderUUID: string): Promise<void> {
    await this.request("DELETE", `/api/v1/qr/${encodeURIComponent(qrHeaderUUID)}`);
  }

  /** **QR Status** — PDF: header, extensions, payments. */
  async getQrStatus(
    qrHeaderUUID: string,
    opts?: { nbOfExt?: number; nbOfTxs?: number }
  ): Promise<QrStatusResponse> {
    return this.request<QrStatusResponse>(
      "GET",
      `/api/v1/qr/${encodeURIComponent(qrHeaderUUID)}/status`,
      {
        query: {
          nbOfExt: opts?.nbOfExt,
          nbOfTxs: opts?.nbOfTxs,
        },
      }
    );
  }

  /**
   * **New extension** — PDF: HYBR/STAT; replaces previous extension.
   * `POST .../extentions` (API spelling).
   */
  async createQrExtension(
    qrHeaderUUID: string,
    extension: QrExtensionPayload
  ): Promise<NewQrResponse> {
    return this.request<NewQrResponse>(
      "POST",
      `/api/v1/qr/${encodeURIComponent(qrHeaderUUID)}/extentions`,
      { jsonBody: extension }
    );
  }

  /** **Cancel extension** — PDF: active extension on hybrid QR. */
  async cancelActiveExtension(qrHeaderUUID: string): Promise<void> {
    await this.request(
      "DELETE",
      `/api/v1/qr/${encodeURIComponent(qrHeaderUUID)}/active-extension`
    );
  }

  /** **Extension status** — PDF: extension + last N payments. */
  async getExtensionStatus(
    qrExtensionUUID: string,
    opts?: { nbOfTxs?: number }
  ): Promise<QrStatusResponse> {
    return this.request<QrStatusResponse>(
      "GET",
      `/api/v1/qr-extensions/${encodeURIComponent(qrExtensionUUID)}/status`,
      { query: { nbOfTxs: opts?.nbOfTxs } }
    );
  }

  /**
   * **Reverse transaction** — PDF: `reference` = 4th pipe-delimited segment only,
   * not the full `pacs.008|…|…|…` string. Use **`extractFourthSegmentFromReference`** when you only have the full `payment.reference` line (do not use **`extractRrnFromReference`**, which is last-12-chars / RRN only).
   */
  async reverseTransaction(reference: string): Promise<void> {
    await this.request(
      "DELETE",
      `/api/v1/transaction/${encodeURIComponent(reference)}`
    );
  }

  /** **List of transactions** — PDF: reconciliation; `datefrom` / `dateto` as `YYYY-MM-DD`. */
  async listTransactions(params: {
    datefrom: string;
    dateto: string;
  }): Promise<ReconciliationTransactionsResponse> {
    return this.request<ReconciliationTransactionsResponse>(
      "GET",
      "/api/v1/reconciliation/transactions",
      {
        query: { datefrom: params.datefrom, dateto: params.dateto },
      }
    );
  }

  /**
   * **Get Last Signal by QR Extension UUID** — PDF: polling fallback only;
   * prefer bank `POST /api/signals` callback.
   */
  async getLastSignal(qrExtensionUUID: string): Promise<BankSignalPayload> {
    return this.request<BankSignalPayload>(
      "GET",
      `/api/v1/signal/${encodeURIComponent(qrExtensionUUID)}`
    );
  }

  /** Current stored tokens (for persistence), if any. */
  getStoredTokens(): StoredTokens | null {
    if (!this.accessToken || !this.refreshToken) return null;
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAtAccess: this.expiresAtAccess,
      expiresAtRefresh: this.expiresAtRefresh,
    };
  }
}
