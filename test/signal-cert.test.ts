import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VICTORIA_BANK_SIGNAL_PUBLIC_CERT_PATH } from "../src/signal-cert";

describe("VICTORIA_BANK_SIGNAL_PUBLIC_CERT_PATH", () => {
  it("points to a bundled PEM file that exists", () => {
    expect(existsSync(VICTORIA_BANK_SIGNAL_PUBLIC_CERT_PATH)).toBe(true);
    const pem = readFileSync(VICTORIA_BANK_SIGNAL_PUBLIC_CERT_PATH, "utf8");
    expect(pem).toContain("BEGIN CERTIFICATE");
    expect(pem).toContain("END CERTIFICATE");
  });
});
