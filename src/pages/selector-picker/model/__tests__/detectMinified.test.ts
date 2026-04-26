import { describe, it, expect } from "vitest";
import { isMinified } from "../detectMinified";

describe("isMinified", () => {
  it("returns false for normal multi-line HTML with short lines", () => {
    const html = Array.from({ length: 10 }, () => "x".repeat(50)).join("\n");
    expect(isMinified(html)).toBe(false);
  });

  it("returns true for a single-line minified HTML", () => {
    const html = "x".repeat(5000);
    expect(isMinified(html)).toBe(true);
  });

  it("returns true for HTML with fewer than 5 lines", () => {
    const shorter = "<html>\n<body>\nhi";
    expect(isMinified(shorter)).toBe(true);
  });

  it("returns true when avg line length exceeds 200", () => {
    const longLine = "a".repeat(250);
    const html = [longLine, longLine, longLine, longLine, longLine, longLine].join("\n");
    expect(isMinified(html)).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isMinified("")).toBe(false);
  });
});
