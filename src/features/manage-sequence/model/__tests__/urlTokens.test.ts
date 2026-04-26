import { describe, it, expect } from "vitest";
import {
  replaceRange,
  toVariableToken,
  toIndexToken,
  toWildcardToken,
} from "../urlTokens";

describe("replaceRange", () => {
  it("선택 영역을 치환한다", () => {
    expect(replaceRange("https://example.com/abc", 20, 23, "{id}")).toBe(
      "https://example.com/{id}",
    );
  });

  it("빈 영역에 삽입한다", () => {
    expect(replaceRange("ab", 1, 1, "X")).toBe("aXb");
  });

  it("음수 start는 0으로 보정한다", () => {
    expect(replaceRange("abc", -5, 1, "Z")).toBe("Zbc");
  });

  it("end가 길이를 넘으면 길이로 보정한다", () => {
    expect(replaceRange("abc", 1, 999, "Y")).toBe("aY");
  });

  it("end가 start보다 작으면 start로 끌어올린다", () => {
    expect(replaceRange("abc", 2, 1, "Z")).toBe("abZc");
  });
});

describe("toVariableToken", () => {
  it("변수명을 중괄호로 감싼다", () => {
    expect(toVariableToken("id")).toBe("{id}");
    expect(toVariableToken("page")).toBe("{page}");
  });
});

describe("toIndexToken", () => {
  it("start만 있는 경우 토큰을 만든다", () => {
    expect(toIndexToken(1)).toBe("{index:start=1}");
  });

  it("start와 to가 모두 있는 경우 토큰을 만든다", () => {
    expect(toIndexToken(1, 10)).toBe("{index:start=1,to=10}");
  });

  it("0부터 시작하는 인덱스도 처리한다", () => {
    expect(toIndexToken(0, 5)).toBe("{index:start=0,to=5}");
  });
});

describe("toWildcardToken", () => {
  it("와일드카드 토큰을 반환한다", () => {
    expect(toWildcardToken()).toBe("{*}");
  });
});
