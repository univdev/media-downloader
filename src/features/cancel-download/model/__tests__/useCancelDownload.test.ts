import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCancelDownload } from "../useCancelDownload";
import { invoke } from "@/shared/lib/tauri";

vi.mock("@/shared/lib/tauri", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe("useCancelDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("취소 성공 시 에러가 없다", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useCancelDownload());

    await act(async () => {
      await result.current.cancel(1);
    });

    expect(result.current.isCancelling).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockInvoke).toHaveBeenCalledWith("cancel_download", {
      download_id: 1,
    });
  });

  it("취소 실패 시 에러를 설정한다", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Not found"));

    const { result } = renderHook(() => useCancelDownload());

    await act(async () => {
      await result.current.cancel(999);
    });

    expect(result.current.error).toBe("Error: Not found");
  });
});
