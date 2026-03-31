# victoriabank-mia-integration

[![MIA Business (P2B) — Victoriabank](assets/mia-victoriabank-banner.png)](https://www.victoriabank.md/en/operatiuni-curente/mia-business)

[![npm version](https://img.shields.io/npm/v/victoriabank-mia-integration.svg)](https://www.npmjs.com/package/victoriabank-mia-integration)
[![npm downloads](https://img.shields.io/npm/dm/victoriabank-mia-integration.svg)](https://www.npmjs.com/package/victoriabank-mia-integration)
[![Node.js](https://img.shields.io/node/v/victoriabank-mia-integration.svg)](https://www.npmjs.com/package/victoriabank-mia-integration)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-ldragos1%2Fvictoria--bank--business--ips-181717?logo=github)](https://github.com/ldragos1/victoria-bank-business-ips)

Node.js / TypeScript client for **Victoria Bank Business IPS Integration API** — official name **IPS Business WebApi**, specification **v2.0.18**. The API connects juridical persons’ systems (e‑commerce, invoicing, etc.) to the **Instant Payment System (IPS)** operated by the **National Bank of Moldova (BNM)** for real‑time payments, **Request to Pay (RTP)**, and QR‑based flows.

### API at a glance

| | |
|--|--|
| **API name** | IPS Business WebApi |
| **Specification** | *Victoria Bank Business IPS Integration API* **v2.0.18** (this SDK tracks the same HTTP surface for MIA / QR flows) |
| **Test base URL** | `https://test-ipspj.victoriabank.md` |
| **Production base URL** *(bank integration guide)* | `https://ips-api-pj.vb.md` |
| **Auth** | JWT — `Authorization: Bearer <accessToken>` on protected routes; tokens from **`POST /api/identity/token`** by default (`application/x-www-form-urlencoded`, password or `refresh_token` grant). Some bank OpenAPI / HTML samples use **`POST /identity/token`** (no `/api` prefix) — set **`identityTokenPath: "/identity/token"`** if your host returns **404** on the default path. **HTTPS only** (all traffic must be TLS). |

### Documentation

| Source | Notes |
|--------|--------|
| **Specification (v2.0.18)** | Authoritative document — [Victoria Bank Business IPS Integration API](./docs/victoria-bank-business-ips-integration-api-v2.0.18.pdf) *(PDF bundled in this repo and npm package; © Victoria Bank)*. |
| **QR errors & warnings** | IPS QR error/warning catalog — [Errors and Warnings QR](./docs/errors-and-warnings-qr.pdf) *(BNM IPS facility "Q"; bundled in this repo)*. |
| **Webhook JWT verification** | Victoria Bank public cert — [`docs/VBCA.crt`](./docs/VBCA.crt) *(bundled in this repo and npm package; use with `jose`, `jsonwebtoken`, or your stack to verify `POST /api/signals`)*. |
| **Swagger (test)** | Machine-readable API + try-it UI — [test-ipspj.victoriabank.md/index.html](https://test-ipspj.victoriabank.md/index.html) |
| **MIA Business (product)** | Bank product page — [Victoriabank — MIA Business (P2B)](https://www.victoriabank.md/en/operatiuni-curente/mia-business) |

**Bank OpenAPI export (`json-test.json` style):** Often labeled **v1.0** at the `info.version` level and may list **extra** endpoints (company, sell point, bank account, RTP, e‑commerce, users, …) beyond this package. This SDK focuses on **QR, signals polling, reversal, reconciliation, and auth** as in the IPS Integration API PDF. Reconciliation **`GET /api/v1/reconciliation/transactions`** uses query **`dateFrom`**, **`dateTo`** (camelCase, optional **`messageId`**) — matching the bank integration guides. Legacy **`datefrom` / `dateto`** keys are still accepted in **`listTransactions`** and are normalized to camelCase on the wire. **`GET /api/v1/health/status`** is available for health checks but is not wrapped as a method here (optional `fetch` to that URL if needed).

---

## Specification → SDK reference

The bank’s **published specification** uses **section titles** (e.g. “New QR”, “QR Status”). This SDK exposes the same operations as **JavaScript methods** in camelCase (`createQr`, `getQrStatus`, …). The table below maps **specification sections** to **SDK methods** and HTTP routes (test base URL omitted).

### API operations (v2.0.18)

| Bank specification | SDK method | HTTP (relative path) |
|--------------------|------------|------------------------|
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
| **List of transactions** (reconciliation) | `listTransactions({ dateFrom, dateTo, messageId? })` *(legacy: `datefrom`, `dateto`)* | `GET /api/v1/reconciliation/transactions` |
| **Get Last Signal by QR Extension UUID** *(fallback only)* | `getLastSignal(qrExtensionUUID)` | `GET /api/v1/signal/{qrExtensionUUID}` |

**Inbound callback (you implement):** **Signals** — `POST /api/signals` with body = **JSON string containing a JWT** (verify with bundled [`docs/VBCA.crt`](./docs/VBCA.crt) or **`VICTORIA_BANK_SIGNAL_PUBLIC_CERT_PATH`**). Not a method on `VictoriaBankClient`; see [Signals](#signals-inbound-callback-post-apisignals).

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
| `identityTokenPath` | OAuth token URL path (default **`/api/identity/token`**). Use **`/identity/token`** if your bank gateway matches OpenAPI/HTML samples without `/api`. |
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
| `VICTORIA_BANK_IPS_BASE_URL` | API base URL (default test: `https://test-ipspj.victoriabank.md`; production example: `https://ips-api-pj.vb.md`) |
| `VICTORIA_BANK_IPS_IDENTITY_TOKEN_PATH` | Optional. Set to `/identity/token` if the default `/api/identity/token` returns **404**. |
| `VICTORIA_BANK_IPS_USERNAME` | API user |
| `VICTORIA_BANK_IPS_PASSWORD` | API password |
| `VICTORIA_BANK_IPS_DEMO_PAY_BASE_URL` | Demo payment simulator base (default: `https://test-ipspj-demopay.victoriabank.md`) |

Helpers: `createClientFromEnv()`, `createClientFromSettings(...)`, `envKeys`, `defaultBaseUrlTest`.

## Token persistence

1. Persist from **`onTokens`**, or snapshot via **`getStoredTokens()`**.
2. Store: `JSON.stringify(client.getStoredTokens())` when not `null`.
3. Restore: pass **`initialTokens`** to `VictoriaBankClient` or `createClientFromSettings`.

The client refreshes access tokens before expiry (**`tokenRefreshBufferMs`**) and falls back to password grant if refresh returns 400/401.

## QR code types and amount types

*Corresponds to **QR Code Types and Amount Types** in the v2.0.18 specification.*

| QR type | Meaning (short) |
|---------|-----------------|
| **DYNM** | One QR → one payment; then invalidated. |
| **STAT** | Reusable; **90 days** validity from last payment (per bank rules). |
| **HYBR** | Static QR; **extension** payload can change. |

**Amount types:** `Fixed` | `Controlled` | `Free` — which fields you send (`amount.sum` vs `amountMin` / `amountMax`) depends on the amount type; see the specification’s **Amount Type** tables.

**QR type × TTL / amount (summary):**

| QR type | TTL on extension | Notes |
|---------|------------------|--------|
| **DYNM** | Required | Usually **Fixed** with `amount.sum`. |
| **STAT** | Not required | **Controlled** uses `amountMin` / `amountMax`; **Free** has no fixed sum. |
| **HYBR** | Required | Static QR; extension payload can be replaced. Often **Free** in examples. |

**`pmtContext`:** `m` (mobile) \| `e` (e-commerce) \| `i` (invoice) \| **`o`** (other — **letter o**, not zero). In **v2.0.18** the value is the **letter** `o`, not the number `0`.

## Reverse transaction — `reference` parameter

Per **v2.0.18**, `DELETE /api/v1/transaction/{reference}` expects the **external payment reference**: the **entire 4th pipe-delimited segment** of the full IPS reference string (from signals, QR status, extension status, or reconciliation `miaId`), **not** the full `pacs.008…|…|…|…` line.

Example full value (from the specification):

`pacs.008.001.10|2025-04-23|VICBMD2X|VICBMD2XAXXX250423463390000017890` → pass **`VICBMD2XAXXX250423463390000017890`** to `reverseTransaction(...)` (full 4th segment only).

Use **`extractFourthSegmentFromReference(fullReference)`** when you have the full pipe-delimited `payment.reference` string and need the value for **`reverseTransaction`** — do **not** use **`extractRrnFromReference`** for reversals (that helper returns only the last 12 characters of the 4th segment).

**RRN (Retrieval Reference Number)** — for display / parsing only: the last **12** characters of the 4th segment (or the whole segment if ≤12 chars). Use **`extractRrnFromReference(reference)`**. The bank notes RRN is **not** guaranteed unique; do not use it as a sole primary key.

**Helpers:** `extractFourthSegmentFromReference`, `extractRrnFromReference`, `splitPaymentReference`.

## Reconciliation — date format

**List of transactions** query parameters **`dateFrom`** and **`dateTo`** must be **`YYYY-MM-DD`** (inclusive range). Optional **`messageId`** filters by message ID. Example: `2024-08-01` … `2024-08-13`. Legacy callers may still pass **`datefrom`** / **`dateto`**; the client sends camelCase to the API.

The JSON response uses the root key **`transactionsInfo`** (array of transaction rows). Reconciliation entries align **`miaId`** with the `reference` field in **Signals** when matching payments.

## Signals (inbound callback) — `POST /api/signals`

The bank calls **your** URL with **`POST /api/signals`**. The request body is a **JSON string whose value is a JWT** (not a raw JSON object). Verify the signature using the Victoria Bank public certificate shipped with this package as **`docs/VBCA.crt`**, or **`import { VICTORIA_BANK_SIGNAL_PUBLIC_CERT_PATH } from "victoriabank-mia-integration"`** and read that file at runtime (absolute path under `node_modules/.../docs/VBCA.crt`). The bank recommends configuring **two** certificate keys where possible so JWT verification keeps working when certificates rotate.

Decoded payload matches signal objects (`signalCode`, `qrExtensionUUID`, `payment`, …). Common **`signalCode`** values in the spec: **`Payment`**, **`Expiration`**, **`Inactivation`**.

Exported types: `BankSignalPayload`, `SignalCode`, etc. — see `dist/*.d.ts`.

**Polling fallback:** `getLastSignal(qrExtensionUUID)` maps to **Get Last Signal by QR Extension UUID**; the specification recommends **POST `/api/signals`** as the primary integration.

### Recommended integration flow (from bank guidance)

1. Persist **`qrExtensionUUID`** from **`createQr`** (and optionally **`qrHeaderUUID`**) against your order or invoice.
2. On **`POST /api/signals`**, locate the row by **`qrExtensionUUID`**; optionally store **`payment.reference`** for reversals and reconciliation.
3. Use **`listTransactions`**, QR status, or extension status if you need to recover **`reference`** later without storing it.

## Demo payment simulator (test only)

Separate host from the main IPS API. Details are in the demopay **Swagger** (not always repeated in the main integration specification):

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

Bank JSON errors often include **`errorCode`** and **`description`**. **BNM / QR** codes may look like **`EQ1`**, **`EQV|…`** (facility + code); **Victoria Bank** codes typically use a **`VB`** prefix (e.g. **`VB10403`**). The bank's **QR errors & warnings** attachment (bundled as `docs/errors-and-warnings-qr.pdf`) documents all BNM IPS QR messages — this SDK ships the full catalog as a typed constant (`QR_MESSAGES`) with lookup helpers.

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

### QR errors & warnings catalog

The IPS defines **43 errors** and **10 warnings** in the QR facility (codes `EQ1`–`EQ43`, `WQ1`–`WQ10`). This SDK ships the full catalog as `QR_MESSAGES` with typed lookup helpers.

**Lookup by code:**

```typescript
import { getQrMessage, getQrMessagesByCode, matchQrErrorCode } from "victoriabank-mia-integration";

getQrMessage(7, "error");
// → { code: 7, severity: "error", description: "Target QR code does not exist" }

getQrMessagesByCode(1);
// → [{ code: 1, severity: "warning", … }, { code: 1, severity: "error", … }]
```

**Match an API error code or demo-pay text:**

```typescript
matchQrErrorCode("EQ7");
// → { code: 7, severity: "error", description: "Target QR code does not exist" }

matchQrErrorCode("EQV|Target QR code does not exist");
// → same match (demo-pay plain-text format)
```

**Use with `VictoriaBankApiError`:**

```typescript
import { VictoriaBankApiError, matchQrErrorCode } from "victoriabank-mia-integration";

try {
  await client.createQr(/* … */);
} catch (e) {
  if (e instanceof VictoriaBankApiError && e.errorCode) {
    const qrMsg = matchQrErrorCode(e.errorCode);
    if (qrMsg) {
      console.log(`IPS QR ${qrMsg.severity} #${qrMsg.code}: ${qrMsg.description}`);
    }
  }
}
```

**Helpers:** `QR_MESSAGES`, `getQrMessage`, `getQrMessagesByCode`, `getQrErrors`, `getQrWarnings`, `matchQrErrorCode`.

<details>
<summary><strong>Full QR error catalog (EQ1–EQ43)</strong></summary>

| Code | Description |
|------|-------------|
| EQ1 | When creating dynamic or static QR code request body must contain extension object |
| EQ2 | Free amountType is not allowed for dynamic and hybrid QR codes. Use Fixed or Controlled |
| EQ3 | Invalid set of amountMin, amount and amountMax for given amountType |
| EQ4 | TTL is out of allowed range |
| EQ5 | Can not validate QR code extension as at least one of the following parameters is not configured: TTL_MIN_SS, TTL_MAX_SS |
| EQ6 | Can not create QR code as at least one of the following parameters is not configured: QRC_PREFIX, QRC_PROVIDER |
| EQ7 | Target QR code does not exist |
| EQ8 | Participant can modify or inquire into own QR codes only |
| EQ9 | New extensions are not allowed when QR code status is … |
| EQ10 | New extensions are not allowed for dynamic QR codes |
| EQ11 | ttl is present, yet not expected for static QR codes |
| EQ12 | Field value is unparsable or non-positive |
| EQ13 | ttl is missing, yet required for dynamic and hybrid QR codes |
| EQ14 | Inconsistent values of amountMin, amount, amountMax |
| EQ15 | Payment is not allowed when QR code status is … |
| EQ16 | QR code is locked by payment in progress |
| EQ17 | QR code is not complete to support transaction. Extension is missing or not Active |
| EQ18 | QR code expired |
| EQ19 | Target QR extension does not exist |
| EQ20 | Requested amount is not valid. Cryptogram denied |
| EQ21 | Creditor agent is not recognized |
| EQ22 | QR code is already impossible to pay. Cancellation is neither relevant nor applicable |
| EQ23 | Cancellation of extension is allowed only for hybrid QR codes |
| EQ24 | Cancellation of extension is impossible as target QR code has no extension |
| EQ25 | QR code extension is already impossible to pay. Cancellation is neither relevant nor possible |
| EQ26 | QR code extension expired |
| EQ27 | Lock either doesn't exist or belongs to other participant |
| EQ28 | Wrong target QR code. Lock management is impossible for a hybrid QR code without extension |
| EQ29 | Lock either does not exist or already expired |
| EQ30 | Invalid boc value |
| EQ31 | Invalid ttc value |
| EQ32 | QRC_CRYPTO_SIGNER parameter is not defined |
| EQ33 | Unauthorized signer of the QR code cryptogram |
| EQ34 | Certificate needed to check QR code cryptogram is missing or inactive |
| EQ35 | QR code cryptogram has invalid signature |
| EQ36 | Certificate ownership error detected when checking QR code cryptogram |
| EQ37 | QR code cryptogram expired |
| EQ38 | Cannot find in payment message path(s) required by QR code cryptogram |
| EQ39 | Mismatch of parameter values in payment and parent QR code |
| EQ40 | Payment against QR code must have a cryptogram |
| EQ41 | Invalid currency |
| EQ42 | Outgoing signal delivery retries are not possible as at least one of required setting is not defined |
| EQ43 | Outgoing signal delivery retry period must be less than archiving threshold |

</details>

<details>
<summary><strong>Full QR warning catalog (WQ1–WQ10)</strong></summary>

| Code | Description |
|------|-------------|
| WQ1 | Lock management is neither required nor possible for static QR codes |
| WQ2 | Target QR code extension is not found when landing payment |
| WQ3 | Unexpected status of QR code extension when landing payment |
| WQ4 | QR code lock is expected yet missing when landing payment |
| WQ5 | Payment amount conflicts with that requested in QR code |
| WQ6 | Signal ignored. Payment with given reference for given payment system already registered |
| WQ7 | Given payment system is unknown |
| WQ8 | Given dynamic or hybrid QR code already paid |
| WQ9 | Given payment system is not expected in payment signals coming from participants |
| WQ10 | Payment via the given payment system is not expected by payee |

</details>

## Client-side QR validation

Optional **pre-flight validation** helpers catch request issues that the IPS would reject — before making the HTTP call. Mapped to the bank's QR error catalog codes.

```typescript
import { validateNewQrRequest } from "victoriabank-mia-integration";

const issues = validateNewQrRequest({
  header: { qrType: "DYNM", amountType: "Free", pmtContext: "e" },
  extension: {
    creditorAccount: { iban: "MD00..." },
  },
});
// [
//   { code: 2, message: "Free amountType is not allowed for dynamic and hybrid QR codes …(EQ2)." },
//   { code: 13, message: "TTL is missing, yet required for dynamic and hybrid QR codes (EQ13)." },
// ]
```

**For extensions on existing QR codes:**

```typescript
import { validateQrExtension } from "victoriabank-mia-integration";

const issues = validateQrExtension("HYBR", "Fixed", {
  creditorAccount: { iban: "MD00..." },
  amount: { sum: 50, currency: "MDL" },
  ttl: { length: 60, units: "mm" },
});
// [] — valid
```

**Checks performed** (mapped to IPS error codes):

| Check | IPS code | Rule |
|-------|----------|------|
| Extension object required | EQ1 | DYNM and STAT require `extension` in the request body |
| Free + DYNM/HYBR | EQ2 | Use `Fixed` or `Controlled` for dynamic / hybrid QR codes |
| Amount field mismatch | EQ3 | `Fixed` needs `amount`; `Controlled` needs `amountMin` + `amountMax` |
| TTL on STAT | EQ11 | Static QR codes must **not** include TTL |
| TTL missing for DYNM/HYBR | EQ13 | Dynamic and hybrid QR codes **require** TTL |
| Inconsistent amount fields | EQ14 | `Fixed` must not include min/max; `Controlled` must not include `amount` |
| Extension on DYNM | EQ10 | Dynamic QR codes do not support new extensions after creation |

**Helpers:** `validateNewQrRequest`, `validateQrExtension`. Return type: `QrValidationIssue[]`.

## Build from source

```bash
npm install
npm run build
```

Output (`dist/`):
- `index.js` + `index.js.map` — ESM
- `index.cjs` + `index.cjs.map` — CommonJS (NestJS / `require()`)
- `index.d.ts` + `index.d.cts` — TypeScript declarations

Bundled under `docs/` in the npm package: `victoria-bank-business-ips-integration-api-v2.0.18.pdf`, `errors-and-warnings-qr.pdf`, and **`VBCA.crt`** (public cert for webhook JWT verification).

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

This package is an **unofficial** HTTP client. **Authoritative behavior**, production URLs, certificates, and credentials come from **Victoria Bank** — the **Business IPS Integration API** specification **v2.0.18**, **OpenAPI (Swagger)**, and subsequent bank releases. Use this SDK together with the official documentation.
