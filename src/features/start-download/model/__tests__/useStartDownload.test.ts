import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStartDownload } from "../useStartDownload";
import { invoke } from "@/shared/lib/tauri";

vi.mock("@/shared/lib/tauri", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe("useStartDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("URL로 다운로드 시작 성공 시 downloadId를 반환한다", async () => {
    mockInvoke.mockResolvedValueOnce(42);

    const { result } = renderHook(() => useStartDownload());

    let downloadId: number | null;
    await act(async () => {
      downloadId = await result.current.start("https://example.com/posts/123");
    });

    expect(downloadId!).toBe(42);
    expect(result.current.isStarting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockInvoke).toHaveBeenCalledWith("start_download_by_url", {
      url: "https://example.com/posts/123",
    });
  });

  it("다운로드 시작 실패 시 에러를 설정하고 null을 반환한다", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Failed"));

    const { result } = renderHook(() => useStartDownload());

    let downloadId: number | null;
    await act(async () => {
      downloadId = await result.current.start("https://example.com/x");
    });

    expect(downloadId!).toBeNull();
    expect(result.current.error).toBe("Error: Failed");
    expect(result.current.isStarting).toBe(false);
  });
});
