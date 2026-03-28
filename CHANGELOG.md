# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **GitHub Actions** — CI runs `npm run check`, `npm test`, and `npm run build` on every push and pull request (Node.js 18, 20, 22).
- README **Security** section — tokens, rotation, secrets in production.
- **Structured errors** — `VictoriaBankApiError` now exposes `errorCode` and `traceReference` from bank error responses; error messages include `[errorCode] — description` when available.
- **Request timeout** — configurable `timeoutMs` (default 30 s) using `AbortSignal.timeout()`.
- **Retry on transient errors** — 5xx and network failures are retried up to `retries` times (default 2) with exponential backoff (500 ms, 1 s, …).
- **LICENSE** file (MIT) added to repository and npm tarball.
- **`homepage`** and **`bugs`** fields in `package.json` for npm / GitHub links.

## [1.1.0] - 2026-03-28

### Added

- **Dual ESM + CJS build** via `tsup` — NestJS and CommonJS apps can `require()` the package.
- **`createClientFromEnv()`** — one-line client from `process.env` (`VICTORIA_BANK_IPS_*`); optional `authenticate()` (auto-auth on first API call).
- **`@types/node`** in devDependencies for typings.
- TypeScript **`exports`** with separate `import` / `require` types (`index.d.ts` / `index.d.cts`).
- NestJS example and simplified quick start in README.

### Changed

- README: official API v2.0.18 section names mapped to SDK methods; abbreviations, reconciliation dates, reverse-transaction reference, signals callback.
- `VictoriaBankClient` JSDoc aligned with PDF section titles.
- Build: `tsc` emit replaced by `tsup` bundle; `tsc --noEmit` for type-check.

## [1.0.0] - 2026-03-28

### Added

- `VictoriaBankClient` — JWT auth (password + refresh), QR lifecycle, reconciliation, signals polling, configurable token refresh buffer and custom `fetch`.
- `DemoPayClient` — test payment simulator against the bank demopay host.
- Settings helpers: `envKeys`, `defaultBaseUrlTest`, `createClientFromSettings`, `parseStoredTokensJson`.
- Signal utilities: `extractRrnFromReference`, `splitPaymentReference`.
- Exported TypeScript types for API payloads, QR structures, signals, tokens, and `VictoriaBankApiError`.
- Documentation for Victoria Bank Business IPS (MIA) API v2.0.18 (test Swagger / URLs in README).
