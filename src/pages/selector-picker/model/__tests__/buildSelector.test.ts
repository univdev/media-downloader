import { describe, it, expect, beforeEach } from "vitest";
import { buildSelector } from "../buildSelector";

function setBody(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

describe("buildSelector", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns #id when id is unique in the document", () => {
    setBody(`<div id="root"><span id="alone">A</span></div>`);
    const el = document.getElementById("alone")!;
    expect(buildSelector(el)).toBe("#alone");
  });

  it("falls back to tag.class when there is no id", () => {
    setBody(`<div><p class="title">hi</p></div>`);
    const el = document.querySelector("p.title")!;
    expect(buildSelector(el)).toBe("body > div > p.title");
  });

  it("adds :nth-of-type when there are multiple same-tag siblings without distinguishing classes", () => {
    setBody(`<ul><li>a</li><li>b</li><li>c</li></ul>`);
    const second = document.querySelectorAll("li")[1]!;
    const sel = buildSelector(second);
    expect(sel).toBe("body > ul > li:nth-of-type(2)");
  });

  it("builds a 3-level nested selector", () => {
    setBody(`
      <section class="outer">
        <article>
          <p class="lead"><span>deep</span></p>
        </article>
      </section>
    `);
    const span = document.querySelector("section.outer p.lead span")!;
    const sel = buildSelector(span);
    // Body 부터 시작해서 head/html은 제외되며 body는 unique 하지 않을 수 있음
    expect(sel).toContain("section.outer");
    expect(sel).toContain("article");
    expect(sel).toContain("p.lead");
    expect(sel.endsWith("span")).toBe(true);
  });

  it("anchors path at an ancestor with a unique id", () => {
    setBody(`<main id="app"><div><span>x</span></div></main>`);
    const span = document.querySelector("span")!;
    const sel = buildSelector(span);
    expect(sel.startsWith("#app")).toBe(true);
    expect(sel.endsWith("span")).toBe(true);
  });

  it("ignores duplicate ids and falls back to tag/class path", () => {
    setBody(`<div id="dup"></div><div id="dup"><span>here</span></div>`);
    const span = document.querySelectorAll("div#dup")[1]!.querySelector("span")!;
    const sel = buildSelector(span);
    expect(sel).not.toBe("#dup");
    expect(sel).toContain("span");
  });
});
