# victoriabank-mia-integration

[![MIA Business (P2B) — Victoriabank](assets/mia-victoriabank-banner.png)](https://www.victoriabank.md/en/operatiuni-curente/mia-business)

[![npm version](https://img.shields.io/npm/v/victoriabank-mia-integration.svg)](https://www.npmjs.com/package/victoriabank-mia-integration)
[![npm downloads](https://img.shields.io/npm/dm/victoriabank-mia-integration.svg)](https://www.npmjs.com/package/victoriabank-mia-integration)
[![Node.js](https://img.shields.io/node/v/victoriabank-mia-integration.svg)](https://www.npmjs.com/package/victoriabank-mia-integration)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-ldragos1%2Fvictoria--bank--business--ips-181717?logo=github)](https://github.com/ldragos1/victoria-bank-business-ips)

Node.js / TypeScript client for **Victoria Bank Business IPS Integration API** — official name **IPS Business WebApi**, specification **v2.0.18**. The API connects juridical persons’ systems (e‑commerce, invoicing, etc.) to the **Instant Payment System (IPS)** operated by the **National Bank of Moldova (BNM)** for real‑time payments, **Request to Pay (RTP)**, and QR‑based flows.

### API at a glance (test environment)

| | |
|--|--|
| **API name** | IPS Business WebApi |
| **Specification** | *Victoria Bank Business IPS Integration API* **v2.0.18** (this SDK tracks the same version) |
| **Base URL** | `https://test-ipspj.victoriabank.md` |
| **Auth** | JWT — `Authorization: Bearer <accessToken>` on protected routes; tokens from **`POST /api/identity/token`** (`application/x-www-form-urlencoded`, password or `refresh_token` grant). **HTTPS only** (all traffic must be TLS). |

### Documentation

| Source | Notes |
|--------|--------|
| **Integration PDF (v2.0.18)** | Authoritative specification — [Victoria Bank Business IPS Integration API](./docs/victoria-bank-business-ips-integration-api-v2.0.18.pdf) *(bundled in this repo and npm package; copyright Victoria Bank)*. |
| **Swagger (test)** | Machine-readable API + try-it UI — [test-ipspj.victoriabank.md/index.html](https://test-ipspj.victoriabank.md/index.html) |
| **MIA Business (product)** | Bank product page — [Victoriabank — MIA Business (P2B)](https://www.victoriabank.md/en/operatiuni-curente/mia-business) |

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
| **BNM** | National Bank of Moldova |
| **CBS** | Core Banking System |
| **CAS** | Central Aliases Services |
| **IBAN** | International Bank Account Number |
| **IPS** | Instant Payment System (national instant payments infrastructure) |
| **MIA** | **MIA Business** — Victoria Bank’s business payment integration on **BNM IPS** (the product this API implements; also appears in fields such as `miaId` and payment type `IPSMIA`) |
| **P2P** | Peer to peer |
| **RTP** | Request to Pay |

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
| `VICTORIA_BANK_IPS_DEMO_PAY_BASE_URL` | Demo payment simulator base (default: `https://test-ipspj-demopay.victoriabank.md`) |

Helpers: `createClientFromEnv()`, `createClientFromSettings(...)`, `envKeys`, `defaultBaseUrlTest`.

## Token persistence

1. Persist from **`onTokens`**, or snapshot via **`getStoredTokens()`**.
2. Store: `JSON.stringify(client.getStoredTokens())` when not `null`.
3. Restore: pass **`initialTokens`** to `VictoriaBankClient` or `createClientFromSettings`.

The client refreshes access tokens before expiry (**`tokenRefreshBufferMs`**) and falls back to password grant if refresh returns 400/401.

## QR types (PDF § QR Code Types and Amount Types)

| QR type | Meaning (short) |
|---------|-----------------|
| **DYNM** | One QR → one payment; then invalidated. |
| **STAT** | Reusable; **90 days** validity from last payment (per bank rules). |
| **HYBR** | Static QR; **extension** payload can change. |

**Amount types:** `Fixed` | `Controlled` | `Free` — which fields you send (`amount.sum` vs `amountMin` / `amountMax`) depends on the amount type; see the PDF **Amount Type** tables.

**QR type × TTL / amount (summary from PDF):**

| QR type | TTL on extension | Notes |
|---------|------------------|--------|
| **DYNM** | Required | Usually **Fixed** with `amount.sum`. |
| **STAT** | Not required | **Controlled** uses `amountMin` / `amountMax`; **Free** has no fixed sum. |
| **HYBR** | Required | Static QR; extension payload can be replaced. Often **Free** in examples. |

**`pmtContext`:** `m` (mobile) \| `e` (e-commerce) \| `i` (invoice) \| **`o`** (other — **letter o**, not zero). In **v2.0.18** the value is the **letter** `o`, not the number `0`.

## Reverse transaction — `reference` parameter

Per **v2.0.18**, `DELETE /api/v1/transaction/{reference}` expects the **external payment reference**: the **entire 4th pipe-delimited segment** of the full IPS reference string (from signals, QR status, extension status, or reconciliation `miaId`), **not** the full `pacs.008…|…|…|…` line.

Example full value (from PDF):

`pacs.008.001.10|2025-04-23|VICBMD2X|VICBMD2XAXXX250423463390000017890` → pass **`VICBMD2XAXXX250423463390000017890`** to `reverseTransaction(...)` (full segment).

**RRN (Retrieval Reference Number)** — bank rule for display/parsing: split `reference` by `|`, take the **4th segment**, then take the **last 12 characters** (or the whole segment if shorter). Use **`extractRrnFromReference(reference)`** for that. The bank notes RRN is **not** guaranteed unique; do not use it as a sole primary key. **`reverseTransaction`** uses the **full** 4th segment, not the 12-character RRN substring.

**Helpers:** `extractRrnFromReference`, `splitPaymentReference`.

## Reconciliation — date format

**List of transactions** query parameters **`datefrom`** and **`dateto`** must be **`YYYY-MM-DD`** (PDF example: `2024-08-01` … `2024-08-13`).

The JSON response uses the root key **`transactionsInfo`** (array of transaction rows). Reconciliation entries align **`miaId`** with the `reference` field in **Signals** when matching payments.

## Signals (inbound callback) — `POST /api/signals`

The bank calls **your** URL with **`POST /api/signals`**. The request body is a **JSON string whose value is a JWT** (not a raw JSON object). Verify the signature using the bank public certificate (**`VBCA.crt`** in bank docs). The bank recommends configuring **two** certificate keys where possible so JWT verification keeps working when certificates rotate.

Decoded payload matches signal objects (`signalCode`, `qrExtensionUUID`, `payment`, …). Common **`signalCode`** values in the spec: **`Payment`**, **`Expiration`**, **`Inactivation`**.

Exported types: `BankSignalPayload`, `SignalCode`, etc. — see `dist/*.d.ts`.

**Polling fallback:** `getLastSignal(qrExtensionUUID)` maps to **Get Last Signal by QR Extension UUID**; the PDF recommends **POST `/api/signals`** as the primary integration.

### Recommended integration flow (from bank guidance)

1. Persist **`qrExtensionUUID`** from **`createQr`** (and optionally **`qrHeaderUUID`**) against your order or invoice.
2. On **`POST /api/signals`**, locate the row by **`qrExtensionUUID`**; optionally store **`payment.reference`** for reversals and reconciliation.
3. Use **`listTransactions`**, QR status, or extension status if you need to recover **`reference`** later without storing it.

## Demo payment simulator (test only)

Separate host from the main IPS API. Not always described in the main integration PDF; see Swagger:

**[`POST /api/Pay`](https://test-ipspj-demopay.victoriabank.md/swagger/index.html)** (OpenAPI schema `InitQrPayRequest`) sends JSON `{ "qrHeaderUUID": "<uuid>" }` (nullable in the spec). That UUID is the **QR header** you got from **`POST /api/v1/qr`** on the main IPS API. The demopay service **simulates a payer completing a payment** against that QR so you can test end-to-end flows (status, signals, reconciliation) **without a real banking app or live money**. Sandbox/test only.

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

Bank JSON errors often include **`errorCode`** and **`description`**. **BNM / QR** codes may look like **`EQ1`**, **`EQV|…`** (facility + code); **Victoria Bank** codes typically use a **`VB`** prefix (e.g. **`VB10403`**). A separate bank attachment documents BNM QR messages; treat codes as authoritative for support.

**HTTP:** **`401`** — missing/invalid `Authorization`, or expired access token. **`5xx`** — server-side; the client may **retry** (see `retries`). Successful responses are typically **`2xx`** (e.g. **`204`** for some deletes).

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

Specification PDF (also published on npm): `docs/victoria-bank-business-ips-integration-api-v2.0.18.pdf`.

## Security

- **HTTPS only** — the API is not intended for plain HTTP.
- **Never log** `accessToken` or `refreshToken` (application logs, APM, error trackers, or `console.log` of API responses).
- **Store refresh tokens** securely; they can mint new access tokens until they expire.
- If tokens **leak**, treat it as an incident: **rotate** API credentials with the bank where applicable, **invalidate** stored tokens, and issue new sessions.
- In **production**, keep **username**, **password**, and any persisted token JSON in a **secrets manager** or other encrypted configuration — not committed files or shared `.env` in chat.
- **Production base URL** and credentials are issued by **Victoria Bank**; the host in this README is the **test** environment unless your bank documentation states otherwise.

## License

MIT

## Disclaimer

This package is an **unofficial** HTTP client. **Authoritative behavior**, production URLs, certificates, and credentials come from **Victoria Bank** and the **Business IPS Integration API** PDF / Swagger **v2.0.18** (and newer bank releases). Use this SDK together with the official documentation.
