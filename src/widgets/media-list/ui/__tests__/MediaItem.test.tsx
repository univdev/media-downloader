import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediaItem } from "../MediaItem";

describe("MediaItem", () => {
  const defaultProps = {
    folderName: "example.com/photos",
    totalFiles: 20,
    completedFiles: 18,
    failedFiles: 2,
    date: "2026-04-26",
    hasFailures: true,
    isComplete: true,
    onClick: vi.fn(),
  };

  it("폴더명과 파일 수를 표시한다", () => {
    render(<MediaItem {...defaultProps} />);

    expect(screen.getByText("example.com/photos")).toBeInTheDocument();
    expect(screen.getByText("20 files · 2026-04-26")).toBeInTheDocument();
  });

  it("완료된 파일 수를 표시한다", () => {
    render(<MediaItem {...defaultProps} />);

    expect(screen.getByText("18 완료")).toBeInTheDocument();
  });

  it("실패한 파일이 있으면 주황색으로 표시한다", () => {
    render(<MediaItem {...defaultProps} />);

    const failedText = screen.getByText("2 실패");
    expect(failedText).toBeInTheDocument();
    expect(failedText.className).toContain("text-orange-500");
  });

  it("실패가 없으면 실패 텍스트를 표시하지 않는다", () => {
    render(<MediaItem {...defaultProps} hasFailures={false} failedFiles={0} />);

    expect(screen.queryByText(/실패/)).not.toBeInTheDocument();
  });

  it("클릭 시 onClick이 호출된다", async () => {
    const onClick = vi.fn();
    render(<MediaItem {...defaultProps} onClick={onClick} />);

    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
