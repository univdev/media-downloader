import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDownloadStore } from "../useDownloadStore";
import { invoke } from "@/shared/lib/tauri";

vi.mock("@/shared/lib/tauri", () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

const createMockDownload = (id: number) => ({
  id,
  sequence_name: `Sequence ${id}`,
  status: "completed" as const,
  total_files: 10,
  completed_files: 10,
  failed_files: 0,
  save_directory: `/downloads/${id}`,
  started_at: "2026-04-26T00:00:00Z",
  finished_at: "2026-04-26T00:01:00Z",
  created_at: "2026-04-26T00:00:00Z",
});

describe("useDownloadStore", () => {
  beforeEach(() => {
    useDownloadStore.getState().reset();
    vi.clearAllMocks();
  });

  it("초기 상태가 올바르다", () => {
    const state = useDownloadStore.getState();
    expect(state.downloads).toEqual([]);
    expect(state.activeProgress).toBeNull();
    expect(state.page).toBe(0);
    expect(state.hasMore).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("fetchNextPage 성공 시 다운로드 목록을 추가한다", async () => {
    const mockItems = Array.from({ length: 20 }, (_, i) =>
      createMockDownload(i + 1)
    );
    mockInvoke.mockResolvedValueOnce({
      items: mockItems,
      total: 50,
      page: 1,
      page_size: 20,
    });

    await useDownloadStore.getState().fetchNextPage();

    const state = useDownloadStore.getState();
    expect(state.downloads).toHaveLength(20);
    expect(state.page).toBe(1);
    expect(state.hasMore).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(mockInvoke).toHaveBeenCalledWith("list_downloads", {
      page: 1,
      page_size: 20,
    });
  });

  it("마지막 페이지이면 hasMore가 false가 된다", async () => {
    const mockItems = Array.from({ length: 5 }, (_, i) =>
      createMockDownload(i + 1)
    );
    mockInvoke.mockResolvedValueOnce({
      items: mockItems,
      total: 5,
      page: 1,
      page_size: 20,
    });

    await useDownloadStore.getState().fetchNextPage();

    expect(useDownloadStore.getState().hasMore).toBe(false);
  });

  it("이미 로딩 중이면 fetchNextPage를 중복 호출하지 않는다", async () => {
    useDownloadStore.setState({ isLoading: true });

    await useDownloadStore.getState().fetchNextPage();

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("hasMore가 false이면 fetchNextPage를 호출하지 않는다", async () => {
    useDownloadStore.setState({ hasMore: false });

    await useDownloadStore.getState().fetchNextPage();

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("refresh가 목록을 초기화하고 첫 페이지를 로드한다", async () => {
    // 기존 데이터 설정
    useDownloadStore.setState({
      downloads: [createMockDownload(1)],
      page: 3,
    });

    const freshItems = [createMockDownload(99)];
    mockInvoke.mockResolvedValueOnce({
      items: freshItems,
      total: 1,
      page: 1,
      page_size: 20,
    });

    await useDownloadStore.getState().refresh();

    const state = useDownloadStore.getState();
    expect(state.downloads).toHaveLength(1);
    expect(state.downloads[0].id).toBe(99);
    expect(state.page).toBe(1);
  });

  it("setActiveProgress로 진행도를 업데이트한다", () => {
    const progress = {
      download_id: 1,
      phase: "downloading" as const,
      current: 5,
      total: 10,
      current_file: "image_005.jpg",
      status: "in_progress" as const,
      failed_count: 0,
    };

    useDownloadStore.getState().setActiveProgress(progress);

    expect(useDownloadStore.getState().activeProgress).toEqual(progress);
  });

  it("fetchNextPage 실패 시 에러를 설정한다", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("DB error"));

    await useDownloadStore.getState().fetchNextPage();

    const state = useDownloadStore.getState();
    expect(state.error).toBe("Error: DB error");
    expect(state.isLoading).toBe(false);
  });
});
