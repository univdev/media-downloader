export interface ParsedHash {
  target: string;
  parent: string;
  windowLabel: string;
}

export function parseLocationHash(hash: string, fallbackLabel: string): ParsedHash {
  const queryStr = hash.includes("?")
    ? hash.slice(hash.indexOf("?") + 1)
    : hash.replace(/^#\??/, "");
  const params = new URLSearchParams(queryStr);
  return {
    target: params.get("target") ?? "",
    parent: params.get("parent") ?? "",
    windowLabel: params.get("label") ?? fallbackLabel,
  };
}
