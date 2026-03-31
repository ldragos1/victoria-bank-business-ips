/** IPS Business WebApi — QR code type (API v2.0.18). */
export type QrType = "DYNM" | "STAT" | "HYBR";

/** Amount semantics for QR generation. */
export type QrAmountType = "Fixed" | "Controlled" | "Free";

/**
 * Payment context: m — mobile, e — e-commerce, i — invoice, o — other (letter O, not zero; v2.0.18).
 */
export type PmtContext = "m" | "e" | "i" | "o";

export type TtlUnit = "ss" | "mm";

export interface MoneyAmount {
  sum: number | string;
  currency: string;
}

export interface QrTtl {
  length: number;
  units: TtlUnit;
}

export interface QrHeader {
  qrType: QrType;
  amountType: QrAmountType;
  pmtContext: PmtContext;
}

export interface CreditorAccount {
  iban: string;
}

export interface QrExtensionPayload {
  creditorAccount: CreditorAccount;
  /** Fixed / DYNM */
  amount?: MoneyAmount;
  /** Controlled / STAT */
  amountMin?: MoneyAmount;
  amountMax?: MoneyAmount;
  dba?: string;
  remittanceInfo4Payer?: string;
  creditorRef?: string;
  ttl?: QrTtl;
}

export interface NewQrRequest {
  header: QrHeader;
  extension: QrExtensionPayload;
}

export interface NewQrResponse {
  qrHeaderUUID: string;
  qrExtensionUUID: string;
  qrAsText: string;
  /** Base64-encoded image */
  qrAsImage: string;
}

export type QrExtensionStatus =
  | "Active"
  | "Paid"
  | "Expired"
  | "Cancelled"
  | "Replaced"
  | "Inactive";

export interface QrPaymentInfo {
  system: string;
  reference: string;
  amount: {
    sum: number;
    currency: string;
  };
}

export interface QrStatusExtension {
  uuid: string;
  isLast: boolean;
  status: QrExtensionStatus;
  statusDtTm: string;
  isHeaderLocked: boolean;
  ttl: QrTtl;
  payments: QrPaymentInfo[];
}

export interface QrStatusResponse {
  uuid: string;
  status: QrExtensionStatus;
  statusDtTm: string;
  lockTtl: QrTtl;
  extensions: QrStatusExtension[];
}

export type SignalCode = "Payment" | "Expiration" | "Inactivation";

export interface SignalPayment {
  system: string;
  reference: string;
  amount?: {
    sum: string;
    currency: string;
  };
  dtTm?: string;
}

/** Payload shape inside bank JWT for POST /api/signals (partner implements this endpoint). */
export interface BankSignalPayload {
  signalCode: SignalCode;
  signalDtTm: string;
  qrHeaderUUID?: string | null;
  /** Present when identifying the QR extension (often used to map to your order). */
  qrExtensionUUID?: string;
  payment?: SignalPayment;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

export interface ReconciliationTransaction {
  id: string;
  date: string;
  time: string;
  payerName: string;
  payerIdnp: string;
  beneficiaryIdnp: string;
  transactionType: string;
  transactionAmount: number;
  transactionStatus: string;
  destinationBankName: string;
  transactionMessage: string;
  paymentType: string;
  miaId: string;
  creditorRef?: string;
  iban?: string;
}

export interface ReconciliationTransactionsResponse {
  transactionsInfo: ReconciliationTransaction[];
}

export interface VictoriaBankClientConfig {
  /**
   * API base URL without trailing slash.
   * Test: `https://test-ipspj.victoriabank.md` · Production (bank guide): `https://ips-api-pj.vb.md`
   */
  baseUrl: string;
  /**
   * OAuth2 token endpoint path (appended to {@link baseUrl}).
   * Default **`/api/identity/token`** matches the official IPS Integration API PDF (v2.0.18).
   * Some bank materials (OpenAPI / integration HTML) show **`/identity/token`** without the `/api` prefix — set this if your environment returns **404** on the default path.
   */
  identityTokenPath?: string;
  username: string;
  password: string;
  /**
   * Called whenever new tokens are obtained (persist refresh token securely).
   */
  onTokens?: (tokens: StoredTokens) => void;
  /**
   * Resume a previous session (e.g. from DB). `expiresAtAccess` should be Unix ms when access token expires.
   */
  initialTokens?: StoredTokens;
  /** Custom fetch (defaults to global `fetch`). */
  fetch?: typeof fetch;
  /** Request timeout in milliseconds (default **30000** — 30 s). Set `0` to disable. */
  timeoutMs?: number;
  /**
   * Max retries on transient errors (5xx / network). Default **2**.
   * Set `0` to disable retry. Retries use exponential backoff (500ms, 1000ms, …).
   * 401 retry (token refresh) is always enabled regardless of this setting.
   */
  retries?: number;
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix timestamp (ms) when access token should be refreshed */
  expiresAtAccess: number;
  /** Unix timestamp (ms) when refresh token expires */
  expiresAtRefresh: number;
}

export class VictoriaBankApiError extends Error {
  /** Bank error code when present (e.g. `"VB10403"`, `"EQ1"`). */
  public readonly errorCode?: string;
  /** Bank trace reference UUID for support/debugging. */
  public readonly traceReference?: string;

  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "VictoriaBankApiError";

    if (body && typeof body === "object") {
      const b = body as Record<string, unknown>;
      if (typeof b.errorCode === "string") this.errorCode = b.errorCode;
      if (typeof b.traceReference === "string") this.traceReference = b.traceReference;
    }
  }
}
