/**
 * Client-side validation for QR requests — catches issues that the IPS
 * would reject, mapped to the bank's QR error catalog.
 *
 * All validators return an array of human-readable issues (empty = valid).
 * They are **opt-in** helpers; the client methods do not call them
 * automatically so callers stay in full control.
 */

import type {
  NewQrRequest,
  QrAmountType,
  QrExtensionPayload,
  QrType,
} from "./types";

export interface QrValidationIssue {
  /** Catalog error/warning code when mapped (e.g. 2 → EQ2). */
  code?: number;
  message: string;
}

/**
 * Validate a `NewQrRequest` body before calling `createQr`.
 *
 * Checks enforced by the IPS (from the QR errors & warnings catalog):
 *
 * - **EQ1** — extension object is required for DYNM and STAT.
 * - **EQ2** — Free amountType is not allowed for DYNM / HYBR.
 * - **EQ3 / EQ14** — amount field consistency for the chosen amountType.
 * - **EQ11** — TTL must **not** be present for STAT.
 * - **EQ13** — TTL is **required** for DYNM and HYBR.
 * - **EQ10** — new extensions are not allowed for DYNM (relevant to
 *   `createQrExtension`, but also caught here if the caller misuses the
 *   initial request type).
 */
export function validateNewQrRequest(req: NewQrRequest): QrValidationIssue[] {
  const issues: QrValidationIssue[] = [];

  if (!req.extension) {
    issues.push({
      code: 1,
      message:
        "Request body must contain an extension object when creating a QR code (EQ1).",
    });
    return issues;
  }

  issues.push(
    ...validateAmountFields(req.header.amountType, req.extension, req.header.qrType)
  );
  issues.push(...validateTtl(req.header.qrType, req.extension));

  return issues;
}

/**
 * Validate a `QrExtensionPayload` before calling `createQrExtension`.
 *
 * Requires the parent QR's `qrType` and `amountType` so the helper can
 * enforce the same rules as the IPS.
 */
export function validateQrExtension(
  qrType: QrType,
  amountType: QrAmountType,
  ext: QrExtensionPayload
): QrValidationIssue[] {
  const issues: QrValidationIssue[] = [];

  if (qrType === "DYNM") {
    issues.push({
      code: 10,
      message:
        "New extensions are not allowed for dynamic QR codes (EQ10). " +
        "Dynamic QR codes support only the initial extension created with createQr.",
    });
  }

  issues.push(...validateAmountFields(amountType, ext, qrType));
  issues.push(...validateTtl(qrType, ext));

  return issues;
}

function validateAmountFields(
  amountType: QrAmountType,
  ext: QrExtensionPayload,
  qrType: QrType
): QrValidationIssue[] {
  const issues: QrValidationIssue[] = [];

  if (
    amountType === "Free" &&
    (qrType === "DYNM" || qrType === "HYBR")
  ) {
    issues.push({
      code: 2,
      message:
        "Free amountType is not allowed for dynamic and hybrid QR codes — use Fixed or Controlled (EQ2).",
    });
  }

  if (amountType === "Fixed") {
    if (!ext.amount) {
      issues.push({
        code: 3,
        message:
          "Fixed amountType requires the amount field (EQ3).",
      });
    }
    if (ext.amountMin || ext.amountMax) {
      issues.push({
        code: 14,
        message:
          "Fixed amountType should not include amountMin / amountMax — use amount only (EQ14).",
      });
    }
  }

  if (amountType === "Controlled") {
    if (!ext.amountMin || !ext.amountMax) {
      issues.push({
        code: 3,
        message:
          "Controlled amountType requires both amountMin and amountMax (EQ3).",
      });
    }
    if (ext.amount) {
      issues.push({
        code: 14,
        message:
          "Controlled amountType should not include the amount field — use amountMin and amountMax (EQ14).",
      });
    }
  }

  return issues;
}

function validateTtl(
  qrType: QrType,
  ext: QrExtensionPayload
): QrValidationIssue[] {
  const issues: QrValidationIssue[] = [];

  if (qrType === "STAT" && ext.ttl) {
    issues.push({
      code: 11,
      message: "TTL is present, yet not expected for static QR codes (EQ11).",
    });
  }

  if ((qrType === "DYNM" || qrType === "HYBR") && !ext.ttl) {
    issues.push({
      code: 13,
      message:
        "TTL is missing, yet required for dynamic and hybrid QR codes (EQ13).",
    });
  }

  return issues;
}
