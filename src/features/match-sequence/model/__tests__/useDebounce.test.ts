import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("최초 값은 즉시 반영된다", () => {
    const { result } = renderHook(({ v }) => useDebounce(v, 150), {
      initialProps: { v: "first" },
    });
    expect(result.current).toBe("first");
  });

  it("delay 이전에는 이전 값을 유지한다", () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 150), {
      initialProps: { v: "a" },
    });
    rerender({ v: "b" });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("a");
  });

  it("delay 경과 후 새 값이 반영된다", () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 150), {
      initialProps: { v: "a" },
    });
    rerender({ v: "b" });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("b");
  });

  it("연속 변경 시 마지막 값만 반영된다", () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 150), {
      initialProps: { v: "a" },
    });
    rerender({ v: "b" });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender({ v: "c" });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender({ v: "d" });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe("d");
  });
});
