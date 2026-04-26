import { describe, it, expect } from "vitest";
import { buildLineIndex } from "../lineToElement";

describe("buildLineIndex", () => {
  it("maps each element on its own line in well-formatted HTML", () => {
    const html = [
      "<html><body>",
      "<div>",
      "  <p>hello</p>",
      "  <span>world</span>",
      "</div>",
      "</body></html>",
    ].join("\n");
    const map = buildLineIndex(html);
    // body 하위만 인덱싱
    const lines = Array.from(map.keys()).sort((a, b) => a - b);
    expect(lines.length).toBeGreaterThan(0);
    // div, p, span 모두 잡혀야 함
    const tags = lines.map((l) => map.get(l)!.tagName.toLowerCase());
    expect(tags).toContain("div");
    expect(tags).toContain("p");
    expect(tags).toContain("span");
  });

  it("collapses all element matches to a single line for minified HTML", () => {
    const html = "<html><body><div><p>a</p><span>b</span></div></body></html>";
    const map = buildLineIndex(html);
    // 모든 키가 line 0 에 몰려있어야 함 (개행 0개)
    for (const lineNo of map.keys()) {
      expect(lineNo).toBe(0);
    }
    // 첫번째 만 살아남으므로 1개
    expect(map.size).toBeGreaterThanOrEqual(1);
  });

  it("distributes elements across multiple lines for prettified HTML", () => {
    const html = [
      "<html>",
      "<body>",
      "<section>",
      "  <h1>title</h1>",
      "  <article>",
      "    <p>body</p>",
      "  </article>",
      "</section>",
      "</body>",
      "</html>",
    ].join("\n");
    const map = buildLineIndex(html);
    const uniqueLines = new Set(map.keys());
    expect(uniqueLines.size).toBeGreaterThanOrEqual(3);
  });

  it("returns empty map for empty input", () => {
    expect(buildLineIndex("").size).toBe(0);
  });
});
