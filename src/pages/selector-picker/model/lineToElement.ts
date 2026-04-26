/**
 * Build a `Map<lineNumber, Element>` by parsing the given HTML and matching
 * each element's start tag back to its line in the source text.
 *
 * Lines are 0-indexed (i.e. line 0 == first line). Only the first element
 * found on a given line wins; subsequent matches on the same line are skipped.
 */
export function buildLineIndex(html: string): Map<number, Element> {
  const map = new Map<number, Element>();
  if (!html) return map;

  const doc = new DOMParser().parseFromString(html, "text/html");
  // body 우선, 비어있으면 documentElement 폴백
  const root = doc.body && doc.body.children.length > 0 ? doc.body : doc.documentElement;
  if (!root) return map;

  const all = Array.from(root.querySelectorAll("*"));
  let cursor = 0;

  for (const el of all) {
    const outer = el.outerHTML;
    if (!outer) continue;

    // 시작 태그까지만 잘라내어 위치 검색용으로 사용한다.
    const gtIdx = outer.indexOf(">");
    const startTag = gtIdx === -1 ? outer : outer.slice(0, gtIdx + 1);

    let idx = html.indexOf(startTag, cursor);
    if (idx === -1) {
      // cursor 이전(앞쪽)부터 fallback 검색 — 순서가 어긋난 매칭 허용
      idx = html.indexOf(startTag);
    }
    if (idx === -1) continue;

    // 0-indexed line number
    const lineNo = html.slice(0, idx).split("\n").length - 1;
    if (!map.has(lineNo)) {
      map.set(lineNo, el);
    }
    // cursor는 단조 증가 — 무한 루프 방지
    cursor = Math.max(cursor, idx + 1);
  }

  return map;
}
