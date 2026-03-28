import { describe, expect, it } from "vitest";
import {
  extractRrnFromReference,
  splitPaymentReference,
} from "../src/signal-utils";

describe("extractRrnFromReference", () => {
  it("returns last 12 chars of 4th pipe segment (bank example)", () => {
    const ref =
      "pacs.008.001.10|2025-04-23|VICBMD2X|VICBMD2XAXXX250423463390000017890";
    expect(extractRrnFromReference(ref)).toBe("390000017890");
  });

  it("returns full segment when 4th segment is 12 chars or shorter", () => {
    expect(extractRrnFromReference("a|b|c|short")).toBe("short");
  });

  it("returns empty string when fewer than 4 segments", () => {
    expect(extractRrnFromReference("a|b|c")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(extractRrnFromReference("")).toBe("");
  });
});

describe("splitPaymentReference", () => {
  it("splits by pipe", () => {
    expect(splitPaymentReference("a|b|c|d")).toEqual(["a", "b", "c", "d"]);
  });
});
