# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-03-29

### Added

- README: MIA × Victoriabank banner image (linked to [MIA Business (P2B)](https://www.victoriabank.md/en/operatiuni-curente/mia-business)); product row in the docs table; `assets/` shipped with the npm package so the README image resolves on npmjs.com.

## [1.0.0] - 2026-03-29

First release of **victoriabank-mia-integration** — Node.js / TypeScript client for the Victoria Bank **Business IPS (MIA) Integration API** (spec **v2.0.18**).

### Added

- **`VictoriaBankClient`** — JWT auth (password + refresh), QR lifecycle, reconciliation, signals polling, configurable token refresh buffer and custom `fetch`.
- **`DemoPayClient`** — test payment simulator against the bank demopay host.
- **`createClientFromEnv()`** — one-line client from `process.env` (`VICTORIA_BANK_IPS_*`); optional `authenticate()` (auto-auth on first API call).
- Settings helpers: `envKeys`, `defaultBaseUrlTest`, `createClientFromSettings`, `parseStoredTokensJson`.
- Signal utilities: `extractRrnFromReference`, `splitPaymentReference`.
- **`VictoriaBankApiError`** — structured errors with `errorCode` and `traceReference` from bank responses; messages include `[errorCode] — description` when available.
- **Request timeout** — configurable `timeoutMs` (default 30 s) via `AbortSignal.timeout()`.
- **Retry on transient errors** — 5xx and network failures retried up to `retries` times (default 2) with exponential backoff (500 ms, 1 s, …).
- **Dual ESM + CJS** build (`tsup`) — `import` and `require()` supported; TypeScript **`exports`** with separate import/require types (`index.d.ts` / `index.d.cts`).
- Exported TypeScript types for API payloads, QR structures, signals, tokens, and errors.
- **Documentation** — README mapped to official API v2.0.18 (methods ↔ PDF sections), abbreviations, reconciliation, signals callback, NestJS example, quick starts, **Security** (tokens, secrets).
- **Repository & npm** — `LICENSE` (MIT), `homepage` and `bugs` in `package.json`.
- **GitHub Actions** — CI runs `npm run check`, `npm test`, and `npm run build` on push and pull request (Node.js 18, 20, 22).
