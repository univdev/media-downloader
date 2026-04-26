import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMatchSequence } from "../useMatchSequence";
import { invoke } from "@/shared/lib/tauri";
import type { MatchResult } from "../types";

vi.mock("@/shared/lib/tauri", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

const sampleMatch: MatchResult = {
  sequence_name: "my-seq",
  url_pattern: "https://example.com/{id}",
  captures: { id: "42" },
  tied_candidates: [],
};

describe("useMatchSequence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("5자 미만 url에 대해 data === null 이며 invoke 미호출", async () => {
    const { result } = renderHook(() => useMatchSequence("abc"));
    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("5자 이상 url 입력 시 invoke 결과를 data에 반영한다", async () => {
    mockInvoke.mockResolvedValueOnce(sampleMatch);
    const { result } = renderHook(() =>
      useMatchSequence("https://example.com/42"),
    );
    await waitFor(
      () => {
        expect(result.current.data).not.toBeNull();
      },
      { timeout: 1500 },
    );
    expect(result.current.data?.sequence_name).toBe("my-seq");
    expect(mockInvoke).toHaveBeenCalledWith("find_sequence_by_url", {
      url: "https://example.com/42",
    });
  });

  it("invoke가 null 반환 시 data === null", async () => {
    mockInvoke.mockResolvedValueOnce(null);
    const { result } = renderHook(() =>
      useMatchSequence("https://example.com/none"),
    );
    await waitFor(
      () => {
        expect(result.current.isMatching).toBe(false);
      },
      { timeout: 1500 },
    );
    expect(result.current.data).toBeNull();
  });

  it("rapid input 시 마지막 url의 결과만 반영된다 (이전 응답은 cancel)", async () => {
    // 첫 번째 호출은 늦게 응답, 두 번째 호출은 빠르게 응답.
    let resolveFirst: (v: MatchResult) => void = () => {};
    const firstPromise = new Promise<MatchResult>((res) => {
      resolveFirst = res;
    });
    mockInvoke
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce({
        ...sampleMatch,
        sequence_name: "second",
      });

    const { result, rerender } = renderHook(
      ({ url }: { url: string }) => useMatchSequence(url),
      { initialProps: { url: "https://example.com/first" } },
    );

    // 두 번째 url로 빠르게 변경.
    rerender({ url: "https://example.com/second-url" });

    // 두 번째 응답이 먼저 도착해 'second' 가 반영됨을 기다림.
    await waitFor(
      () => {
        expect(result.current.data?.sequence_name).toBe("second");
      },
      { timeout: 2000 },
    );

    // 그 다음 첫 번째 응답이 뒤늦게 도착해도 덮어쓰지 않아야 함.
    resolveFirst({ ...sampleMatch, sequence_name: "first-late" });
    // 짧은 시간 대기 후에도 second 유지.
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.data?.sequence_name).toBe("second");
  });
});
