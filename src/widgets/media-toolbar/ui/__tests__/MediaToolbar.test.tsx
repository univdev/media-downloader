import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediaToolbar } from "../MediaToolbar";

describe("MediaToolbar", () => {
  const defaultProps = {
    url: "",
    matchedName: null as string | null,
    tiedCandidates: [] as string[],
    isMatching: false,
    isStarting: false,
    canStart: false,
    onUrlChange: vi.fn(),
    onStartDownload: vi.fn(),
    onOpenSettings: vi.fn(),
  };

  it("selectbox는 더 이상 렌더되지 않는다", () => {
    const { container } = render(<MediaToolbar {...defaultProps} />);

    // 시퀀스 드롭다운 / select 요소가 사라졌는지 검증
    expect(container.querySelector("select")).toBeNull();
    expect(screen.queryByText("시퀀스 선택...")).not.toBeInTheDocument();
  });

  it("URL input이 props url 값을 표시한다", () => {
    render(<MediaToolbar {...defaultProps} url="https://example.com" />);

    const input = screen.getByPlaceholderText("URL을 입력하세요...");
    expect(input).toHaveValue("https://example.com");
  });

  it("URL input 변경 시 onUrlChange가 호출된다", async () => {
    const onUrlChange = vi.fn();
    render(<MediaToolbar {...defaultProps} onUrlChange={onUrlChange} />);

    const input = screen.getByPlaceholderText("URL을 입력하세요...");
    await userEvent.type(input, "h");

    expect(onUrlChange).toHaveBeenCalledWith("h");
  });

  it("matchedName이 있을 때 MatchPreview가 매칭 정보를 표시한다", () => {
    render(
      <MediaToolbar
        {...defaultProps}
        url="https://example.com/x"
        matchedName="my-seq"
      />,
    );

    expect(screen.getByText(/매칭됨/)).toBeInTheDocument();
    expect(screen.getByText("my-seq")).toBeInTheDocument();
  });

  it("tiedCandidates가 있으면 +N 배지가 표시된다", () => {
    render(
      <MediaToolbar
        {...defaultProps}
        matchedName="a"
        tiedCandidates={["b", "c"]}
      />,
    );

    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("isMatching=true면 '매칭 중...' 표시", () => {
    render(<MediaToolbar {...defaultProps} isMatching={true} />);

    expect(screen.getByText("매칭 중...")).toBeInTheDocument();
  });

  it("canStart=false면 ▶ 버튼이 비활성화된다", () => {
    render(<MediaToolbar {...defaultProps} canStart={false} />);

    const button = screen.getByRole("button", { name: "다운로드 시작" });
    expect(button).toBeDisabled();
  });

  it("canStart=true이고 isStarting=false면 ▶ 버튼이 활성화되고 클릭 시 onStartDownload 호출", async () => {
    const onStartDownload = vi.fn();
    render(
      <MediaToolbar
        {...defaultProps}
        canStart={true}
        onStartDownload={onStartDownload}
      />,
    );

    const button = screen.getByRole("button", { name: "다운로드 시작" });
    expect(button).not.toBeDisabled();
    await userEvent.click(button);
    expect(onStartDownload).toHaveBeenCalledOnce();
  });

  it("isStarting=true면 ▶ 버튼이 비활성화되고 '...' 표시", () => {
    render(
      <MediaToolbar
        {...defaultProps}
        canStart={true}
        isStarting={true}
      />,
    );

    const button = screen.getByRole("button", { name: "다운로드 시작" });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("...");
  });

  it("설정 버튼 클릭 시 onOpenSettings가 호출된다", async () => {
    const onOpenSettings = vi.fn();
    render(<MediaToolbar {...defaultProps} onOpenSettings={onOpenSettings} />);

    await userEvent.click(screen.getByRole("button", { name: "시퀀스 설정" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });
});
