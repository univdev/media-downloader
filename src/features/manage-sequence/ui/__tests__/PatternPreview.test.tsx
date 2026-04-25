import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PatternPreview } from "../PatternPreview";

describe("PatternPreview", () => {
  it("빈 패턴이면 아무것도 렌더링하지 않는다", () => {
    const { container } = render(<PatternPreview urlPattern="" />);
    expect(container.firstChild).toBeNull();
  });

  it("인덱스 패턴의 미리보기 URL을 표시한다", () => {
    render(
      <PatternPreview urlPattern="https://example.com/page/{index:start=1,to=5}" />
    );

    expect(screen.getByText("미리보기:")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/page/1")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/page/2")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/page/3")).toBeInTheDocument();
  });

  it("배열 패턴의 미리보기 URL을 표시한다", () => {
    render(
      <PatternPreview urlPattern="https://example.com/{[cats, dogs, birds]}" />
    );

    expect(screen.getByText("https://example.com/cats")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/dogs")).toBeInTheDocument();
    expect(screen.getByText("https://example.com/birds")).toBeInTheDocument();
  });

  it("리터럴 URL의 미리보기를 표시한다", () => {
    render(<PatternPreview urlPattern="https://example.com/gallery" />);

    expect(screen.getByText("https://example.com/gallery")).toBeInTheDocument();
  });
});
