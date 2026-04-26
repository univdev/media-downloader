import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { invoke } from "@/shared/lib/tauri";
import type { MatchResult } from "@/features/match-sequence";

// invoke mock (find_sequence_by_url, start_download_by_url 모두 사용)
vi.mock("@/shared/lib/tauri", () => ({
  invoke: vi.fn(),
}));

// react-toastify mock
vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  ToastContainer: () => null,
}));

// useDownloadStore mock — refresh 동작만 검증
const mockRefresh = vi.fn(async () => {});
vi.mock("@/entities/download", () => ({
  useDownloadStore: () => ({ refresh: mockRefresh }),
}));

import { useMediaToolbarViewModel } from "../MediaToolbar.viewmodel";
import { toast } from "react-toastify";

const mockInvoke = vi.mocked(invoke);
const mockToastError = vi.mocked(toast.error);

const sampleMatch: MatchResult = {
  sequence_name: "my-seq",
  url_pattern: "https://example.com/{id}",
  captures: { id: "test" },
  tied_candidates: [],
};

describe("useMediaToolbarViewModel", () => {
  beforeEach(() => {
    // resetAllMocks: history + 등록된 implementation/Once 큐 모두 정리하여 케이스 간 격리
    vi.resetAllMocks();
  });

  it("setUrl 호출 시 디바운스 후 find_sequence_by_url invoke가 발생한다", async () => {
    mockInvoke.mockResolvedValueOnce(sampleMatch);

    const { result } = renderHook(() => useMediaToolbarViewModel());

    act(() => {
      result.current.setUrl("https://example.com/test");
    });

    await waitFor(
      () => {
        expect(mockInvoke).toHaveBeenCalledWith("find_sequence_by_url", {
          url: "https://example.com/test",
        });
      },
      { timeout: 1500 },
    );
  });

  it("invoke가 MatchResult 반환 시 matchedName, canStart가 갱신된다", async () => {
    mockInvoke.mockResolvedValueOnce(sampleMatch);

    const { result } = renderHook(() => useMediaToolbarViewModel());

    act(() => {
      result.current.setUrl("https://example.com/test");
    });

    await waitFor(
      () => {
        expect(result.current.matchedName).toBe("my-seq");
      },
      { timeout: 1500 },
    );
    expect(result.current.canStart).toBe(true);
    expect(result.current.tiedCandidates).toEqual([]);
  });

  it("invoke가 null 반환 시 toast.error가 호출되고, 콜백 클릭 시 onRequestCreateSequence가 입력 URL로 실행된다", async () => {
    mockInvoke.mockResolvedValueOnce(null);
    const onRequestCreateSequence = vi.fn();

    const { result } = renderHook(() =>
      useMediaToolbarViewModel({ onRequestCreateSequence }),
    );

    act(() => {
      result.current.setUrl("https://example.com/none");
    });

    await waitFor(
      () => {
        expect(mockToastError).toHaveBeenCalled();
      },
      { timeout: 1500 },
    );

    // toast.error 의 첫 인자(JSX 함수)를 추출하여 콜백 동작을 시뮬레이션
    const renderToast = mockToastError.mock.calls[0][0] as (
      props: { closeToast?: () => void },
    ) => ReactElement;
    const closeToast = vi.fn();
    const node = renderToast({ closeToast });

    // node.props.children 안에 button 이 들어있다 — children 트리 탐색해 onClick 추출
    // 구조: <span>매칭되는 시퀀스가 없습니다.<button onClick={...}>시퀀스 만들기</button></span>
    const children = (node.props as { children: unknown[] }).children;
    type Btn = { props: { onClick: () => void; children: string } };
    const button = children.find(
      (c): c is Btn =>
        typeof c === "object" &&
        c !== null &&
        (c as Btn).props?.children === "시퀀스 만들기",
    );
    expect(button).toBeDefined();

    act(() => {
      button!.props.onClick();
    });

    expect(onRequestCreateSequence).toHaveBeenCalledWith(
      "https://example.com/none",
    );
    expect(closeToast).toHaveBeenCalled();
  });

  it("startDownload 호출 시 매칭이 있다면 start_download_by_url invoke + refresh 실행", async () => {
    // cmd 별로 다르게 응답하도록 implementation 으로 처리 (디바운스 사이 다중 호출 대비)
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "find_sequence_by_url") return sampleMatch;
      if (cmd === "start_download_by_url") return 99;
      return null;
    });

    const { result } = renderHook(() => useMediaToolbarViewModel());

    act(() => {
      result.current.setUrl("https://example.com/test");
    });

    await waitFor(
      () => {
        expect(result.current.canStart).toBe(true);
      },
      { timeout: 3000 },
    );

    await act(async () => {
      await result.current.startDownload();
    });

    expect(mockInvoke).toHaveBeenCalledWith("start_download_by_url", {
      url: "https://example.com/test",
    });
    expect(mockRefresh).toHaveBeenCalledOnce();
  });

  it("매칭이 없으면 startDownload는 invoke를 호출하지 않는다 (early return)", async () => {
    // url 미설정 → match=null → canStart=false
    const { result } = renderHook(() => useMediaToolbarViewModel());

    expect(result.current.canStart).toBe(false);

    await act(async () => {
      await result.current.startDownload();
    });

    // find_sequence_by_url 도 (디바운스/length 컷) 호출되지 않고
    // start_download_by_url 도 호출되지 않아야 함
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
