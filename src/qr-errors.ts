/**
 * IPS QR error and warning catalog — sourced from the bank's
 * "Errors and Warnings QR" attachment (BNM IPS, facility "Q").
 *
 * Error codes surface in API responses as the `errorCode` field
 * (e.g. `"EQ7"` → "Target QR code does not exist") and in
 * demo-pay plain-text bodies (e.g. `"EQV|Target QR code does not exist"`).
 */

export type QrMessageSeverity = "error" | "warning";

export interface QrMessage {
  /** Numeric code inside the "Q" facility (1–43). */
  code: number;
  severity: QrMessageSeverity;
  description: string;
}

/**
 * Full catalog — warnings (W) and errors (E) from the IPS QR facility.
 *
 * Codes are **not** unique across severities: e.g. code 1 exists as both
 * a warning ("Lock management is neither required nor possible for static
 * QR codes") and an error ("When creating dynamic or static QR code request
 * body must contain extension object"). Use `severity` to disambiguate.
 */
export const QR_MESSAGES: readonly QrMessage[] = [
  // ── Warnings (W) ────────────────────────────────────────────────
  { code: 1, severity: "warning", description: "Lock management is neither required nor possible for static QR codes" },
  { code: 2, severity: "warning", description: "Target QR code extension is not found when landing payment" },
  { code: 3, severity: "warning", description: "Unexpected status of QR code extension when landing payment" },
  { code: 4, severity: "warning", description: "QR code lock is expected yet missing when landing payment" },
  { code: 5, severity: "warning", description: "Payment amount conflicts with that requested in QR code" },
  { code: 6, severity: "warning", description: "Signal ignored. Payment with given reference for given payment system already registered" },
  { code: 7, severity: "warning", description: "Given payment system is unknown" },
  { code: 8, severity: "warning", description: "Given dynamic or hybrid QR code already paid" },
  { code: 9, severity: "warning", description: "Given payment system is not expected in payment signals coming from participants" },
  { code: 10, severity: "warning", description: "Payment via the given payment system is not expected by payee" },

  // ── Errors (E) ──────────────────────────────────────────────────
  { code: 1, severity: "error", description: "When creating dynamic or static QR code request body must contain extension object" },
  { code: 2, severity: "error", description: "Free amountType is not allowed for dynamic and hybrid QR codes. Use Fixed or Controlled" },
  { code: 3, severity: "error", description: "Invalid set of amountMin, amount and amountMax for given amountType" },
  { code: 4, severity: "error", description: "TTL is out of allowed range" },
  { code: 5, severity: "error", description: "Can not validate QR code extension as at least one of the following parameters is not configured: TTL_MIN_SS, TTL_MAX_SS" },
  { code: 6, severity: "error", description: "Can not create QR code as at least one of the following parameters is not configured: QRC_PREFIX, QRC_PROVIDER" },
  { code: 7, severity: "error", description: "Target QR code does not exist" },
  { code: 8, severity: "error", description: "Participant can modify or inquire into own QR codes only" },
  { code: 9, severity: "error", description: "New extensions are not allowed when QR code status is" },
  { code: 10, severity: "error", description: "New extensions are not allowed for dynamic QR codes" },
  { code: 11, severity: "error", description: "ttl is present, yet not expected for static QR codes" },
  { code: 12, severity: "error", description: "Field value is unparsable or non-positive" },
  { code: 13, severity: "error", description: "ttl is missing, yet required for dynamic and hybrid QR codes" },
  { code: 14, severity: "error", description: "Inconsistent values of amountMin, amount, amountMax" },
  { code: 15, severity: "error", description: "Payment is not allowed when QR code status is" },
  { code: 16, severity: "error", description: "QR code is locked by payment in progress" },
  { code: 17, severity: "error", description: "QR code is not complete to support transaction. Extension is missing or not Active" },
  { code: 18, severity: "error", description: "QR code expired" },
  { code: 19, severity: "error", description: "Target QR extension does not exist" },
  { code: 20, severity: "error", description: "Requested amount is not valid. Cryptogram denied" },
  { code: 21, severity: "error", description: "Creditor agent is not recognized" },
  { code: 22, severity: "error", description: "QR code is already impossible to pay. Cancellation is neither relevant nor applicable" },
  { code: 23, severity: "error", description: "Cancellation of extension is allowed only for hybrid QR codes" },
  { code: 24, severity: "error", description: "Cancellation of extension is impossible as target QR code has no extension" },
  { code: 25, severity: "error", description: "QR code extension is already impossible to pay. Cancellation is neither relevant nor possible" },
  { code: 26, severity: "error", description: "QR code extension expired" },
  { code: 27, severity: "error", description: "Lock either doesn't exist or belongs to other participant" },
  { code: 28, severity: "error", description: "Wrong target QR code. Lock management is impossible for a hybrid QR code without extension" },
  { code: 29, severity: "error", description: "Lock either does not exist or already expired" },
  { code: 30, severity: "error", description: "Invalid boc value" },
  { code: 31, severity: "error", description: "Invalid ttc value" },
  { code: 32, severity: "error", description: "QRC_CRYPTO_SIGNER parameter is not defined" },
  { code: 33, severity: "error", description: "Unauthorized signer of the QR code cryptogram" },
  { code: 34, severity: "error", description: "Certificate needed to check QR code cryptogram is missing or inactive" },
  { code: 35, severity: "error", description: "QR code cryptogram has invalid signature" },
  { code: 36, severity: "error", description: "Certificate ownership error detected when checking QR code cryptogram" },
  { code: 37, severity: "error", description: "QR code cryptogram expired" },
  { code: 38, severity: "error", description: "Cannot find in payment message path(s) required by QR code cryptogram" },
  { code: 39, severity: "error", description: "Mismatch of parameter values in payment and parent QR code" },
  { code: 40, severity: "error", description: "Payment against QR code must have a cryptogram" },
  { code: 41, severity: "error", description: "Invalid currency in" },
  { code: 42, severity: "error", description: "Outgoing signal delivery retries are not possible as at least one of required setting is not defined" },
  { code: 43, severity: "error", description: "Outgoing signal delivery retry period must be less than archiving threshold. Check configuration parameters" },
] as const;

