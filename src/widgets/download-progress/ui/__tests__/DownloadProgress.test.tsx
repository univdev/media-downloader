import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DownloadProgress } from "../DownloadProgress";
import type { DownloadProgress as DownloadProgressType } from "@/entities/download";

describe("DownloadProgress", () => {
  const mockProgress: DownloadProgressType = {
    download_id: 1,
    phase: "downloading",
    current: 7,
    total: 20,
    current_file: "image_007.jpg",
    status: "in_progress",
    failed_count: 0,
  };

  it("다운로드 진행도를 표시한다", () => {
    render(
      <DownloadProgress
        progress={mockProgress}
        percentage={35}
        isCancelling={false}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("다운로드 중...")).toBeInTheDocument();
    expect(screen.getByText("7/20")).toBeInTheDocument();
  });

  it("스캔 중이면 스캔 라벨을 표시한다", () => {
    render(
      <DownloadProgress
        progress={{ ...mockProgress, phase: "scanning" }}
        percentage={20}
        isCancelling={false}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText("스캔 중...")).toBeInTheDocument();
  });

  it("실패가 있으면 주황색으로 실패 수를 표시한다", () => {
    render(
      <DownloadProgress
        progress={{ ...mockProgress, failed_count: 3 }}
        percentage={35}
        isCancelling={false}
        onCancel={vi.fn()}
      />
    );

    const failedText = screen.getByText("3 실패");
    expect(failedText).toBeInTheDocument();
    expect(failedText.className).toContain("text-orange-500");
  });

  it("취소 버튼을 클릭하면 onCancel이 호출된다", async () => {
    const onCancel = vi.fn();
    render(
      <DownloadProgress
        progress={mockProgress}
        percentage={35}
        isCancelling={false}
        onCancel={onCancel}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
