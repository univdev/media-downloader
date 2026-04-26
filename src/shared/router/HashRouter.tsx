export type Route = "main" | "sequence-editor" | "selector-picker";

export function getCurrentRoute(): Route {
  const h = window.location.hash;
  if (h.startsWith("#/sequence-editor")) return "sequence-editor";
  if (h.startsWith("#/selector-picker")) return "selector-picker";
  return "main";
}

export function getHashParams(): URLSearchParams {
  const queryStart = window.location.hash.indexOf("?");
  if (queryStart === -1) return new URLSearchParams();
  return new URLSearchParams(window.location.hash.slice(queryStart + 1));
}
