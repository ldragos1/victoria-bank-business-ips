/**
 * From IPS reference string, extract the RRN-style segment used for reversals and display.
 * Rule: split by `|`, take segment index 3 (4th segment), then last 12 characters (or full segment if shorter).
 *
 * @see Victoria Bank Business IPS Integration API — Signals / RRN note
 */
export function extractRrnFromReference(reference: string): string {
  const segments = reference.split("|");
  const fourth = segments[3];
  if (fourth === undefined) {
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
