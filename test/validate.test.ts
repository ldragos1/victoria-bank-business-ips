import { describe, expect, it } from "vitest";
import { validateNewQrRequest, validateQrExtension } from "../src/validate";
import type { NewQrRequest } from "../src/types";

function validDynmRequest(): NewQrRequest {
  return {
    header: { qrType: "DYNM", amountType: "Fixed", pmtContext: "e" },
    extension: {
      creditorAccount: { iban: "MD00VICB00000000000000MDL" },
      amount: { sum: 100, currency: "MDL" },
      ttl: { length: 360, units: "mm" },
    },
  };
}

describe("validateNewQrRequest", () => {
  it("returns no issues for a valid DYNM Fixed request", () => {
    expect(validateNewQrRequest(validDynmRequest())).toEqual([]);
  });

  it("EQ1: requires extension object", () => {
    const req = { header: { qrType: "DYNM", amountType: "Fixed", pmtContext: "e" } } as NewQrRequest;
    const issues = validateNewQrRequest(req);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe(1);
  });

  it("EQ2: Free amountType not allowed for DYNM", () => {
    const req = validDynmRequest();
    req.header.amountType = "Free";
    delete (req.extension as Record<string, unknown>).amount;
    const issues = validateNewQrRequest(req);
    expect(issues.some((i) => i.code === 2)).toBe(true);
  });

  it("EQ2: Free amountType not allowed for HYBR", () => {
    const req = validDynmRequest();
    req.header.qrType = "HYBR";
    req.header.amountType = "Free";
    delete (req.extension as Record<string, unknown>).amount;
    const issues = validateNewQrRequest(req);
    expect(issues.some((i) => i.code === 2)).toBe(true);
  });

  it("EQ2: Free amountType is allowed for STAT", () => {
    const req: NewQrRequest = {
      header: { qrType: "STAT", amountType: "Free", pmtContext: "e" },
      extension: {
        creditorAccount: { iban: "MD00" },
      },
    };
    const issues = validateNewQrRequest(req);
    expect(issues.some((i) => i.code === 2)).toBe(false);
  });

  it("EQ3: Fixed requires amount field", () => {
    const req = validDynmRequest();
    delete (req.extension as Record<string, unknown>).amount;
    const issues = validateNewQrRequest(req);
    expect(issues.some((i) => i.code === 3)).toBe(true);
  });

  it("EQ14: Fixed should not include amountMin/amountMax", () => {
    const req = validDynmRequest();
    req.extension.amountMin = { sum: 1, currency: "MDL" };
    const issues = validateNewQrRequest(req);
    expect(issues.some((i) => i.code === 14)).toBe(true);
  });

  it("EQ3: Controlled requires amountMin and amountMax", () => {
    const req: NewQrRequest = {
      header: { qrType: "STAT", amountType: "Controlled", pmtContext: "e" },
      extension: {
        creditorAccount: { iban: "MD00" },
      },
    };
    const issues = validateNewQrRequest(req);
    expect(issues.some((i) => i.code === 3)).toBe(true);
  });

  it("EQ14: Controlled should not include amount", () => {
    const req: NewQrRequest = {
      header: { qrType: "STAT", amountType: "Controlled", pmtContext: "e" },
      extension: {
        creditorAccount: { iban: "MD00" },
        amountMin: { sum: 1, currency: "MDL" },
        amountMax: { sum: 100, currency: "MDL" },
        amount: { sum: 50, currency: "MDL" },
      },
    };
    const issues = validateNewQrRequest(req);
    expect(issues.some((i) => i.code === 14)).toBe(true);
  });

  it("EQ11: TTL must not be present for STAT", () => {
    const req: NewQrRequest = {
      header: { qrType: "STAT", amountType: "Free", pmtContext: "e" },
      extension: {
        creditorAccount: { iban: "MD00" },
        ttl: { length: 60, units: "mm" },
      },
    };
    const issues = validateNewQrRequest(req);
    expect(issues.some((i) => i.code === 11)).toBe(true);
  });

  it("EQ13: TTL is required for DYNM", () => {
    const req = validDynmRequest();
    delete (req.extension as Record<string, unknown>).ttl;
    const issues = validateNewQrRequest(req);
    expect(issues.some((i) => i.code === 13)).toBe(true);
  });

  it("EQ13: TTL is required for HYBR", () => {
    const req: NewQrRequest = {
      header: { qrType: "HYBR", amountType: "Fixed", pmtContext: "e" },
      extension: {
        creditorAccount: { iban: "MD00" },
        amount: { sum: 10, currency: "MDL" },
      },
    };
    const issues = validateNewQrRequest(req);
    expect(issues.some((i) => i.code === 13)).toBe(true);
  });

  it("no TTL issue for STAT without TTL", () => {
    const req: NewQrRequest = {
      header: { qrType: "STAT", amountType: "Free", pmtContext: "e" },
      extension: { creditorAccount: { iban: "MD00" } },
    };
    const issues = validateNewQrRequest(req);
    expect(issues.some((i) => i.code === 11 || i.code === 13)).toBe(false);
  });
});

describe("validateQrExtension", () => {
  it("EQ10: rejects extensions for DYNM", () => {
    const issues = validateQrExtension("DYNM", "Fixed", {
      creditorAccount: { iban: "MD00" },
      amount: { sum: 1, currency: "MDL" },
      ttl: { length: 60, units: "mm" },
    });
    expect(issues.some((i) => i.code === 10)).toBe(true);
  });

  it("passes for valid HYBR extension", () => {
    const issues = validateQrExtension("HYBR", "Fixed", {
      creditorAccount: { iban: "MD00" },
      amount: { sum: 1, currency: "MDL" },
      ttl: { length: 60, units: "mm" },
    });
    expect(issues).toEqual([]);
  });

  it("passes for valid STAT Controlled extension", () => {
    const issues = validateQrExtension("STAT", "Controlled", {
      creditorAccount: { iban: "MD00" },
      amountMin: { sum: 1, currency: "MDL" },
      amountMax: { sum: 100, currency: "MDL" },
    });
    expect(issues).toEqual([]);
  });
});