/**
 * Look up all QR messages matching the given numeric code (may return both a
 * warning and an error if the same code exists in both severities).
 */
export function getQrMessagesByCode(code: number): QrMessage[] {
  return QR_MESSAGES.filter((m) => m.code === code);
}

/**
 * Look up a single QR message by code **and** severity.
 * Returns `undefined` when no match is found.
 */
export function getQrMessage(
  code: number,
  severity: QrMessageSeverity
): QrMessage | undefined {
  return QR_MESSAGES.find((m) => m.code === code && m.severity === severity);
}

/**
 * Return all QR errors (severity = "error").
 */
export function getQrErrors(): QrMessage[] {
  return QR_MESSAGES.filter((m) => m.severity === "error");
}

/**
 * Return all QR warnings (severity = "warning").
 */
export function getQrWarnings(): QrMessage[] {
  return QR_MESSAGES.filter((m) => m.severity === "warning");
}

/**
 * Try to match an API `errorCode` string (e.g. `"EQ7"`) or a demo-pay
 * plain-text prefix (e.g. `"EQV|…"`) to a catalog entry.
 *
 * Recognises patterns:
 * - `EQ<number>` → error with that code
 * - `WQ<number>` → warning with that code
 * - `EQV|<description>` → match by description substring
 *
 * Returns `undefined` when the input does not match any known pattern.
 */
export function matchQrErrorCode(errorCodeOrText: string): QrMessage | undefined {
  const eqMatch = /^EQ(\d+)$/i.exec(errorCodeOrText);
  if (eqMatch) {
    return getQrMessage(Number(eqMatch[1]), "error");
  }

  const wqMatch = /^WQ(\d+)$/i.exec(errorCodeOrText);
  if (wqMatch) {
    return getQrMessage(Number(wqMatch[1]), "warning");
  }

  if (errorCodeOrText.startsWith("EQV|")) {
    const desc = errorCodeOrText.slice(4).trim();
    return QR_MESSAGES.find(
      (m) => m.severity === "error" && m.description.toLowerCase().startsWith(desc.toLowerCase())
    );
  }

  return undefined;
}
