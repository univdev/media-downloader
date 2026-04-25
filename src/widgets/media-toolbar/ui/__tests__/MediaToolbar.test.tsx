import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediaToolbar } from "../MediaToolbar";

describe("MediaToolbar", () => {
  const defaultProps = {
    sequences: [
      {
        name: "Test Seq",
        description: "desc",
        author: "",
        created_at: "2026-04-26",
        updated_at: "2026-04-26",
      },
    ],
    selectedName: null as string | null,
    urlPattern: "",
    isStarting: false,
    onUrlPatternChange: vi.fn(),
    onSelectSequence: vi.fn(),
    onStartDownload: vi.fn(),
    onOpenSettings: vi.fn(),
    onFetchSequences: vi.fn(),
  };

  it("시퀀스 드롭다운에 옵션이 표시된다", () => {
    render(<MediaToolbar {...defaultProps} />);

    expect(screen.getByText("시퀀스 선택...")).toBeInTheDocument();
    expect(screen.getByText("Test Seq")).toBeInTheDocument();
  });

  it("URL 패턴 입력이 표시된다", () => {
    render(<MediaToolbar {...defaultProps} urlPattern="https://example.com" />);

    const input = screen.getByPlaceholderText("URL 패턴을 입력하세요...");
    expect(input).toHaveValue("https://example.com");
  });

  it("URL 패턴이 비어있으면 다운로드 버튼이 비활성화된다", () => {
    render(<MediaToolbar {...defaultProps} />);

    const button = screen.getByRole("button", { name: "다운로드 시작" });
    expect(button).toBeDisabled();
  });

  it("URL 패턴이 있으면 다운로드 버튼이 활성화된다", () => {
    render(<MediaToolbar {...defaultProps} urlPattern="https://example.com" />);

    const button = screen.getByRole("button", { name: "다운로드 시작" });
    expect(button).not.toBeDisabled();
  });

  it("다운로드 버튼 클릭 시 onStartDownload가 호출된다", async () => {
    const onStartDownload = vi.fn();
    render(
      <MediaToolbar
        {...defaultProps}
        urlPattern="https://example.com"
        onStartDownload={onStartDownload}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "다운로드 시작" }));
    expect(onStartDownload).toHaveBeenCalledOnce();
  });

  it("설정 버튼 클릭 시 onOpenSettings가 호출된다", async () => {
    const onOpenSettings = vi.fn();
    render(<MediaToolbar {...defaultProps} onOpenSettings={onOpenSettings} />);

    await userEvent.click(screen.getByRole("button", { name: "시퀀스 설정" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("다운로드 중이면 버튼이 비활성화된다", () => {
    render(
      <MediaToolbar
        {...defaultProps}
        urlPattern="https://example.com"
        isStarting={true}
      />
    );

    const button = screen.getByRole("button", { name: "다운로드 시작" });
    expect(button).toBeDisabled();
  });
});
