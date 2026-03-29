/**
 * From a full IPS `payment.reference` string (pipe-delimited), return the **4th segment only**.
 * This matches the **external payment reference** required by `DELETE /api/v1/transaction/{reference}`
 * and by `VictoriaBankClient.prototype.reverseTransaction` (`reverseTransaction`).
 *
 * Do **not** pass the full `pacs.008|…|…|…` line to the reverse endpoint — only this segment.
 */
export function extractFourthSegmentFromReference(reference: string): string {
  const segments = reference.split("|");
  return segments[3] ?? "";
}

/**
 * From a full IPS `payment.reference` string, extract the **RRN** (Retrieval Reference Number)
 * per the bank note: the last **12** characters of the 4th segment (or the whole segment if it is
 * 12 characters or shorter).
 *
 * Use for **display / reconciliation-style parsing only**. Do **not** pass this value to
 * `reverseTransaction` — the reversal API expects the **full** 4th segment; use
 * {@link extractFourthSegmentFromReference} instead.
 *
 * @see Victoria Bank Business IPS Integration API — Signals / RRN note
 */
export function extractRrnFromReference(reference: string): string {
  const fourth = extractFourthSegmentFromReference(reference);
  if (!fourth) {
    return "";
  }
  if (fourth.length <= 12) {
    return fourth;
  }
  return fourth.slice(-12);
}

/** Split IPS pipe reference into segments. */
export function splitPaymentReference(reference: string): string[] {
  return reference.split("|");
}
