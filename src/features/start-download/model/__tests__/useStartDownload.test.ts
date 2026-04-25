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

  it("다운로드 시작 성공 시 downloadId를 반환한다", async () => {
    mockInvoke.mockResolvedValueOnce(42);

    const { result } = renderHook(() => useStartDownload());

    let downloadId: number | null;
    await act(async () => {
      downloadId = await result.current.start('{"version":"1.0"}');
    });

    expect(downloadId!).toBe(42);
    expect(result.current.isStarting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockInvoke).toHaveBeenCalledWith("start_download", {
      sequence_json: '{"version":"1.0"}',
    });
  });

  it("다운로드 시작 실패 시 에러를 설정하고 null을 반환한다", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Failed"));

    const { result } = renderHook(() => useStartDownload());

    let downloadId: number | null;
    await act(async () => {
      downloadId = await result.current.start("{}");
    });

    expect(downloadId!).toBeNull();
    expect(result.current.error).toBe("Error: Failed");
    expect(result.current.isStarting).toBe(false);
  });
});
