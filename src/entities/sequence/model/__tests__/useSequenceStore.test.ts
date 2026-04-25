import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSequenceStore } from "../useSequenceStore";
import { invoke } from "@/shared/lib/tauri";

vi.mock("@/shared/lib/tauri", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe("useSequenceStore", () => {
  beforeEach(() => {
    useSequenceStore.getState().reset();
    vi.clearAllMocks();
  });

  it("초기 상태가 올바르다", () => {
    const state = useSequenceStore.getState();
    expect(state.sequences).toEqual([]);
    expect(state.selectedName).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("fetch 성공 시 시퀀스 목록을 업데이트한다", async () => {
    const mockSequences = [
      {
        name: "Test",
        description: "desc",
        author: "me",
        created_at: "2026-04-26",
        updated_at: "2026-04-26",
      },
    ];
    mockInvoke.mockResolvedValueOnce(mockSequences);

    await useSequenceStore.getState().fetch();

    const state = useSequenceStore.getState();
    expect(state.sequences).toEqual(mockSequences);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(mockInvoke).toHaveBeenCalledWith("list_sequences");
  });

  it("fetch 실패 시 에러를 설정한다", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Network error"));

    await useSequenceStore.getState().fetch();

    const state = useSequenceStore.getState();
    expect(state.sequences).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("Error: Network error");
  });

  it("select로 시퀀스를 선택할 수 있다", () => {
    useSequenceStore.getState().select("My Sequence");
    expect(useSequenceStore.getState().selectedName).toBe("My Sequence");
  });

  it("select(null)로 선택을 해제할 수 있다", () => {
    useSequenceStore.getState().select("My Sequence");
    useSequenceStore.getState().select(null);
    expect(useSequenceStore.getState().selectedName).toBeNull();
  });

  it("reset이 모든 상태를 초기화한다", async () => {
    mockInvoke.mockResolvedValueOnce([{ name: "Test" }]);
    await useSequenceStore.getState().fetch();
    useSequenceStore.getState().select("Test");

    useSequenceStore.getState().reset();

    const state = useSequenceStore.getState();
    expect(state.sequences).toEqual([]);
    expect(state.selectedName).toBeNull();
  });
});
