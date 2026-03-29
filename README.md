# victoriabank-mia-integration

[![npm version](https://img.shields.io/npm/v/victoriabank-mia-integration.svg)](https://www.npmjs.com/package/victoriabank-mia-integration)
[![npm downloads](https://img.shields.io/npm/dm/victoriabank-mia-integration.svg)](https://www.npmjs.com/package/victoriabank-mia-integration)
[![Node.js](https://img.shields.io/node/v/victoriabank-mia-integration.svg)](https://www.npmjs.com/package/victoriabank-mia-integration)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-ldragos1%2Fvictoria--bank--business--ips-181717?logo=github)](https://github.com/ldragos1/victoria-bank-business-ips)

Node.js / TypeScript client for **Victoria Bank — Business IPS Integration API** (**IPS Business WebApi**), aligned with official specification **v2.0.18**.

| Authoritative docs | URL |
|--------------------|-----|
| **Swagger (test)** | [test-ipspj.victoriabank.md](https://test-ipspj.victoriabank.md/index.html) |
| **PDF** (same version as this client) | *Victoria Bank Business IPS Integration API* **V2.0.18** (from the bank) |

**Base URL (test):** `https://test-ipspj.victoriabank.md`  
**Authentication:** JWT — `Authorization: Bearer <accessToken>` on protected routes; tokens from **`POST /api/identity/token`** (password or refresh_token grant).

---

## How this README maps to the bank PDF

The PDF uses **section titles** (e.g. “New QR”, “QR Status”). This SDK uses **method names** that follow common JS style (`createQr`, `getQrStatus`, …). Use the table below to jump from the **official document** to the **function to call**.

### Official API → SDK methods (v2.0.18)

| § Official name in bank documentation | SDK method | HTTP (test base omitted) |
|--------------------------------------|------------|---------------------------|
| **Authorization** — Password grant | `authenticate()` | `POST /api/identity/token` |
| **Authorization** — Refresh token grant | `refreshAccessToken()` | `POST /api/identity/token` |
| *(client helper)* | `getStoredTokens()` | — persists session; not an HTTP call |
| **New QR** — register payee-presented QR | `createQr(body, { width, height }?)` | `POST /api/v1/qr` |
| **Cancel QR** — cancel payee-presented QR (and active extension if any) | `cancelQr(qrHeaderUUID)` | `DELETE /api/v1/qr/{qrHeaderUUID}` |
| **QR Status** — header + extensions + payments | `getQrStatus(qrHeaderUUID, { nbOfExt, nbOfTxs }?)` | `GET /api/v1/qr/{qrHeaderUUID}/status` |
| **New extension** — HYBR/STAT (replaces previous extension) | `createQrExtension(qrHeaderUUID, extension)` | `POST /api/v1/qr/{qrHeaderUUID}/extentions` *(spelling as in API)* |
| **Cancel extension** — active extension on hybrid QR | `cancelActiveExtension(qrHeaderUUID)` | `DELETE /api/v1/qr/{qrHeaderUUID}/active-extension` |
| **Extension status** | `getExtensionStatus(qrExtensionUUID, { nbOfTxs }?)` | `GET /api/v1/qr-extensions/{qrExtensionUUID}/status` |
| **Reverse transaction** | `reverseTransaction(reference)` | `DELETE /api/v1/transaction/{reference}` |
| **List of transactions** (reconciliation) | `listTransactions({ datefrom, dateto })` | `GET /api/v1/reconciliation/transactions` |
| **Get Last Signal by QR Extension UUID** *(fallback only)* | `getLastSignal(qrExtensionUUID)` | `GET /api/v1/signal/{qrExtensionUUID}` |

**Inbound callback (you implement):** **Signals** — `POST /api/signals` with body = **JSON string containing a JWT** (verify with bank public cert, e.g. `VBCA.crt`). Not a method on `VictoriaBankClient`; see [Signals](#signals-inbound-callback-post-apisignals).

---

### Abbreviations (from bank documentation)

| Term | Meaning |
|------|---------|
| **IPS** | Instant Payment System (BNM) |
| **BNM** | National Bank of Moldova |
| **RTP** | Request to Pay |
| **IBAN** | International Bank Account Number |
| **MIA** | Messaging / integration context used in transaction identifiers |

---

## Install

```bash
npm install victoriabank-mia-integration
```

Requires **Node.js 18+** (global `fetch`).

Works with **ESM** (`import`) and **CommonJS** (`require`) — compatible with **NestJS**, **Express**, **Fastify**, plain Node scripts, and any bundler.

## TypeScript

The package ships `.d.ts` alongside both ESM and CJS outputs. In your `tsconfig.json`, use **`"moduleResolution": "NodeNext"`** or **`"Bundler"`** so `exports` and types resolve correctly.

## Quick start — simplest usage

Set environment variables and use `createClientFromEnv()`. No manual `authenticate()` call needed — the client authenticates automatically on the first API call.

```bash
export VICTORIA_BANK_IPS_USERNAME="your_username"
export VICTORIA_BANK_IPS_PASSWORD="your_password"
# optional:
export VICTORIA_BANK_IPS_BASE_URL="https://test-ipspj.victoriabank.md"
```

```typescript
import { createClientFromEnv } from "victoriabank-mia-integration";

const client = createClientFromEnv();

const qr = await client.createQr({
  header: { qrType: "DYNM", amountType: "Fixed", pmtContext: "e" },
  extension: {
    creditorAccount: { iban: "MD00..." },
    amount: { sum: 100.12, currency: "MDL" },
    remittanceInfo4Payer: "Order #123",
    ttl: { length: 360, units: "mm" },
  },
});

console.log(qr.qrExtensionUUID, qr.qrAsImage);
```

## Quick start — full control

```typescript
import { VictoriaBankClient } from "victoriabank-mia-integration";

const client = new VictoriaBankClient({
  baseUrl: "https://test-ipspj.victoriabank.md",
  username: process.env.VICTORIA_BANK_IPS_USERNAME!,
  password: process.env.VICTORIA_BANK_IPS_PASSWORD!,
  onTokens: (t) => {
    // Persist securely (e.g. encrypted column / secret store)
    // t: { accessToken, refreshToken, expiresAtAccess, expiresAtRefresh }
  },
});

// authenticate() is optional — the client auto-authenticates on the first API call.
// Call it explicitly only if you want to verify credentials early (fail fast).
// await client.authenticate();

const qr = await client.createQr(
  {
    header: {
      qrType: "DYNM",
      amountType: "Fixed",
      pmtContext: "e",
    },
    extension: {
      creditorAccount: { iban: "MD00..." },
      amount: { sum: 100.12, currency: "MDL" },
      remittanceInfo4Payer: "Order #123",
      ttl: { length: 360, units: "mm" },
    },
  },
  { width: 300, height: 300 }
);

console.log(qr.qrExtensionUUID, qr.qrAsImage);
```

### Optional constructor fields

| Field | Purpose |
|-------|---------|
| `initialTokens` | Resume a session (`StoredTokens` from a previous run). |
| `onTokens` | Called whenever tokens change — persist `refreshToken` securely. |
| `fetch` | Custom `fetch` (tests, proxies, or non-global fetch). |
| `tokenRefreshBufferMs` | Refresh access token this many ms before expiry (default **60 000**). |
| `timeoutMs` | Per-request timeout in milliseconds (default **30 000**). Set `0` to disable. |
| `retries` | Max retries on transient errors (5xx / network). Default **2**. Uses exponential backoff (500 ms, 1 s, …). |

## Settings and environment variables

Suggested names (your app reads `process.env`):

| Variable | Purpose |
|----------|---------|
| `VICTORIA_BANK_IPS_BASE_URL` | API base URL (default test: `https://test-ipspj.victoriabank.md`) |
| `VICTORIA_BANK_IPS_USERNAME` | API user |
| `VICTORIA_BANK_IPS_PASSWORD` | API password |
| `VICTORIA_BANK_IPS_STORED_TOKENS_JSON` | Optional JSON from `getStoredTokens()` |
| `VICTORIA_BANK_IPS_DEMO_PAY_BASE_URL` | Demo payment simulator base (default: `https://test-ipspj-demopay.victoriabank.md`) |

Helpers: `createClientFromEnv()`, `createClientFromSettings(...)`, `envKeys`, `defaultBaseUrlTest`, `parseStoredTokensJson(...)`.

## Token persistence

1. Persist from **`onTokens`**, or snapshot via **`getStoredTokens()`**.
2. Store: `JSON.stringify(client.getStoredTokens())` when not `null`.
3. Restore: **`initialTokens: parseStoredTokensJson(saved)`** (or via `createClientFromSettings`).

The client refreshes access tokens before expiry (**`tokenRefreshBufferMs`**) and falls back to password grant if refresh returns 400/401.

## QR types (PDF § QR Code Types and Amount Types)

| QR type | Meaning (short) |
|---------|-----------------|
| **DYNM** | One QR → one payment; then invalidated. |
| **STAT** | Reusable; **90 days** validity from last payment (per bank rules). |
| **HYBR** | Static QR; **extension** payload can change. |

**Amount types:** `Fixed` | `Controlled` | `Free` — constraints depend on QR type (see PDF tables).

**`pmtContext`:** `m` (mobile) \| `e` (e-commerce) \| `i` (invoice) \| **`o`** (other — **letter o**, not zero).

## Reverse transaction — `reference` parameter

Per **v2.0.18**, `DELETE /api/v1/transaction/{reference}` expects the **external payment reference**: the **4th pipe-delimited segment** of the full IPS reference string (e.g. from signals or status endpoints), **not** the full `pacs.008…|…|…|…` line.

Example full value (from PDF):

`pacs.008.001.10|2025-04-23|VICBMD2X|VICBMD2XAXXX250423463390000017890` → use **`VICBMD2XAXXX250423463390000017890`** with `reverseTransaction(...)`.

Helpers: `extractRrnFromReference`, `splitPaymentReference`.

## Reconciliation — date format

**List of transactions** query parameters **`datefrom`** and **`dateto`** must be **`YYYY-MM-DD`** (PDF example: `2024-08-01` … `2024-08-13`).

## Signals (inbound callback) — `POST /api/signals`

The bank calls **your** URL with **`POST /api/signals`**. The request body is a **JSON string whose value is a JWT** (not a raw JSON object). Verify the signature using the bank public certificate (**`VBCA.crt`** in bank docs). Decoded payload matches signal objects (`signalCode`, `qrExtensionUUID`, `payment`, …).

Exported types: `BankSignalPayload`, `SignalCode`, etc. — see `dist/*.d.ts`.

**Polling fallback:** `getLastSignal(qrExtensionUUID)` maps to **Get Last Signal by QR Extension UUID**; the PDF recommends **POST `/api/signals`** as the primary integration.

## Demo payment simulator (test only)

Separate host from the main IPS API. Not always described in the main integration PDF; see Swagger:

```typescript
import { DemoPayClient } from "victoriabank-mia-integration";

const demo = new DemoPayClient({ /* baseUrl?, fetch? */ });
const { status, body } = await demo.pay(qrHeaderUUID);
// 202 = success; 400 may return plain text (e.g. EQV|…)
```

Swagger: [test-ipspj-demopay.victoriabank.md](https://test-ipspj-demopay.victoriabank.md/swagger/index.html)

## Usage with NestJS

```typescript
import { Injectable } from "@nestjs/common";
import { createClientFromEnv } from "victoriabank-mia-integration";

@Injectable()
export class VictoriaBankService {
  private client = createClientFromEnv();

  async createPaymentQr(iban: string, amount: number) {
    return this.client.createQr({
      header: { qrType: "DYNM", amountType: "Fixed", pmtContext: "e" },
      extension: {
        creditorAccount: { iban },
        amount: { sum: amount, currency: "MDL" },
        remittanceInfo4Payer: "Payment",
        ttl: { length: 360, units: "mm" },
      },
    });
  }
}
```

No `authenticate()`, no manual env mapping, no NestJS adapter needed.

## Errors

Failures throw **`VictoriaBankApiError`** with:

| Property | Type | Description |
|----------|------|-------------|
| `status` | `number` | HTTP status code |
| `body` | `unknown` | Parsed JSON when possible; raw string otherwise |
| `errorCode` | `string?` | Bank error code when present (e.g. `"VB10403"`, `"EQ1"`) |
| `traceReference` | `string?` | Bank trace UUID for support tickets |

When the bank returns a structured error (`{ errorCode, description, traceReference }`), the **`message`** includes the code and description automatically:

> `Token request failed: 401 — [VB10403] — IDX10230: Lifetime validation failed…`

```typescript
import { VictoriaBankApiError } from "victoriabank-mia-integration";

try {
  await client.authenticate();
} catch (e) {
  if (e instanceof VictoriaBankApiError) {
    console.error(e.message);        // human-readable with errorCode + description
    console.error(e.errorCode);      // "VB10403"
    console.error(e.traceReference); // "a19df424-..."
    console.error(e.status);         // 401
  }
}
```

## Build from source

```bash
npm install
npm run build
```

Output (`dist/`):
- `index.js` + `index.js.map` — ESM
- `index.cjs` + `index.cjs.map` — CommonJS (NestJS / `require()`)
- `index.d.ts` + `index.d.cts` — TypeScript declarations

## Security

- **Never log** `accessToken` or `refreshToken` (application logs, APM, error trackers, or `console.log` of API responses).
- If tokens **leak**, treat it as an incident: **rotate** API credentials with the bank where applicable, **invalidate** stored tokens, and issue new sessions.
- In **production**, keep **username**, **password**, and any persisted token JSON in a **secrets manager** or other encrypted configuration — not committed files or shared `.env` in chat.

## License

MIT

## Disclaimer

This package is an **unofficial** HTTP client. **Authoritative behavior**, production URLs, certificates, and credentials come from **Victoria Bank** and the **Business IPS Integration API** PDF / Swagger **v2.0.18** (and newer bank releases). Use this SDK together with the official documentation.
