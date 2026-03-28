# victoria-bank-business-ips

[![npm version](https://img.shields.io/npm/v/victoria-bank-business-ips.svg)](https://www.npmjs.com/package/victoria-bank-business-ips)
[![npm downloads](https://img.shields.io/npm/dm/victoria-bank-business-ips.svg)](https://www.npmjs.com/package/victoria-bank-business-ips)
[![Node.js](https://img.shields.io/node/v/victoria-bank-business-ips.svg)](https://www.npmjs.com/package/victoria-bank-business-ips)
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
npm install victoria-bank-business-ips
```

Requires **Node.js 18+** (global `fetch`).

## TypeScript

The package ships `.d.ts` next to compiled ESM. In your `tsconfig.json`, use **`"moduleResolution": "NodeNext"`** or **`"Bundler"`** so `exports` and types resolve correctly.

## Quick start

```typescript
import {
  VictoriaBankClient,
  extractRrnFromReference,
} from "victoria-bank-business-ips";

const client = new VictoriaBankClient({
  baseUrl: "https://test-ipspj.victoriabank.md",
  username: process.env.VICTORIA_BANK_IPS_USERNAME!,
  password: process.env.VICTORIA_BANK_IPS_PASSWORD!,
  onTokens: (t) => {
    // Persist securely (e.g. encrypted column / secret store)
    // t: { accessToken, refreshToken, expiresAtAccess, expiresAtRefresh }
  },
});

await client.authenticate();

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
| `tokenRefreshBufferMs` | Refresh access token this many ms before expiry (default **60000**). |

## Settings and environment variables

Suggested names (your app reads `process.env`):

| Variable | Purpose |
|----------|---------|
| `VICTORIA_BANK_IPS_BASE_URL` | API base URL (default test: `https://test-ipspj.victoriabank.md`) |
| `VICTORIA_BANK_IPS_USERNAME` | API user |
| `VICTORIA_BANK_IPS_PASSWORD` | API password |
| `VICTORIA_BANK_IPS_STORED_TOKENS_JSON` | Optional JSON from `getStoredTokens()` |
| `VICTORIA_BANK_IPS_DEMO_PAY_BASE_URL` | Demo payment simulator base (default: `https://test-ipspj-demopay.victoriabank.md`) |

Helpers: `envKeys`, `defaultBaseUrlTest`, `createClientFromSettings(...)`, `parseStoredTokensJson(...)`.

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
import { DemoPayClient } from "victoria-bank-business-ips";

const demo = new DemoPayClient({ /* baseUrl?, fetch? */ });
const { status, body } = await demo.pay(qrHeaderUUID);
// 202 = success; 400 may return plain text (e.g. EQV|…)
```

Swagger: [test-ipspj-demopay.victoriabank.md](https://test-ipspj-demopay.victoriabank.md/swagger/index.html)

## Errors

Failures throw **`VictoriaBankApiError`** with **`status`** and **`body`** (JSON when parseable; otherwise plain text).

```typescript
import { VictoriaBankApiError } from "victoria-bank-business-ips";

if (error instanceof VictoriaBankApiError) {
  console.error(error.status, error.body);
}
```

## Build from source

```bash
npm install
npm run build
```

Output: `dist/` (ESM + `.d.ts`).

## License

MIT

## Disclaimer

This package is an **unofficial** HTTP client. **Authoritative behavior**, production URLs, certificates, and credentials come from **Victoria Bank** and the **Business IPS Integration API** PDF / Swagger **v2.0.18** (and newer bank releases). Use this SDK together with the official documentation.
