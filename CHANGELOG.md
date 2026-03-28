# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- README: official **Victoria Bank Business IPS Integration API v2.0.18** section names mapped to SDK methods; abbreviations, reconciliation date format, reverse-transaction reference rule, and signals callback clarified.
- `VictoriaBankClient` JSDoc: aligned method comments with PDF section titles (no runtime/API changes).

## [1.0.0] - 2026-03-28

### Added

- `VictoriaBankClient` — JWT auth (password + refresh), QR lifecycle, reconciliation, signals polling, configurable token refresh buffer and custom `fetch`.
- `DemoPayClient` — test payment simulator against the bank demopay host.
- Settings helpers: `envKeys`, `defaultBaseUrlTest`, `createClientFromSettings`, `parseStoredTokensJson`.
- Signal utilities: `extractRrnFromReference`, `splitPaymentReference`.
- Exported TypeScript types for API payloads, QR structures, signals, tokens, and `VictoriaBankApiError`.
- Documentation for Victoria Bank Business IPS (MIA) API v2.0.18 (test Swagger / URLs in README).
