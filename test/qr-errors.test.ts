import { describe, expect, it } from "vitest";
import {
  getQrErrors,
  getQrMessage,
  getQrMessagesByCode,
  getQrWarnings,
  matchQrErrorCode,
  QR_MESSAGES,
} from "../src/qr-errors";

describe("QR_MESSAGES catalog", () => {
  it("contains 10 warnings and 43 errors", () => {
    const warnings = QR_MESSAGES.filter((m) => m.severity === "warning");
    const errors = QR_MESSAGES.filter((m) => m.severity === "error");
    expect(warnings).toHaveLength(10);
    expect(errors).toHaveLength(43);
  });
});

describe("getQrMessagesByCode", () => {
  it("returns both warning and error for code 1", () => {
    const msgs = getQrMessagesByCode(1);
    expect(msgs).toHaveLength(2);
    expect(msgs.map((m) => m.severity).sort()).toEqual(["error", "warning"]);
  });

  it("returns empty array for unknown code", () => {
    expect(getQrMessagesByCode(999)).toEqual([]);
  });
});

describe("getQrMessage", () => {
  it("returns specific warning for code 5", () => {
    const w = getQrMessage(5, "warning");
    expect(w).toBeDefined();
    expect(w!.description).toContain("Payment amount conflicts");
  });

  it("returns specific error for code 7", () => {
    const e = getQrMessage(7, "error");
    expect(e).toBeDefined();
    expect(e!.description).toBe("Target QR code does not exist");
  });

  it("returns undefined for non-existent severity+code combo", () => {
    expect(getQrMessage(43, "warning")).toBeUndefined();
  });
});

describe("getQrErrors / getQrWarnings", () => {
  it("getQrErrors returns only errors", () => {
    const errors = getQrErrors();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((m) => m.severity === "error")).toBe(true);
  });

  it("getQrWarnings returns only warnings", () => {
    const warnings = getQrWarnings();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.every((m) => m.severity === "warning")).toBe(true);
  });
});

describe("matchQrErrorCode", () => {
  it("matches EQ7 to error code 7", () => {
    const m = matchQrErrorCode("EQ7");
    expect(m).toBeDefined();
    expect(m!.code).toBe(7);
    expect(m!.severity).toBe("error");
    expect(m!.description).toBe("Target QR code does not exist");
  });

  it("matches WQ5 to warning code 5", () => {
    const m = matchQrErrorCode("WQ5");
    expect(m).toBeDefined();
    expect(m!.code).toBe(5);
    expect(m!.severity).toBe("warning");
  });

  it("matches EQV|Target QR code does not exist (demo-pay format)", () => {
    const m = matchQrErrorCode("EQV|Target QR code does not exist");
    expect(m).toBeDefined();
    expect(m!.code).toBe(7);
    expect(m!.severity).toBe("error");
  });

  it("is case-insensitive for EQ/WQ prefix", () => {
    expect(matchQrErrorCode("eq13")).toBeDefined();
    expect(matchQrErrorCode("wq1")).toBeDefined();
  });

  it("returns undefined for unrecognised input", () => {
    expect(matchQrErrorCode("VB10403")).toBeUndefined();
    expect(matchQrErrorCode("random text")).toBeUndefined();
  });
});
