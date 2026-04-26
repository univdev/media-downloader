/**
 * Build a unique CSS selector path for the given Element.
 *
 * Algorithm:
 * - If the element has a unique #id within its document → return "#id"
 * - Otherwise walk up the parent chain, building each segment as
 *   tag(.class)*(:nth-of-type(n))? and stopping when we either reach <html>
 *   or hit an ancestor with a unique id (used as the path root).
 * - Segments are joined with " > ".
 */

function isUniqueId(id: string, doc: Document): boolean {
  try {
    return doc.querySelectorAll(`#${CSS.escape(id)}`).length === 1;
  } catch {
    return false;
  }
}

function uniqueClasses(el: Element): string[] {
  // 1차 출시: 모든 className을 그대로 사용한다.
  // (utility-first 프레임워크의 hash-like 클래스 필터링은 추후 개선)
  return Array.from(el.classList);
}

export function buildSelector(el: Element): string {
  if (!el || el.nodeType !== 1) return "";

  const doc = el.ownerDocument;
  if (el.id && doc && isUniqueId(el.id, doc)) {
    return `#${CSS.escape(el.id)}`;
  }

  const parts: string[] = [];
  let cur: Element | null = el;

  while (cur && cur.nodeType === 1 && cur.tagName.toLowerCase() !== "html") {
    if (cur.id && cur.ownerDocument && isUniqueId(cur.id, cur.ownerDocument)) {
      parts.unshift(`#${CSS.escape(cur.id)}`);
      break;
    }

    let seg = cur.tagName.toLowerCase();
    const cls = uniqueClasses(cur);
    if (cls.length > 0) {
      seg += "." + cls.map((c) => CSS.escape(c)).join(".");
    }

    if (cur.parentElement) {
      const sameTagSiblings = Array.from(cur.parentElement.children).filter(
        (c) => c.tagName === cur!.tagName,
      );
      if (sameTagSiblings.length > 1) {
        const idx = sameTagSiblings.indexOf(cur) + 1;
        seg += `:nth-of-type(${idx})`;
      }
    }

    parts.unshift(seg);
    cur = cur.parentElement;
  }

  return parts.join(" > ");
}
