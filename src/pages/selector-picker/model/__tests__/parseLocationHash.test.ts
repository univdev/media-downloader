import { describe, expect, it } from "vitest";
import { parseLocationHash } from "../parseLocationHash";

describe("parseLocationHash", () => {
  it("reads picker params from a query-only hash", () => {
    expect(parseLocationHash("#?target=media&parent=main&label=picker-a", "fallback")).toEqual({
      target: "media",
      parent: "main",
      windowLabel: "picker-a",
    });
  });

  it("reads picker params from a routed hash", () => {
    expect(parseLocationHash("#/selector-picker?target=media&parent=sequence-editor", "fallback")).toEqual({
      target: "media",
      parent: "sequence-editor",
      windowLabel: "fallback",
    });
  });
});
